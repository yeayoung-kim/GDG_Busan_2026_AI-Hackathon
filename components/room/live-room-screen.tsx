"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  JoinRoomResponse,
  ModerationState,
  RoomEventsResponse,
  RoomParticipant,
  SignalEvent,
  SignalKind,
  SpeechLogEntry,
} from "@/types/realtime";

type BootstrapState =
  | "booting"
  | "requesting-media"
  | "joining-room"
  | "ready"
  | "failed";

type RecognitionState =
  | "checking"
  | "ready"
  | "listening"
  | "blocked"
  | "unsupported";

interface LiveRoomScreenProps {
  roomId: string;
  participantName: string;
}

function createParticipantId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `participant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(dateValue: string) {
  return new Date(dateValue).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isModerationActive(moderation: ModerationState | null) {
  if (!moderation) {
    return false;
  }

  return new Date(moderation.endsAt).getTime() > Date.now();
}

function resolveRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

async function parseJson<T>(response: Response) {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || "요청 처리에 실패했습니다.");
  }

  return (await response.json()) as T;
}

export function LiveRoomScreen({
  roomId,
  participantName,
}: LiveRoomScreenProps) {
  const [participantId] = useState(() => createParticipantId());
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>("booting");
  const [recognitionState, setRecognitionState] =
    useState<RecognitionState>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [logs, setLogs] = useState<SpeechLogEntry[]>([]);
  const [moderation, setModeration] = useState<ModerationState | null>(null);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [role, setRole] = useState<"host" | "guest" | null>(null);
  const [manualTranscript, setManualTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lastTranscriptAt, setLastTranscriptAt] = useState("");
  const [callStatus, setCallStatus] = useState<"waiting" | "connecting" | "live">(
    "waiting",
  );

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastPlayedModerationRef = useRef<string | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const cursorRef = useRef(0);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteParticipantIdRef = useRef<string | null>(null);
  const offerTargetIdRef = useRef<string | null>(null);
  const makingOfferRef = useRef(false);
  const isUnmountingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const joinedRoomRef = useRef(false);

  const activeModeration = isModerationActive(moderation) ? moderation : null;
  const forcedMuted = Boolean(activeModeration);
  const effectiveMicEnabled = microphoneEnabled && !forcedMuted;

  const currentParticipant = useMemo(() => {
    return participants.find((participant) => participant.id === participantId) ?? null;
  }, [participantId, participants]);

  const remoteParticipant = useMemo(() => {
    return participants.find((participant) => participant.id !== participantId) ?? null;
  }, [participantId, participants]);
  const displayCallStatus = remoteParticipant ? callStatus : "waiting";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    remoteParticipantIdRef.current = remoteParticipant?.id ?? null;
  }, [remoteParticipant]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!participantName.trim()) {
      return;
    }

    let disposed = false;

    async function bootstrap() {
      try {
        setBootstrapState("requesting-media");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        ensurePeerConnection();
        setBootstrapState("joining-room");

        const response = await fetch(`/api/rooms/${roomId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participantId,
            participantName,
          }),
        });

        const payload = await parseJson<JoinRoomResponse>(response);

        if (disposed) {
          return;
        }

        cursorRef.current = payload.cursor;
        setParticipants(payload.room.participants);
        setLogs(payload.room.logs);
        setModeration(payload.room.moderation);
        setRole(payload.role);
        setMicrophoneEnabled(payload.self.microphoneEnabled);
        setCameraEnabled(payload.self.cameraEnabled);
        joinedRoomRef.current = true;
        setBootstrapState("ready");

        const RecognitionConstructor = resolveRecognitionConstructor();
        setRecognitionState(RecognitionConstructor ? "ready" : "unsupported");
        startPolling();
      } catch (error) {
        setBootstrapState("failed");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "회의방 초기화 중 오류가 발생했습니다.",
        );
      }
    }

    void bootstrap();

    return () => {
      disposed = true;
    };
  }, [participantId, participantName, roomId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = effectiveMicEnabled;
    });
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled;
    });
  }, [cameraEnabled, effectiveMicEnabled]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = forcedMuted;
    }
  }, [forcedMuted]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!activeModeration) {
      return;
    }

    const remainingTime = new Date(activeModeration.endsAt).getTime() - Date.now();

    if (remainingTime <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setModeration((current) => {
        if (!current || current.id !== activeModeration.id) {
          return current;
        }

        return null;
      });
    }, remainingTime + 60);

    return () => window.clearTimeout(timer);
  }, [activeModeration]);

  useEffect(() => {
    if (!activeModeration) {
      return;
    }

    if (lastPlayedModerationRef.current === activeModeration.id) {
      return;
    }

    lastPlayedModerationRef.current = activeModeration.id;
    window.speechSynthesis?.cancel();

    if (activeModeration.audioBase64 && activeModeration.audioMimeType) {
      const audio = new Audio(
        `data:${activeModeration.audioMimeType};base64,${activeModeration.audioBase64}`,
      );
      audioRef.current = audio;
      void audio.play().catch(() => {
        playBrowserTts(activeModeration.replacementText);
      });
      return;
    }

    playBrowserTts(activeModeration.replacementText);
  }, [activeModeration]);

  useEffect(() => {
    if (
      bootstrapState !== "ready" ||
      recognitionState === "unsupported" ||
      recognitionState === "blocked"
    ) {
      stopRecognition();
      return;
    }

    if (!monitoringEnabled || !microphoneEnabled || forcedMuted) {
      stopRecognition();
      return;
    }

    startRecognition();

    return () => {
      stopRecognition();
    };
  }, [
    bootstrapState,
    forcedMuted,
    microphoneEnabled,
    monitoringEnabled,
    recognitionState,
  ]);

  useEffect(() => {
    if (bootstrapState !== "ready") {
      return;
    }

    void syncDeviceState();
  }, [bootstrapState, cameraEnabled, microphoneEnabled]);

  useEffect(() => {
    if (bootstrapState !== "ready") {
      return;
    }

    if (!remoteParticipant) {
      resetPeerConnection(false);
      return;
    }

    if (role === "host") {
      void initiateOffer();
    }
  }, [bootstrapState, remoteParticipant, role]);

  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      stopPolling();
      stopRecognition();
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      resetPeerConnection(false);

      if (joinedRoomRef.current) {
        void fetch(`/api/rooms/${roomId}/leave`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participantId,
          }),
          keepalive: true,
        });
      }
    };
  }, [participantId, roomId]);

  function playBrowserTts(text: string) {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 1.02;
    utterance.pitch = 0.92;

    const voices = window.speechSynthesis
      .getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith("ko"));

    if (voices.length > 0) {
      utterance.voice = voices[0];
    }

    window.speechSynthesis.speak(utterance);
  }

  function ensurePeerConnection() {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const connection = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    localStreamRef.current?.getTracks().forEach((track) => {
      connection.addTrack(track, localStreamRef.current as MediaStream);
    });

    connection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remoteStream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });
    };

    connection.onicecandidate = (event) => {
      const targetParticipantId = remoteParticipantIdRef.current;

      if (!event.candidate || !targetParticipantId) {
        return;
      }

      void sendSignal("candidate", event.candidate.toJSON(), targetParticipantId);
    };

    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;

      if (state === "connected") {
        setCallStatus("live");
        return;
      }

      if (state === "connecting") {
        setCallStatus("connecting");
        return;
      }

      if (state === "disconnected" || state === "failed" || state === "closed") {
        setCallStatus(remoteParticipantIdRef.current ? "connecting" : "waiting");
      }
    };

    peerConnectionRef.current = connection;
    return connection;
  }

  function resetPeerConnection(shouldRecreate: boolean) {
    pendingCandidatesRef.current = [];
    offerTargetIdRef.current = null;
    makingOfferRef.current = false;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (shouldRecreate && localStreamRef.current) {
      ensurePeerConnection();
    }
  }

  async function initiateOffer() {
    const targetParticipantId = remoteParticipantIdRef.current;
    const connection = ensurePeerConnection();

    if (!targetParticipantId || makingOfferRef.current) {
      return;
    }

    if (offerTargetIdRef.current === targetParticipantId && connection.localDescription) {
      return;
    }

    if (connection.signalingState !== "stable") {
      return;
    }

    makingOfferRef.current = true;
    setCallStatus("connecting");

    try {
      const offer = await connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await connection.setLocalDescription(offer);
      await sendSignal("offer", offer, targetParticipantId);
      offerTargetIdRef.current = targetParticipantId;
    } finally {
      makingOfferRef.current = false;
    }
  }

  async function flushPendingCandidates() {
    const connection = peerConnectionRef.current;

    if (!connection || !connection.remoteDescription) {
      return;
    }

    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift();

      if (!candidate) {
        break;
      }

      await connection.addIceCandidate(candidate);
    }
  }

  async function handleSignals(events: SignalEvent[]) {
    for (const event of events) {
      const connection = ensurePeerConnection();

      if (event.kind === "offer") {
        await connection.setRemoteDescription(
          new RTCSessionDescription(event.payload as RTCSessionDescriptionInit),
        );
        await flushPendingCandidates();

        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        await sendSignal("answer", answer, event.fromParticipantId);
        setCallStatus("connecting");
        continue;
      }

      if (event.kind === "answer") {
        await connection.setRemoteDescription(
          new RTCSessionDescription(event.payload as RTCSessionDescriptionInit),
        );
        await flushPendingCandidates();
        continue;
      }

      const candidate = event.payload as RTCIceCandidateInit;

      if (!connection.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        continue;
      }

      await connection.addIceCandidate(candidate);
    }
  }

  async function sendSignal(
    kind: SignalKind,
    signal: RTCSessionDescriptionInit | RTCIceCandidateInit,
    targetParticipantId: string,
  ) {
    await fetch(`/api/rooms/${roomId}/signal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participantId,
        targetParticipantId,
        kind,
        signal,
      }),
    });
  }

  async function pollOnce() {
    const response = await fetch(
      `/api/rooms/${roomId}/events?participantId=${participantId}&cursor=${cursorRef.current}`,
      {
        cache: "no-store",
      },
    );

    const payload = await parseJson<RoomEventsResponse>(response);

    cursorRef.current = payload.cursor;
    setParticipants(payload.room.participants);
    setLogs(payload.room.logs);
    setModeration(payload.room.moderation);

    if (payload.events.length > 0) {
      await handleSignals(payload.events);
    }
  }

  function startPolling() {
    stopPolling();

    const loop = async () => {
      if (isUnmountingRef.current) {
        return;
      }

      try {
        await pollOnce();
      } catch (error) {
        if (!isUnmountingRef.current) {
          setErrorMessage(
            error instanceof Error ? error.message : "방 상태 동기화에 실패했습니다.",
          );
        }
      } finally {
        if (!isUnmountingRef.current) {
          pollingTimerRef.current = window.setTimeout(loop, 900);
        }
      }
    };

    pollingTimerRef.current = window.setTimeout(loop, 900);
  }

  function stopPolling() {
    if (pollingTimerRef.current) {
      window.clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }

  async function syncDeviceState() {
    try {
      await fetch(`/api/rooms/${roomId}/device`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId,
          microphoneEnabled,
          cameraEnabled,
        }),
      });
    } catch {
      return;
    }
  }

  function stopRecognition() {
    const activeRecognition = recognitionRef.current;

    if (!activeRecognition) {
      return;
    }

    activeRecognition.onend = null;
    activeRecognition.onerror = null;
    activeRecognition.onresult = null;
    activeRecognition.onstart = null;
    activeRecognition.stop();
    recognitionRef.current = null;

    setRecognitionState((current) => (current === "blocked" ? "blocked" : "ready"));
  }

  function startRecognition() {
    if (recognitionRef.current || recognitionState === "unsupported") {
      return;
    }

    const RecognitionConstructor = resolveRecognitionConstructor();

    if (!RecognitionConstructor) {
      setRecognitionState("unsupported");
      return;
    }

    const recognition = new RecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = "ko-KR";

    recognition.onstart = () => {
      setRecognitionState("listening");
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setRecognitionState("blocked");
        return;
      }

      setRecognitionState("ready");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else {
          interim = transcript;
        }
      }

      setInterimTranscript(interim);

      if (finalTranscript) {
        setInterimTranscript("");
        setLastTranscriptAt(new Date().toISOString());
        void submitTranscript(finalTranscript);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;

      if (
        monitoringEnabled &&
        microphoneEnabled &&
        !forcedMuted &&
        !isUnmountingRef.current
      ) {
        window.setTimeout(() => {
          startRecognition();
        }, 260);
        return;
      }

      setRecognitionState((current) => (current === "blocked" ? "blocked" : "ready"));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  async function submitTranscript(transcript: string) {
    const normalizedTranscript = transcript.trim();

    if (!normalizedTranscript || forcedMuted) {
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId,
          speakerName: participantName,
          transcript: normalizedTranscript,
        }),
      });

      const payload = await parseJson<{
        cursor: number;
        room: RoomEventsResponse["room"];
      }>(response);

      cursorRef.current = payload.cursor;
      setParticipants(payload.room.participants);
      setLogs(payload.room.logs);
      setModeration(payload.room.moderation);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "발화 분석 처리에 실패했습니다.",
      );
    }
  }

  async function handleManualTranscriptSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!manualTranscript.trim()) {
      return;
    }

    await submitTranscript(manualTranscript);
    setManualTranscript("");
    setLastTranscriptAt(new Date().toISOString());
  }

  if (!participantName.trim()) {
    return (
      <main className="align-shell min-h-screen px-4 py-4 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1100px] items-center justify-center rounded-[40px] border border-white/8 bg-black p-6">
          <div className="surface-card max-w-xl p-8 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
              Invalid Access
            </p>
            <h1 className="editorial-title mt-4 text-4xl text-white">
              참가자 이름이 빠져 있습니다.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#b9b9b2]">
              첫 화면으로 돌아가 이름과 방 코드를 다시 입력해주세요.
            </p>
            <Link
              href="/"
              className="capsule-button capsule-button-primary mt-8 text-sm font-semibold"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="align-shell motion-safe min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1550px] flex-col rounded-[40px] border border-white/8 bg-black px-5 py-5 sm:px-8 sm:py-8">
        <header className="neon-line flex flex-col gap-6 border-b border-white/8 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <span className="align-badge">Room {roomId}</span>
            <div>
              <h1 className="editorial-title text-4xl text-white sm:text-5xl lg:text-6xl">
                회의 톤이 무너지면
                <br />
                Align.ai가 바로 개입합니다
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#afafa8] sm:text-base">
                현재 방에 접속한 두 명의 음성을 기준으로 WebRTC 연결과 판교어
                모더레이션이 동시에 돌아갑니다. 상대와 연결되면 바로 대화를
                시작하면 됩니다.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="data-card min-w-[140px] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                Call
              </p>
              <p className="mt-3 text-xl font-semibold text-white">
                {displayCallStatus === "live"
                  ? "Connected"
                  : displayCallStatus === "connecting"
                    ? "Handshaking"
                    : "Waiting"}
              </p>
            </div>
            <div className="data-card min-w-[140px] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                STT
              </p>
              <p className="mt-3 text-xl font-semibold text-white">
                {recognitionState === "listening"
                  ? "Active"
                  : recognitionState === "unsupported"
                    ? "Fallback"
                    : recognitionState === "blocked"
                      ? "Denied"
                      : "Ready"}
              </p>
            </div>
            <div className="data-card min-w-[140px] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                Role
              </p>
              <p className="mt-3 text-xl font-semibold uppercase text-white">
                {role ?? "Booting"}
              </p>
            </div>
          </div>
        </header>

        {forcedMuted && activeModeration ? (
          <section className="slide-up surface-card signal-pulse mt-6 border-[#c5ff00]/30 bg-[#0a0a07] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-4xl">
                <p className="text-xs uppercase tracking-[0.22em] text-[#c5ff00]">
                  Moderation Active
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {activeModeration.warning}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#bdbdb7]">
                  {activeModeration.sourceParticipantName}님의 발화{" "}
                  <span className="text-white">
                    “{activeModeration.originalText}”
                  </span>
                  가 차단되었습니다. 시스템이 교정 문장을 TTS로 재생하는 동안
                  참가자 전체가 잠시 음소거됩니다.
                </p>
              </div>
              <div className="max-w-lg rounded-[24px] border border-[#c5ff00]/20 bg-[#080808] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                  Replacement
                </p>
                <p className="mt-3 text-sm leading-7 text-white">
                  {activeModeration.replacementText}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid flex-1 gap-6 py-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="surface-card p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                    Participants
                  </p>
                  <h2 className="editorial-title mt-3 text-3xl text-white">
                    1:1 비디오 스테이지
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMicrophoneEnabled((current) => !current)}
                    className={`capsule-button text-sm ${
                      microphoneEnabled
                        ? "capsule-button-primary"
                        : "capsule-button-secondary"
                    }`}
                  >
                    Mic {microphoneEnabled ? "On" : "Off"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraEnabled((current) => !current)}
                    className={`capsule-button text-sm ${
                      cameraEnabled
                        ? "capsule-button-primary"
                        : "capsule-button-secondary"
                    }`}
                  >
                    Cam {cameraEnabled ? "On" : "Off"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonitoringEnabled((current) => !current)}
                    className={`capsule-button text-sm ${
                      monitoringEnabled
                        ? "capsule-button-primary"
                        : "capsule-button-secondary"
                    }`}
                  >
                    STT {monitoringEnabled ? "On" : "Off"}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <article className="video-panel">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cameraEnabled ? "" : "opacity-10"}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black via-black/40 to-transparent px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {currentParticipant?.name ?? participantName} (나)
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8b8b84]">
                        {microphoneEnabled ? "Mic live" : "Mic off"} /{" "}
                        {cameraEnabled ? "Cam live" : "Cam off"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-[#c5ff00]">
                      <span className="status-dot" />
                      Local
                    </div>
                  </div>
                  {!cameraEnabled ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm uppercase tracking-[0.22em] text-[#7f7f79]">
                      Camera disabled
                    </div>
                  ) : null}
                </article>

                <article className="video-panel">
                  {remoteParticipant ? (
                    <>
                      <video ref={remoteVideoRef} autoPlay playsInline />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black via-black/40 to-transparent px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {remoteParticipant.name}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8b8b84]">
                            {displayCallStatus === "live" ? "Call live" : "Awaiting media"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-[#c5ff00]">
                          <span className="status-dot" />
                          Remote
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="video-panel-empty px-8">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#7d7d77]">
                          Waiting
                        </p>
                        <p className="mt-3 text-lg font-semibold text-white">
                          같은 방 코드로 다른 참가자가 들어오면
                          <br />
                          자동으로 연결을 시작합니다.
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="surface-card p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                  Live Transcript
                </p>
                <div className="mt-5 space-y-4">
                  <div className="hairline-frame min-h-[160px] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                      Interim
                    </p>
                    <p className="mt-4 text-base leading-8 text-white">
                      {interimTranscript || "실시간 듣기 중인 문장이 여기에 표시됩니다."}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="data-card p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                        Last Capture
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {lastTranscriptAt ? formatTime(lastTranscriptAt) : "Waiting"}
                      </p>
                    </div>
                    <div className="data-card p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                        Participants
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {participants.length} / 2
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="surface-card p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                      Manual Fallback
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                      브라우저 STT가 불안정하면 여기서 직접 발화를 넣어도 됩니다.
                    </h2>
                  </div>
                  <p className="max-w-xs text-xs leading-6 text-[#7d7d77]">
                    Chrome 권한 이슈나 소음 환경에서는 이 입력창으로 데모를
                    계속 진행할 수 있습니다.
                  </p>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleManualTranscriptSubmit}>
                  <textarea
                    value={manualTranscript}
                    onChange={(event) => setManualTranscript(event.target.value)}
                    rows={5}
                    placeholder="예: 오늘 아젠다 기준으로 오너십 얼라인 먼저 하고 액션 아이템까지 정리하겠습니다."
                    className="w-full rounded-[24px] border border-white/8 bg-[#080808] px-5 py-4 text-base leading-8 text-white outline-none focus:border-[#c5ff00]/35"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm leading-7 text-[#8d8d86]">
                      기준 미달 문장을 넣으면 즉시 방 전체에 제재가 발동합니다.
                    </p>
                    <button
                      type="submit"
                      disabled={!manualTranscript.trim() || forcedMuted}
                      className="capsule-button capsule-button-primary text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      발화 송신
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="surface-card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                    Ops Console
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">
                    모더레이션 관제
                  </h2>
                </div>
                <div className="scan-ring flex h-14 w-14 items-center justify-center rounded-full border border-[#c5ff00]/30 text-[0.65rem] uppercase tracking-[0.18em] text-[#c5ff00]">
                  Guard
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="data-card p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                    Boot
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {bootstrapState === "requesting-media"
                      ? "Media"
                      : bootstrapState === "joining-room"
                        ? "Join"
                        : bootstrapState === "ready"
                          ? "Ready"
                          : bootstrapState === "failed"
                            ? "Error"
                            : "Boot"}
                  </p>
                </div>
                <div className="data-card min-w-[140px] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                    Voice Route
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {activeModeration?.voiceSource === "gcp"
                      ? "GCP TTS"
                      : "Browser"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="hairline-frame p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                    STT Status
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white">
                    {recognitionState === "listening" &&
                      "로컬 마이크 발화를 실시간으로 수집 중입니다."}
                    {recognitionState === "ready" &&
                      "브라우저 STT가 준비되어 있습니다. 말을 시작하면 자동 감지합니다."}
                    {recognitionState === "unsupported" &&
                      "이 브라우저는 STT를 지원하지 않습니다. 수동 입력 콘솔을 사용하세요."}
                    {recognitionState === "blocked" &&
                      "브라우저가 마이크 기반 STT 권한을 거부했습니다. 권한을 허용하거나 수동 입력으로 전환하세요."}
                  </p>
                </div>
                <div className="hairline-frame p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                    Warning Rule
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white">
                    판교어 키워드가 부족하거나 “몰라요”, “못 해요”, “그냥” 같은
                    표현이 감지되면 차단 후 교정 음성이 송출됩니다.
                  </p>
                </div>
              </div>

              {errorMessage ? (
                <div className="mt-5 rounded-[22px] border border-white/10 bg-white/3 px-4 py-4 text-sm leading-7 text-[#ddddda]">
                  {errorMessage}
                </div>
              ) : null}
            </div>

            <div className="surface-card p-5 sm:p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                    Meeting Log
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">
                    발화 기록
                  </h2>
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                  newest first
                </p>
              </div>

              <div className="scrollbar-thin mt-6 max-h-[720px] space-y-3 overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <div className="hairline-frame p-5 text-sm leading-7 text-[#989892]">
                    아직 기록이 없습니다. STT를 켜고 말하거나 수동 입력으로 첫
                    발화를 보내보세요.
                  </div>
                ) : (
                  logs.map((entry) => (
                    <article
                      key={entry.id}
                      className={`raise-in rounded-[24px] border p-5 ${
                        entry.status === "blocked"
                          ? "border-[#c5ff00]/28 bg-[#090a04]"
                          : "border-white/8 bg-white/3"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {entry.speakerName}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                            {formatTime(entry.createdAt)} / Score {entry.pangyoScore}
                          </p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-[#c5ff00]">
                          {entry.status === "blocked" ? "Intervened" : "Passed"}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div className="hairline-frame bg-black/25 p-4">
                          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#7d7d77]">
                            Original
                          </p>
                          <p className="mt-2 text-sm leading-7 text-white">
                            {entry.originalText}
                          </p>
                        </div>
                        <div className="hairline-frame bg-black/35 p-4">
                          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#7d7d77]">
                            Delivered
                          </p>
                          <p className="mt-2 text-sm leading-7 text-white">
                            {entry.deliveredText}
                          </p>
                        </div>
                        <p className="text-sm leading-7 text-[#8b8b85]">
                          {entry.reason}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
