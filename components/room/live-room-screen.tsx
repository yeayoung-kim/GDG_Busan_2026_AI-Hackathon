"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  type RefObject,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRightIcon,
  CameraIcon,
  CameraOffIcon,
  ChartIcon,
  CheckCircleIcon,
  ExitDoorIcon,
  HelpCircleIcon,
  HistoryIcon,
  MicIcon,
  MicOffIcon,
  RecordDotIcon,
  SegmentIcon,
  SettingsIcon,
  SparkIcon,
} from "@/components/shared/align-icons";
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

type PanelView = "logs" | "metrics";

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

function formatRoomLabel(roomId: string) {
  const compact = roomId.replace(/[^a-z0-9]/gi, "").toUpperCase();

  if (compact.length >= 6) {
    return `${compact.slice(0, 3)}-${compact.slice(3, 6)}`;
  }

  return roomId.toUpperCase();
}

function formatMonitorParticipantName(name: string) {
  const normalized = name.trim().toUpperCase();

  if (normalized.startsWith("USER_")) {
    return normalized.replace(/^USER_/, "대상자_");
  }

  if (normalized === "REMOTE_PGY") {
    return "원격_참가자";
  }

  return normalized;
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

function getCallStatusLabel(status: "waiting" | "connecting" | "live") {
  if (status === "live") {
    return "LIVE_SYNC";
  }

  if (status === "connecting") {
    return "HANDSHAKING";
  }

  return "WAITING";
}

function getRecognitionLabel(state: RecognitionState) {
  if (state === "listening") {
    return "라이브 감시 중";
  }

  if (state === "unsupported") {
    return "수동 입력 중";
  }

  if (state === "blocked") {
    return "접근 차단";
  }

  if (state === "ready") {
    return "대기 중";
  }

  return "감시 준비 중";
}

function getBootstrapLabel(state: BootstrapState) {
  if (state === "requesting-media") {
    return "MEDIA";
  }

  if (state === "joining-room") {
    return "JOIN";
  }

  if (state === "ready") {
    return "READY";
  }

  if (state === "failed") {
    return "ERROR";
  }

  return "BOOT";
}

function getEntryLabel(entry: SpeechLogEntry) {
  if (entry.status === "blocked") {
    return "VIBE MISMATCH";
  }

  if (entry.pangyoScore >= 60) {
    return "PANGYO-STYLE MATCH";
  }

  return "STANDARD SYNTAX";
}

function getEntryTone(entry: SpeechLogEntry) {
  if (entry.status === "blocked") {
    return {
      accent: "border-[#ffb9c1]/70",
      name: "text-[#ffb9c1]",
      text: "text-white",
      label: "text-[#ffb9c1]",
      icon: "text-[#ffb9c1]",
    };
  }

  if (entry.pangyoScore >= 60) {
    return {
      accent: "border-[var(--align-accent)]",
      name: "text-[var(--align-accent)]",
      text: "text-white",
      label: "text-[var(--align-accent)]",
      icon: "text-[var(--align-accent)]",
    };
  }

  return {
    accent: "border-transparent",
    name: "text-[#9d9d9d]",
    text: "text-[#c5c5c5]",
    label: "text-[#6f6f6f]",
    icon: "text-[#6f6f6f]",
  };
}

interface TopIconButtonProps {
  label: string;
  children: ReactNode;
}

function TopIconButton({ label, children }: TopIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center text-white transition-colors duration-150 hover:text-[var(--align-accent)]"
    >
      {children}
    </button>
  );
}

interface VideoTileProps {
  videoRef?: RefObject<HTMLVideoElement | null>;
  showVideo: boolean;
  muted?: boolean;
  grayscale?: boolean;
  title: string;
  badge: string;
  badgeActive: boolean;
  centerContent?: ReactNode;
  footerStatus: string;
  footerTone?: "accent" | "muted";
  showSignalBars?: boolean;
}

