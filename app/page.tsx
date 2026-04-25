"use client";

import {
  ArrowRightIcon,
  CameraOffIcon,
  MicIcon,
  MicOffIcon,
  PlayIcon,
  WarningTriangleIcon,
} from "@/components/shared/align-icons";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  startTransition,
  useState,
  type ComponentType,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

const DISPLAY_NAME_STORAGE_KEY = "align-display-name";
type HomeStage = "landing" | "guide" | "lobby";
type CameraPreviewState = "idle" | "loading" | "ready" | "blocked" | "unsupported";
type LobbyMode = "join" | "create";
type StageHistoryState = {
  __alignStage?: HomeStage;
  __alignLobbyMode?: LobbyMode;
  __alignRoomCode?: string;
};

const GUIDELINE_STEPS: Array<{
  step: string;
  title: string;
  body: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    step: "01",
    title: "실시간 발화 모니터링",
    body: "2인 화상 회의 중 오가는 모든 대화의 '판교 핏(Fit)'과 허세 지수를 시스템이 실시간으로 스캔합니다.",
    icon: MicIcon,
  },
  {
    step: "02",
    title: "위험 발화 감지",
    body: "너무 직관적이고 쉬운 한국어(비-판교어)가 감지되어 조직의 밸류가 떨어질 위험이 생기면 즉각 경고가 발생합니다.",
    icon: WarningTriangleIcon,
  },
  {
    step: "03",
    title: "강제 입틀막",
    body: "더 이상의 촌스러운 소통을 막기 위해, 즉시 양측 참가자의 마이크를 강제 차단(Mute)하여 입을 막습니다.",
    icon: MicOffIcon,
  },
  {
    step: "04",
    title: "판교어 음성으로 강제 교체",
    body: "AI가 당신의 투박한 진심을 '완벽한 판교어'로 포장한 뒤, 세련된 기계음(TTS)으로 대신 대독합니다.",
    icon: PlayIcon,
  },
];

function createDisplayName() {
  return `USER_${Math.floor(100 + Math.random() * 900)}`;
}

function createRoomCode() {
  return `ALN-${Math.floor(100 + Math.random() * 900)}`;
}

function readOrCreateDisplayName() {
  const storedName = window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY)?.trim();

  if (storedName) {
    return storedName;
  }

  const generatedName = createDisplayName();
  window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, generatedName);
  return generatedName;
}

function readStageState(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as StageHistoryState;
  const stage = candidate.__alignStage;

  if (stage !== "landing" && stage !== "guide" && stage !== "lobby") {
    return null;
  }

  return {
    stage,
    lobbyMode:
      candidate.__alignLobbyMode === "create" || candidate.__alignLobbyMode === "join"
        ? candidate.__alignLobbyMode
        : "join",
    roomCode: typeof candidate.__alignRoomCode === "string" ? candidate.__alignRoomCode : "",
  };
}

function WordmarkText() {
  return (
    <>
      <span className="align-reflect">ALIGN</span>
      <span aria-hidden className="align-dot">
        .
      </span>
      <span className="align-reflect">AI</span>
    </>
  );
}

