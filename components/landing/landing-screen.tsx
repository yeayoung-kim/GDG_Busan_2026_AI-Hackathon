"use client";

import { startTransition, useState, type ComponentType, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CameraOffIcon,
  MicIcon,
  MicOffIcon,
  PlayIcon,
  WarningTriangleIcon,
} from "@/components/shared/align-icons";

type HomeStage = "landing" | "guide" | "lobby";

const DISPLAY_NAME_STORAGE_KEY = "align-display-name";
const DEFAULT_ROOM_CODE = "PGY-902";

const guidelineSteps: Array<{
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

function readOrCreateDisplayName() {
  const storedName = window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY)?.trim();

  if (storedName) {
    return storedName;
  }

  const generatedName = createDisplayName();
  window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, generatedName);
  return generatedName;
}

function LandingHero({ onStart }: { onStart: () => void }) {
  return (
    <section className="screen-fade flex min-h-screen items-center justify-center bg-black px-6 py-20 text-center sm:px-10">
      <div className="flex w-full max-w-4xl flex-col items-center">
        <div>
          <h1 className="text-[clamp(4.5rem,11vw,7.6rem)] font-black uppercase leading-[0.9] tracking-[-0.09em] text-white">
            ALIGN<span className="text-[var(--align-accent)]">.</span>AI
          </h1>
          <p className="mt-7 text-[clamp(1.2rem,2vw,2rem)] font-medium tracking-[-0.04em] text-[#787b84]">
            조직의 소통을 막는 커뮤니케이션 솔루션
          </p>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="group mt-16 inline-flex items-center gap-3 rounded-[10px] bg-[var(--align-accent)] px-12 py-4 text-[0.84rem] font-semibold uppercase tracking-[0.3em] text-black transition duration-200 hover:translate-y-[1px]"
        >
          <span>START</span>
          <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </div>
    </section>
  );
}

function GuidelineStage({ onNext }: { onNext: () => void }) {
  return (
    <section className="screen-fade min-h-screen bg-black px-8 py-14 text-white sm:px-12 lg:px-20 xl:px-24 xl:py-16">
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-[1180px] flex-col">
        <header className="max-w-4xl">
          <h2 className="text-[clamp(3.3rem,6vw,4.7rem)] font-black uppercase leading-[0.94] tracking-[-0.08em] text-[var(--align-accent)]">
            GUIDE LINE
          </h2>
          <p className="mt-6 text-[clamp(1rem,1.6vw,1.45rem)] font-medium tracking-[-0.03em] text-[#9b9b9b]">
            경고: 이 회의실에서는 간지 없는 쉬운 한국어를 쓸 수 없습니다
          </p>
        </header>

        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:mt-20">
          {guidelineSteps.map(({ step, title, body, icon: Icon }) => (
            <article
              key={step}
              className="min-h-[174px] border border-white/14 bg-[#121212] px-8 py-10"
            >
              <div className="flex items-center gap-5 text-[var(--align-accent)]">
                <span className="font-mono text-[1.1rem] font-semibold tracking-[0.18em]">
                  {step}
                </span>
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="mt-8 text-[clamp(1.9rem,2.2vw,2.7rem)] font-bold leading-[1.15] tracking-[-0.05em] text-[#e5e3df]">
                {title}
              </h3>
              <p className="mt-4 max-w-[30rem] text-[1rem] leading-[1.6] tracking-[-0.02em] text-[#c5c1b2]">
                {body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-auto flex justify-center border-t border-white/12 pt-9 md:justify-end">
          <button
            type="button"
            onClick={onNext}
            className="group inline-flex min-w-[320px] items-center justify-center gap-3 rounded-full bg-[var(--align-accent)] px-12 py-6 text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-black transition duration-200 hover:translate-y-[1px]"
          >
            <span>ENTER CONFERENCE ROOM</span>
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}

interface LobbyStageProps {
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function LobbyStage({
  roomCode,
  onRoomCodeChange,
  onSubmit,
}: LobbyStageProps) {
  return (
    <section className="screen-fade flex min-h-screen items-center justify-center bg-[#151515] px-6 py-12 text-white sm:px-10">
      <div className="flex w-full max-w-[980px] flex-col items-center">
        <header className="mb-14 text-center">
          <h2 className="text-[clamp(3.7rem,10vw,5.7rem)] font-black uppercase leading-none tracking-[-0.07em] text-[var(--align-accent)]">
            ALIGN.AI
          </h2>
          <p className="mt-4 text-sm uppercase tracking-[0.35em] text-[#c2c2c2] sm:text-base">
            PANGYO VIBE OPTIMIZATION PROTOCOL
          </p>
        </header>

        <div className="w-full border border-[var(--align-border-strong)] bg-[#252525]">
          <div className="flex aspect-video w-full flex-col items-center justify-center px-8 text-center">
            <CameraOffIcon className="h-16 w-16 text-[#4d5633]" />
            <p className="mt-5 text-[0.95rem] uppercase tracking-[0.28em] text-[#4d5633]">
              CAMERA INACTIVE
            </p>
          </div>
        </div>

        <form
          className="mt-16 flex w-full max-w-[480px] flex-col items-center"
          onSubmit={onSubmit}
        >
          <label className="w-full text-center">
            <span className="block text-[1rem] tracking-[-0.03em] text-[#c9ccb7]">
              Enter room code to align.
            </span>
            <input
              autoComplete="off"
              spellCheck={false}
              value={roomCode}
              onChange={(event) => onRoomCodeChange(event.target.value)}
              placeholder="ROOM CODE"
              className="mt-8 w-full border-0 border-b border-white/80 bg-transparent px-0 pb-3 text-center text-[clamp(2rem,5vw,3.4rem)] font-black uppercase tracking-[0.12em] text-[#262626] outline-none transition-colors placeholder:text-[#2f2f2f] focus:border-[var(--align-accent)] focus:text-white focus:placeholder:text-transparent"
            />
          </label>

          <button
            type="submit"
            disabled={!roomCode.trim()}
            className="group mt-10 inline-flex w-full items-center justify-center gap-3 bg-[var(--align-accent)] px-8 py-5 text-[0.82rem] font-semibold uppercase tracking-[0.26em] text-black transition duration-200 hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span>JOIN ROOM</span>
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </form>
      </div>
    </section>
  );
}

export function LandingScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<HomeStage>("landing");
  const [roomCode, setRoomCode] = useState(DEFAULT_ROOM_CODE);

  function handleRoomJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedRoomCode = roomCode.trim().toLowerCase();
    const participantName = readOrCreateDisplayName();

    if (!normalizedRoomCode || !participantName.trim()) {
      return;
    }

    router.push(
      `/room/${encodeURIComponent(normalizedRoomCode)}?name=${encodeURIComponent(participantName)}`,
    );
  }

  function moveToGuide() {
    startTransition(() => {
      setStage("guide");
    });
  }

  function moveToLobby() {
    startTransition(() => {
      setStage("lobby");
    });
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {stage === "landing" ? <LandingHero onStart={moveToGuide} /> : null}
      {stage === "guide" ? <GuidelineStage onNext={moveToLobby} /> : null}
      {stage === "lobby" ? (
        <LobbyStage
          roomCode={roomCode}
          onRoomCodeChange={(value) => setRoomCode(value.toUpperCase())}
          onSubmit={handleRoomJoin}
        />
      ) : null}
    </main>
  );
}