function VideoTile({
  videoRef,
  showVideo,
  muted,
  grayscale,
  title,
  badge,
  badgeActive,
  centerContent,
  footerStatus,
  footerTone = "muted",
  showSignalBars = false,
}: VideoTileProps) {
  return (
    <article className="relative min-h-[440px] overflow-hidden border border-white/10 bg-[#0b0b0b] sm:min-h-[560px]">
      {videoRef ? (
        <video
          ref={videoRef}
          autoPlay
          muted={muted}
          playsInline
          className={`absolute inset-0 h-full w-full object-cover ${
            showVideo ? "opacity-100" : "opacity-0"
          } ${grayscale ? "grayscale" : ""}`}
        />
      ) : null}

      {!showVideo ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#111111] p-8 text-center">
          {centerContent}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

      <div className="absolute bottom-5 left-5 flex items-center gap-4">
        <div className="flex items-center gap-2 border border-white/18 bg-black/75 px-4 py-2">
          <div
            className={`h-2 w-2 ${
              badgeActive ? "bg-[var(--align-accent)]" : "bg-[#535353]"
            }`}
          />
          <span className="font-mono text-[0.72rem] uppercase tracking-[0.26em] text-white/92">
            {badge}
          </span>
        </div>
      </div>

      {showSignalBars ? (
        <div className="absolute bottom-5 right-5 text-[var(--align-accent)]">
          <div className="signal-bars">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-5 top-5">
        <p
          className={`font-mono text-[0.7rem] uppercase tracking-[0.22em] ${
            footerTone === "accent" ? "text-[var(--align-accent)]" : "text-[#8a8a8a]"
          }`}
        >
          {title}
        </p>
        <p className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.26em] text-white/60">
          {footerStatus}
        </p>
      </div>
    </article>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <article className="border border-white/10 bg-[#111111] p-4">
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-[#7a7a7a]">
        {label}
      </p>
      <p className="mt-4 text-[1.15rem] font-semibold uppercase tracking-[0.06em] text-white">
        {value}
      </p>
    </article>
  );
}

interface BottomControlButtonProps {
  label: string;
  active: boolean;
  tone?: "default" | "danger";
  onClick: () => void;
  children: ReactNode;
}

function BottomControlButton({
  label,
  active,
  tone = "default",
  onClick,
  children,
}: BottomControlButtonProps) {
  const activeClasses =
    tone === "danger"
      ? "border-t-[#ff5959] text-[#ff6f6f]"
      : "border-t-[var(--align-accent)] bg-[#161616] text-[var(--align-accent)]";

  const idleClasses =
    tone === "danger"
      ? "border-t-transparent text-[#ff6f6f]/80 hover:text-[#ff6f6f]"
      : "border-t-transparent text-white hover:bg-[#111111] hover:text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full min-w-[74px] flex-col items-center justify-center border-t-2 px-3 pt-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] transition-colors duration-150 sm:min-w-[92px] ${
        active ? activeClasses : idleClasses
      }`}
    >
      <span className="mb-2 flex h-6 items-center justify-center">{children}</span>
      <span>{label}</span>
    </button>
  );
}

interface AlertOverlayProps {
  moderation: ModerationState;
}

function AlertOverlay({ moderation }: AlertOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/86 px-6 py-24 backdrop-blur-[3px]">
      <div className="relative w-full max-w-[1000px] border border-white/85 bg-[#171717] px-7 py-8 sm:px-12 sm:py-12">
        <div className="absolute inset-x-0 top-0 h-1 bg-[var(--align-error-strong)]" />

        <div className="inline-flex items-center gap-3 border border-[var(--align-error-strong)] px-4 py-3 text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-[var(--align-error-strong)]">
          <MicOffIcon className="h-4 w-4" />
          <span>강제 마이크 차단 중</span>
        </div>

        <h2 className="mt-8 text-[clamp(3rem,6vw,5.75rem)] font-black uppercase leading-[0.94] tracking-[-0.06em] text-white">
          조직 싱크 치명적 오류
        </h2>

        <div className="mt-10 border-l border-white/12 pl-5 sm:pl-10">
          <div className="pb-8">
            <p className="flex items-center gap-2 font-mono text-[0.82rem] font-semibold uppercase tracking-[0.24em] text-[#c2c7aa]">
              <HistoryIcon className="h-4 w-4" />
              <span>비-판교어 발화 원문</span>
            </p>
            <p className="mt-5 text-[1.3rem] italic tracking-[-0.02em] text-[#bfc2af] sm:text-[1.65rem]">
              “{moderation.originalText}”
            </p>
          </div>

          <div className="relative border-t border-white/10 pt-8">
            <div className="absolute left-[-21px] top-8 bottom-0 w-[3px] bg-[var(--align-accent)] sm:left-[-41px]" />
            <p className="flex items-center gap-2 font-mono text-[0.82rem] font-semibold uppercase tracking-[0.24em] text-[var(--align-accent)]">
              <SparkIcon className="h-4 w-4" />
              <span>판교핏(Fit) 얼라인 완료</span>
            </p>
            <p className="mt-5 max-w-4xl text-[1.65rem] font-semibold leading-[1.45] tracking-[-0.04em] text-[var(--align-accent)] sm:text-[2.2rem]">
              “{moderation.replacementText}”
            </p>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-4 border-t border-white/10 pt-6">
          <div className="signal-bars text-[var(--align-accent)]">
            <span />
            <span />
            <span />
            <span />
          </div>
          <p className="text-[0.9rem] tracking-[0.08em] text-white/88 sm:tracking-[0.12em]">
            상대방에게 최적화된 아젠다 대독 중...
          </p>
        </div>
      </div>
    </div>
  );
}

export function LiveRoomScreen({
  roomId,
  participantName,
}: LiveRoomScreenProps) {
  const router = useRouter();
  const [participantId] = useState(() => createParticipantId());
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>("booting");
  const [recognitionState, setRecognitionState] =
    useState<RecognitionState>("checking");
  const [panelView, setPanelView] = useState<PanelView>("logs");
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
  const deferredInterimTranscript = useDeferredValue(interimTranscript);
  const showManualFallback =
    recognitionState === "unsupported" || recognitionState === "blocked";

  const currentParticipant = useMemo(() => {
    return participants.find((participant) => participant.id === participantId) ?? null;
  }, [participantId, participants]);

  const remoteParticipant = useMemo(() => {
    return participants.find((participant) => participant.id !== participantId) ?? null;
  }, [participantId, participants]);

  const displayCallStatus = remoteParticipant ? callStatus : "waiting";
  const roomLabel = formatRoomLabel(roomId);
  const resolvedParticipantName = participantName.trim();

  useEffect(() => {
    if (resolvedParticipantName) {
      window.localStorage.setItem("align-display-name", resolvedParticipantName);
    }
  }, [resolvedParticipantName]);

  useEffect(() => {
    remoteParticipantIdRef.current = remoteParticipant?.id ?? null;
  }, [remoteParticipant]);

  // The room bootstrap sequence intentionally runs once per participant/session.
  useEffect(() => {
    if (!resolvedParticipantName.trim()) {
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
            participantName: resolvedParticipantName,
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
  }, [participantId, resolvedParticipantName, roomId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = forcedMuted;
    }
  }, [forcedMuted]);

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

  // Recognition start/stop is coordinated by the surrounding room state machine.
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
  }, [bootstrapState, forcedMuted, microphoneEnabled, monitoringEnabled, recognitionState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Device sync is fire-and-forget and should not retrigger from recreated helpers.
  useEffect(() => {
    if (bootstrapState !== "ready") {
      return;
    }

    void syncDeviceState();
  }, [bootstrapState, cameraEnabled, microphoneEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Offer negotiation reacts to role/participant changes, not helper identity changes.
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
  }, [bootstrapState, remoteParticipant, role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup should use the current refs when the room unmounts.
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
  }, [participantId, roomId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          speakerName: resolvedParticipantName,
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

  async function handleManualTranscriptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!manualTranscript.trim()) {
      return;
    }

    await submitTranscript(manualTranscript);
    setManualTranscript("");
    setLastTranscriptAt(new Date().toISOString());
  }

  const localPanelName = formatMonitorParticipantName(
    currentParticipant?.name ?? resolvedParticipantName,
  );
  const remotePanelName = formatMonitorParticipantName(
    remoteParticipant?.name ?? "REMOTE_PGY",
  );
  const liveListeningCopy = deferredInterimTranscript
    ? deferredInterimTranscript
    : recognitionState === "listening"
      ? "비즈니스 임팩트를 측정할 다음 발화를 기다리는 중..."
      : "다음 문장이 들어오면 톤 앤 매너 기준으로 즉시 분석합니다.";

  if (!resolvedParticipantName.trim()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="border border-white/12 bg-[#101010] px-8 py-8 text-center">
          <p className="font-mono text-[0.8rem] uppercase tracking-[0.24em] text-[#7a7a7a]">
            INITIALIZING SESSION
          </p>
          <p className="mt-4 text-lg tracking-[-0.03em] text-white">
            participant identity is syncing...
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-black text-white">
        <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-black px-4 sm:px-8 xl:px-12">
          <Link
            href="/"
            className="text-[1.8rem] font-black uppercase tracking-[0.12em] text-[var(--align-accent)] sm:text-[2rem]"
          >
            ALIGN.AI
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            <span className="font-mono text-[0.72rem] uppercase tracking-[0.26em] text-white/92 sm:text-[0.82rem]">
              ROOM: {roomLabel}
            </span>
            <div className="flex items-center gap-1 sm:gap-2">
              <TopIconButton label="Settings">
                <SettingsIcon className="h-4 w-4" />
              </TopIconButton>
              <TopIconButton label="Help">
                <HelpCircleIcon className="h-4 w-4" />
              </TopIconButton>
            </div>
          </div>
        </header>

        <div className="pb-24 pt-16 xl:pr-[360px]">
          <section className="border-b border-white/10 xl:border-b-0">
            <div className="grid gap-6 px-4 py-6 sm:px-8 xl:h-[calc(100vh-9rem)] xl:grid-cols-2 xl:px-12 xl:py-10">
              <VideoTile
                videoRef={localVideoRef}
                showVideo={cameraEnabled}
                muted
                title={`${localPanelName} (LOCAL)`}
                badge={`${localPanelName} (LOCAL)`}
                badgeActive
                footerStatus={effectiveMicEnabled ? "VOICE CHANNEL OPEN" : "MIC MUTED"}
                footerTone={effectiveMicEnabled ? "accent" : "muted"}
                centerContent={
                  <div>
                    <CameraOffIcon className="mx-auto h-14 w-14 text-[#525252]" />
                    <p className="mt-5 font-mono text-[0.85rem] uppercase tracking-[0.22em] text-[#727272]">
                      CAMERA INACTIVE
                    </p>
                  </div>
                }
              />

              <VideoTile
                videoRef={remoteVideoRef}
                showVideo={Boolean(remoteParticipant) && displayCallStatus === "live"}
                grayscale
                title={remotePanelName}
                badge={remotePanelName}
                badgeActive={displayCallStatus === "live"}
                footerStatus={
                  displayCallStatus === "live"
                    ? "REMOTE CHANNEL SYNCED"
                    : "원격 참가자 대기 중"
                }
                showSignalBars={displayCallStatus === "live"}
                centerContent={
                  <div>
                    <p className="font-mono text-[0.82rem] uppercase tracking-[0.26em] text-[#7b7b7b]">
                      {displayCallStatus === "connecting"
                        ? "HANDSHAKING REMOTE FEED"
                        : "WAITING FOR REMOTE_PGY"}
                    </p>
                  </div>
                }
              />
            </div>
          </section>

          <aside className="border-t border-white/10 bg-[#1a1a1a] xl:fixed xl:right-0 xl:top-16 xl:bottom-20 xl:w-[360px] xl:border-l xl:border-t-0">
            <div className="flex h-full flex-col">
              <div className="border-b border-white/10 px-6 py-8">
                <h2 className="font-mono text-[0.9rem] font-semibold uppercase tracking-[0.24em] text-[var(--align-accent)]">
                  톤 앤 매너 감시기
                </h2>
                <div className="mt-5 flex items-center gap-3">
                  <div className="status-square h-3 w-3 bg-[var(--align-accent)]" />
                  <span className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-white/92">
                    {forcedMuted ? "강제 정렬 진행 중" : "라이브 감시 중"}
                  </span>
                </div>
              </div>

              <div className="border-b border-white/10 py-5">
                <button
                  type="button"
                  onClick={() => setPanelView("logs")}
                  className={`flex w-full items-center gap-3 border-l-2 py-2 pl-4 text-left font-mono text-[0.8rem] uppercase tracking-[0.2em] transition-colors ${
                    panelView === "logs"
                      ? "border-[var(--align-accent)] text-[var(--align-accent)]"
                      : "border-transparent text-[#707070] hover:text-white"
                  }`}
                >
                  <SegmentIcon className="h-4 w-4" />
                  <span>적발 내역</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPanelView("metrics")}
                  className={`mt-2 flex w-full items-center gap-3 border-l-2 py-2 pl-4 text-left font-mono text-[0.8rem] uppercase tracking-[0.2em] transition-colors ${
                    panelView === "metrics"
                      ? "border-[var(--align-accent)] text-[var(--align-accent)]"
                      : "border-transparent text-[#707070] hover:text-white"
                  }`}
                >
                  <ChartIcon className="h-4 w-4" />
                  <span>실시간 VIBE 스코어</span>
                </button>
              </div>

              <div className="room-scroll flex-1 overflow-y-auto">
                {panelView === "logs" ? (
                  <div className="flex flex-col gap-8 px-6 py-8">
                    <section className="border-l-2 border-[var(--align-accent)] pl-4">
                      <div className="flex items-end justify-between gap-4">
                        <span className="font-mono text-[0.78rem] uppercase tracking-[0.22em] text-[var(--align-accent)]">
                          {localPanelName}
                        </span>
                        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#666666]">
                          {lastTranscriptAt ? formatTime(lastTranscriptAt) : "--:--"}
                        </span>
                      </div>
                      <p className="mt-4 text-[1rem] leading-8 tracking-[-0.02em] text-white">
                        {liveListeningCopy}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <CheckCircleIcon className="h-3.5 w-3.5 text-[var(--align-accent)]" />
                        <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[var(--align-accent)]">
                          실시간 문맥 분석 중
                        </span>
                      </div>
                    </section>

                    {showManualFallback ? (
                      <section className="border border-white/10 bg-[#101010] p-4">
                        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[#d1d5b4]">
                          MANUAL INPUT ENABLED
                        </p>
                        <p className="mt-3 text-sm leading-7 text-[#b9b9b9]">
                          Browser speech recognition is unavailable, so this room
                          is listening through text relay instead.
                        </p>
                        <form
                          className="mt-4 space-y-3"
                          onSubmit={handleManualTranscriptSubmit}
                        >
                          <textarea
                            rows={4}
                            value={manualTranscript}
                            onChange={(event) =>
                              setManualTranscript(event.target.value)
                            }
                            placeholder="Type the next line to submit it into the speech monitor."
                            className="w-full resize-none border border-white/10 bg-black px-4 py-3 text-sm leading-7 text-white outline-none transition-colors focus:border-[var(--align-accent)]"
                          />
                          <button
                            type="submit"
                            disabled={!manualTranscript.trim() || forcedMuted}
                            className="inline-flex items-center gap-2 bg-[var(--align-accent)] px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-black transition duration-150 hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <span>SUBMIT TRANSCRIPT</span>
                            <ArrowRightIcon className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </section>
                    ) : null}

                    {logs.length === 0 ? (
                      <div className="border border-white/10 bg-[#101010] p-5">
                        <p className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-[#777777]">
                          아직 싱크된 아젠다가 없습니다
                        </p>
                        <p className="mt-4 text-sm leading-7 text-[#b8b8b8]">
                          대화가 시작되는 즉시, 모든 문장의 효율성과 허세 농도를
                          분석하여 이 공간에 강제 기록합니다.
                        </p>
                      </div>
                    ) : (
                      logs.map((entry) => {
                        const tone = getEntryTone(entry);

                        return (
                          <article
                            key={entry.id}
                            className={`border-l-2 pl-4 ${tone.accent}`}
                          >
                            <div className="flex items-end justify-between gap-4">
                              <span
                                className={`font-mono text-[0.78rem] uppercase tracking-[0.22em] ${tone.name}`}
                              >
                                {entry.speakerName}
                              </span>
                              <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#666666]">
                                {formatTime(entry.createdAt)}
                              </span>
                            </div>

                            <p
                              className={`mt-4 text-[1rem] leading-8 tracking-[-0.02em] ${tone.text}`}
                            >
                              {entry.deliveredText}
                            </p>

                            <div className="mt-4 flex items-center gap-2">
                              <CheckCircleIcon className={`h-3.5 w-3.5 ${tone.icon}`} />
                              <span
                                className={`font-mono text-[0.62rem] uppercase tracking-[0.2em] ${tone.label}`}
                              >
                                {getEntryLabel(entry)}
                              </span>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="space-y-8 px-6 py-8">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                      <MetricCard
                        label="CALL STATUS"
                        value={getCallStatusLabel(displayCallStatus)}
                      />
                      <MetricCard
                        label="BOOT STATUS"
                        value={getBootstrapLabel(bootstrapState)}
                      />
                      <MetricCard
                        label="SPEECH INPUT"
                        value={getRecognitionLabel(recognitionState)}
                      />
                      <MetricCard
                        label="ROOM ROLE"
                        value={(role ?? "BOOTING").toUpperCase()}
                      />
                      <MetricCard
                        label="VOICE ROUTE"
                        value={activeModeration?.voiceSource === "gcp" ? "GCP TTS" : "BROWSER"}
                      />
                    </div>

                    <section className="border border-white/10 bg-[#111111] p-5">
                      <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-[#7a7a7a]">
                        SESSION SNAPSHOT
                      </p>
                      <div className="mt-5 space-y-5">
                        <div className="border-l border-white/10 pl-4">
                          <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-[#7a7a7a]">
                            PARTICIPANTS
                          </p>
                          <p className="mt-3 text-lg font-semibold tracking-[0.04em] text-white">
                            {participants.length} / 2
                          </p>
                        </div>
                        <div className="border-l border-white/10 pl-4">
                          <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-[#7a7a7a]">
                            LAST CAPTURE
                          </p>
                          <p className="mt-3 text-lg font-semibold tracking-[0.04em] text-white">
                            {lastTranscriptAt ? formatTime(lastTranscriptAt) : "WAITING"}
                          </p>
                        </div>
                        <div className="border-l border-white/10 pl-4">
                          <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-[#7a7a7a]">
                            ALIGNMENT RULESET
                          </p>
                          <p className="mt-3 text-sm leading-7 text-[#b9b9b9]">
                            Non-Pangyo phrasing such as direct refusals or flat
                            low-context statements will trigger forced muting and
                            AI TTS replacement.
                          </p>
                        </div>
                        <div className="border-l border-[var(--align-accent)] pl-4">
                          <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-[var(--align-accent)]">
                            ACTIVE MODERATION
                          </p>
                          <p className="mt-3 text-sm leading-7 text-white">
                            {activeModeration
                              ? activeModeration.replacementText
                              : "No intervention is currently blocking the room."}
                          </p>
                        </div>
                      </div>
                    </section>

                    {errorMessage ? (
                      <section className="border border-[var(--align-error-strong)] bg-[#1b1214] p-5">
                        <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-[var(--align-error-strong)]">
                          SYSTEM ALERT
                        </p>
                        <p className="mt-4 text-sm leading-7 text-white">
                          {errorMessage}
                        </p>
                      </section>
                    ) : null}

                    {showManualFallback ? (
                      <section className="border border-white/10 bg-[#111111] p-5">
                        <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-[#d1d5b4]">
                          TRANSCRIPT RELAY
                        </p>
                        <form
                          className="mt-4 space-y-3"
                          onSubmit={handleManualTranscriptSubmit}
                        >
                          <textarea
                            rows={5}
                            value={manualTranscript}
                            onChange={(event) =>
                              setManualTranscript(event.target.value)
                            }
                            placeholder="Type a replacement transcript if the browser blocks live STT."
                            className="w-full resize-none border border-white/10 bg-black px-4 py-3 text-sm leading-7 text-white outline-none transition-colors focus:border-[var(--align-accent)]"
                          />
                          <button
                            type="submit"
                            disabled={!manualTranscript.trim() || forcedMuted}
                            className="inline-flex items-center gap-2 bg-[var(--align-accent)] px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-black transition duration-150 hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <span>SEND TO MONITOR</span>
                            <ArrowRightIcon className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </section>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-50 flex h-20 items-stretch justify-center gap-2 border-t border-white/10 bg-black px-3 sm:gap-8 sm:px-8">
          <BottomControlButton
            label="마이크"
            active={!effectiveMicEnabled}
            onClick={() => setMicrophoneEnabled((current) => !current)}
          >
            {!effectiveMicEnabled ? (
              <MicOffIcon className="h-5 w-5" />
            ) : (
              <MicIcon className="h-5 w-5 text-white/68" />
            )}
          </BottomControlButton>

          <BottomControlButton
            label="비주얼 오프"
            active={!cameraEnabled}
            onClick={() => setCameraEnabled((current) => !current)}
          >
            {!cameraEnabled ? (
              <CameraOffIcon className="h-5 w-5" />
            ) : (
              <CameraIcon className="h-5 w-5 text-white/68" />
            )}
          </BottomControlButton>

          <BottomControlButton
            label="아카이빙"
            active={monitoringEnabled}
            onClick={() => setMonitoringEnabled((current) => !current)}
          >
            <RecordDotIcon
              className={`h-5 w-5 ${
                monitoringEnabled ? "text-[var(--align-accent)]" : "text-white/68"
              }`}
            />
          </BottomControlButton>

          <BottomControlButton
            label="얼라인완료"
            active={false}
            tone="danger"
            onClick={() => router.push("/")}
          >
            <ExitDoorIcon className="h-5 w-5" />
          </BottomControlButton>
        </nav>
      </main>

      {activeModeration ? <AlertOverlay moderation={activeModeration} /> : null}
    </>
  );
}