function Wordmark({ glitch = false }: { glitch?: boolean }) {
  return (
    <span className={`align-wordmark ${glitch ? "align-wordmark--glitch" : ""}`}>
      <span className="align-wordmark-layer align-wordmark-main">
        <WordmarkText />
      </span>
      {glitch ? (
        <>
          <span aria-hidden className="align-wordmark-layer align-glitch-layer align-glitch-layer-a">
            <WordmarkText />
          </span>
          <span aria-hidden className="align-wordmark-layer align-glitch-layer align-glitch-layer-b">
            <WordmarkText />
          </span>
        </>
      ) : null}
    </span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion() ?? false;
  const [stage, setStage] = useState<HomeStage>("landing");
  const [roomCode, setRoomCode] = useState("");
  const [lobbyMode, setLobbyMode] = useState<LobbyMode>("join");
  const [cameraPreviewState, setCameraPreviewState] = useState<CameraPreviewState>("idle");
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const smoothX = useSpring(pointerX, {
    stiffness: 120,
    damping: 20,
    mass: 0.6,
  });
  const smoothY = useSpring(pointerY, {
    stiffness: 120,
    damping: 20,
    mass: 0.6,
  });

  const titleX = useTransform(smoothX, [-1, 1], reduceMotion ? [0, 0] : [-10, 10]);
  const titleY = useTransform(smoothY, [-1, 1], reduceMotion ? [0, 0] : [-8, 8]);
  const panelX = useTransform(smoothX, [-1, 1], reduceMotion ? [0, 0] : [-14, 14]);
  const panelY = useTransform(smoothY, [-1, 1], reduceMotion ? [0, 0] : [-10, 10]);
  const panelRotateX = useTransform(smoothY, [-1, 1], reduceMotion ? [0, 0] : [2.5, -2.5]);
  const panelRotateY = useTransform(smoothX, [-1, 1], reduceMotion ? [0, 0] : [-3.5, 3.5]);

  function syncStageState(
    nextStage: HomeStage,
    nextLobbyMode: LobbyMode = "join",
    nextRoomCode = "",
  ) {
    setStage(nextStage);
    setLobbyMode(nextLobbyMode);
    setRoomCode(nextRoomCode);
  }

  function writeHistoryState(
    mode: "push" | "replace",
    nextStage: HomeStage,
    nextLobbyMode: LobbyMode = "join",
    nextRoomCode = "",
  ) {
    if (typeof window === "undefined") {
      return;
    }

    const nextState: StageHistoryState = {
      ...(window.history.state as StageHistoryState | null),
      __alignStage: nextStage,
      __alignLobbyMode: nextLobbyMode,
      __alignRoomCode: nextRoomCode,
    };

    if (mode === "replace") {
      window.history.replaceState(nextState, "");
      return;
    }

    window.history.pushState(nextState, "");
  }

  function transitionStage(
    nextStage: HomeStage,
    options?: {
      historyMode?: "push" | "replace";
      lobbyMode?: LobbyMode;
      roomCode?: string;
    },
  ) {
    const nextLobbyMode = options?.lobbyMode ?? "join";
    const nextRoomCode = options?.roomCode ?? "";

    writeHistoryState(options?.historyMode ?? "push", nextStage, nextLobbyMode, nextRoomCode);

    startTransition(() => {
      syncStageState(nextStage, nextLobbyMode, nextRoomCode);
    });
  }

  useEffect(() => {
    const initialState = readStageState(window.history.state);

    if (initialState) {
      startTransition(() => {
        syncStageState(
          initialState.stage,
          initialState.stage === "lobby" ? initialState.lobbyMode : "join",
          initialState.stage === "lobby" ? initialState.roomCode : "",
        );
      });
    } else {
      writeHistoryState("replace", "landing", "join", "");
    }

    function handlePopState(event: PopStateEvent) {
      const nextState = readStageState(event.state);

      if (!nextState) {
        return;
      }

      startTransition(() => {
        syncStageState(
          nextState.stage,
          nextState.stage === "lobby" ? nextState.lobbyMode : "join",
          nextState.stage === "lobby" ? nextState.roomCode : "",
        );
      });
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    function clearPreview() {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((track) => track.stop());
        previewStreamRef.current = null;
      }

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = null;
      }
    }

    if (stage !== "lobby") {
      clearPreview();
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      queueMicrotask(() => {
        setCameraPreviewState("unsupported");
      });
      return;
    }

    let disposed = false;

    async function bootstrapPreview() {
      try {
        setCameraPreviewState("loading");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        previewStreamRef.current = stream;

        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
          await previewVideoRef.current.play().catch(() => null);
        }

        setCameraPreviewState("ready");
      } catch {
        if (!disposed) {
          setCameraPreviewState("blocked");
        }
      }
    }

    bootstrapPreview();

    return () => {
      disposed = true;
      clearPreview();
    };
  }, [stage]);

  function handleMouseMove(event: ReactMouseEvent<HTMLElement>) {
    if (reduceMotion) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const nextY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    pointerX.set(nextX);
    pointerY.set(nextY);
  }

  function resetPointer() {
    pointerX.set(0);
    pointerY.set(0);
  }

  function handleStart() {
    resetPointer();
    transitionStage("guide");
  }

  function handleOpenLobby() {
    transitionStage("lobby", {
      lobbyMode: "join",
      roomCode: "",
    });
  }

  function handleCreateConferenceRoom() {
    const generatedRoomCode = createRoomCode();
    transitionStage("lobby", {
      lobbyMode: "create",
      roomCode: generatedRoomCode,
    });
  }

  function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedRoomCode = roomCode.trim().toLowerCase();

    if (!normalizedRoomCode) {
      return;
    }

    const participantName = readOrCreateDisplayName();

    startTransition(() => {
      router.push(`/room/${normalizedRoomCode}?name=${encodeURIComponent(participantName)}`);
    });
  }

  return (
    <>
      <main
        className="relative min-h-screen overflow-hidden bg-black text-white"
        onMouseLeave={stage === "landing" ? resetPointer : undefined}
        onMouseMove={stage === "landing" ? handleMouseMove : undefined}
      >
        {stage === "landing" ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_18%),linear-gradient(135deg,_rgba(255,255,255,0.02),_transparent_38%,rgba(255,255,255,0.02)_68%,transparent)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.12),rgba(0,0,0,0.42)_58%,rgba(0,0,0,0.82))]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.04),_transparent_20%),linear-gradient(to_bottom,rgba(0,0,0,0.16),rgba(0,0,0,0.74)_58%,rgba(0,0,0,0.94))]" />
        )}

        <AnimatePresence mode="wait">
          {stage === "landing" ? (
            <motion.section
              key="landing"
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16 sm:px-10 lg:px-16"
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24 }}
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex w-full max-w-6xl flex-col items-center text-center">
                <motion.div
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="relative"
                  initial={reduceMotion ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.97, y: 20 }}
                  style={{
                    x: panelX,
                    y: panelY,
                    rotateX: panelRotateX,
                    rotateY: panelRotateY,
                    transformPerspective: 1800,
                    transformStyle: "preserve-3d",
                  }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.95, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h1
                    aria-label="ALIGN.AI"
                    className="relative text-[clamp(4.2rem,14vw,10rem)] font-black uppercase leading-[0.84] tracking-[-0.11em] sm:text-[clamp(5.4rem,13vw,11rem)]"
                  >
                    <span className="sr-only">ALIGN.AI</span>
                    <motion.span
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="relative block"
                      initial={reduceMotion ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 1.03, y: 8 }}
                      style={{ x: titleX, y: titleY }}
                      transition={{
                        delay: reduceMotion ? 0 : 0.08,
                        duration: reduceMotion ? 0.01 : 0.9,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <Wordmark />
                    </motion.span>
                  </h1>
                </motion.div>

                <motion.p
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-7 max-w-3xl text-[clamp(1rem,2vw,1.85rem)] font-medium tracking-[-0.04em] text-[#7f838b]"
                  initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                  transition={{
                    delay: reduceMotion ? 0 : 0.95,
                    duration: reduceMotion ? 0.01 : 0.8,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  조직의 소통을 막는 커뮤니케이션 솔루션
                </motion.p>

                <motion.button
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative mt-14 inline-flex items-center justify-center overflow-visible rounded-[1.35rem] px-8 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.38em] text-black sm:px-10 sm:py-5"
                  initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                  onClick={handleStart}
                  transition={{
                    delay: reduceMotion ? 0 : 1.1,
                    duration: reduceMotion ? 0.01 : 0.72,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={
                    reduceMotion
                      ? {}
                      : {
                          rotateX: 10,
                          rotateY: -8,
                          scale: 1.02,
                          y: -6,
                        }
                  }
                  whileTap={reduceMotion ? {} : { scale: 0.985, y: -2 }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,#d8ff4f_0%,#c5ff00_55%,#b0e800_100%)] shadow-[0_14px_28px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  />

                  <span className="relative z-10 flex items-center [transform:translateZ(28px)]">
                    <span>START</span>
                  </span>
                </motion.button>
              </div>
            </motion.section>
          ) : stage === "guide" ? (
            <motion.section
              key="guide"
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 min-h-screen px-8 py-14 text-white sm:px-12 lg:px-20 xl:px-24 xl:py-16"
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24 }}
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.48, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-[1180px] flex-col">
                <header className="max-w-4xl">
                  <motion.h2
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[clamp(3.3rem,6vw,4.7rem)] font-black uppercase leading-[0.94] tracking-[-0.08em] text-[#c5ff00]"
                    initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                    transition={{ duration: reduceMotion ? 0.01 : 0.65, ease: [0.22, 1, 0.36, 1] }}
                  >
                    GUIDE LINE
                  </motion.h2>
                  <motion.p
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 text-[clamp(1rem,1.6vw,1.45rem)] font-medium tracking-[-0.03em] text-[#9b9b9b]"
                    initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                    transition={{
                      delay: reduceMotion ? 0 : 0.08,
                      duration: reduceMotion ? 0.01 : 0.7,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <span className="mr-2 inline-block font-black text-[#ff4d2d]">
                      !!
                    </span>
                    경고: 이 회의실에서는 간지 없는 쉬운 한국어를 쓸 수 없습니다
                  </motion.p>
                </header>

                <div className="mt-16 grid gap-6 md:grid-cols-2 xl:mt-20">
                  {GUIDELINE_STEPS.map(({ step, title, body, icon: Icon }, index) => (
                    <motion.article
                      key={step}
                      animate={{ opacity: 1, y: 0 }}
                      className="min-h-[174px] border border-white/14 bg-[#121212] px-8 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 }}
                      transition={{
                        delay: reduceMotion ? 0 : 0.12 + index * 0.08,
                        duration: reduceMotion ? 0.01 : 0.72,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <div className="flex items-center gap-3 text-[#c5ff00]">
                        <span className="font-mono text-[1.05rem] font-semibold tracking-[0.18em]">
                          {step}
                        </span>
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="mt-8 text-[clamp(1.9rem,2.2vw,2.7rem)] font-bold leading-[1.15] tracking-[-0.05em] text-[#e5e3df]">
                        {title}
                      </h3>
                      <p className="mt-4 max-w-[30rem] text-[1rem] leading-[1.6] tracking-[-0.02em] text-[#bcb7a9]">
                        {body}
                      </p>
                    </motion.article>
                  ))}
                </div>

                <div className="mt-auto pt-14">
                  <div className="border-t border-white/12 pt-9">
                    <div className="flex flex-col items-center gap-4 md:flex-row md:justify-end">
                      <motion.button
                        type="button"
                        animate={{ opacity: 1, y: 0 }}
                        className="group inline-flex min-w-[320px] items-center justify-center gap-3 rounded-full border border-white/16 bg-[#111111] px-12 py-6 text-[0.92rem] font-semibold tracking-[-0.02em] text-[#d8d8d3] transition duration-200"
                        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        onClick={handleCreateConferenceRoom}
                        transition={{
                          delay: reduceMotion ? 0 : 0.36,
                          duration: reduceMotion ? 0.01 : 0.68,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        whileHover={reduceMotion ? {} : { y: -4, scale: 1.01 }}
                        whileTap={reduceMotion ? {} : { y: -1, scale: 0.99 }}
                      >
                        <span>회의실 생성하기</span>
                        <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </motion.button>

                      <motion.button
                        type="button"
                        animate={{ opacity: 1, y: 0 }}
                        className="group inline-flex min-w-[320px] items-center justify-center gap-3 rounded-full bg-[#c5ff00] px-12 py-6 text-[0.92rem] font-semibold tracking-[-0.02em] text-black transition duration-200"
                        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        onClick={handleOpenLobby}
                        transition={{
                          delay: reduceMotion ? 0 : 0.42,
                          duration: reduceMotion ? 0.01 : 0.68,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        whileHover={reduceMotion ? {} : { y: -4, scale: 1.01 }}
                        whileTap={reduceMotion ? {} : { y: -1, scale: 0.99 }}
                      >
                        <span>회의실 입장하기</span>
                        <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="lobby"
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12 text-white sm:px-10"
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24 }}
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.46, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex w-full max-w-[980px] flex-col items-center">
                <motion.header
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-10 text-center"
                  initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.68, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 className="text-[clamp(3.2rem,8vw,5rem)] font-black uppercase leading-none tracking-[-0.07em] text-[#c5ff00]">
                    ALIGN.AI
                  </h2>
                  <p className="mt-4 text-[0.72rem] font-semibold tracking-[0.22em] text-[#9f9f9b] sm:text-[0.78rem]">
                    판 교 어  최 적 화  솔 루 션
                  </p>
                </motion.header>

                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-[760px] border border-white/14 bg-[#232321]"
                  initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
                  transition={{
                    delay: reduceMotion ? 0 : 0.08,
                    duration: reduceMotion ? 0.01 : 0.72,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-[#1a1a18]">
                    <video
                      ref={previewVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`h-full w-full object-cover [transform:scaleX(-1)] ${
                        cameraPreviewState === "ready" ? "opacity-100" : "opacity-0"
                      }`}
                    />

                    {cameraPreviewState !== "ready" ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                        <CameraOffIcon className="h-14 w-14 text-[#56613b]" />
                        <p className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#56613b]">
                          {cameraPreviewState === "loading"
                            ? "CAMERA CONNECTING"
                            : cameraPreviewState === "unsupported"
                              ? "CAMERA UNSUPPORTED"
                              : cameraPreviewState === "blocked"
                                ? "CAMERA BLOCKED"
                                : "CAMERA INACTIVE"}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </motion.div>

                <motion.form
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-10 flex w-full max-w-[520px] flex-col items-center"
                  initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  onSubmit={handleJoinRoom}
                  transition={{
                    delay: reduceMotion ? 0 : 0.14,
                    duration: reduceMotion ? 0.01 : 0.72,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <label className="w-full text-center">
                    <span className="block text-[0.98rem] tracking-[-0.03em] text-[#c9ccb7]">
                      Enter room code to align.
                    </span>
                    <input
                      autoComplete="off"
                      className="mt-8 w-full border-0 border-b border-white/65 bg-transparent px-0 pb-3 text-center text-[clamp(2rem,5vw,3.1rem)] font-black uppercase tracking-[0.12em] text-white outline-none transition-colors placeholder:text-[#3e3e39] focus:border-[#c5ff00] focus:placeholder:text-transparent"
                      onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                      placeholder="ROOM CODE"
                      spellCheck={false}
                      value={roomCode}
                    />
                  </label>

                  <motion.button
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative mt-10 inline-flex w-full max-w-[244px] items-center justify-center gap-3 overflow-visible rounded-none bg-[#c5ff00] px-8 py-5 text-[0.76rem] font-semibold uppercase tracking-[0.24em] text-black transition disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!roomCode.trim()}
                    initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                    transition={{
                      delay: reduceMotion ? 0 : 0.22,
                      duration: reduceMotion ? 0.01 : 0.68,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    type="submit"
                    whileHover={reduceMotion ? {} : { y: -3, scale: 1.01 }}
                    whileTap={reduceMotion ? {} : { y: -1, scale: 0.995 }}
                  >
                    <span>{lobbyMode === "create" ? "회의실 생성하기" : "회의실 참여하기"}</span>
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </motion.button>
                </motion.form>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <style jsx global>{`
        .align-wordmark {
          position: relative;
          display: inline-grid;
          place-items: center;
          isolation: isolate;
        }

        .align-wordmark-layer {
          grid-area: 1 / 1;
          display: inline-flex;
          align-items: baseline;
          white-space: nowrap;
        }

        .align-wordmark-main {
          position: relative;
          z-index: 2;
        }

        .align-wordmark-main,
        .align-reflect {
          text-shadow:
            0 0 36px rgba(255, 255, 255, 0.08),
            0 0 72px rgba(197, 255, 0, 0.08);
        }

        .align-reflect {
          background-image: linear-gradient(
            112deg,
            #595959 0%,
            #ffffff 14%,
            #9d9d9d 22%,
            #ffffff 28%,
            #434343 40%,
            #d8ff53 52%,
            #ffffff 64%,
            #646464 78%,
            #ffffff 100%
          );
          background-size: 240% 100%;
          background-position: 0% 50%;
          background-clip: text;
          color: transparent;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: align-sweep 5.8s cubic-bezier(0.37, 0, 0.2, 1) infinite;
          filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.12));
        }

        .align-dot {
          display: inline-block;
          color: #c5ff00;
          font-size: 0.71em;
          line-height: 0.62;
          margin-inline: 0.065em 0.12em;
          text-shadow:
            0 0 14px rgba(197, 255, 0, 0.75),
            0 0 34px rgba(197, 255, 0, 0.4);
          transform: translate(0, -0.075em);
        }

        @keyframes align-sweep {
          0% {
            background-position: 140% 50%;
          }

          48% {
            background-position: 140% 50%;
          }

          78% {
            background-position: -30% 50%;
          }

          100% {
            background-position: -30% 50%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .align-reflect {
            animation: none;
            background-position: 50% 50%;
          }
        }
      `}</style>
    </>
  );
}
