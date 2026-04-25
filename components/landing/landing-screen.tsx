"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function createRoomCode() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 6 }, () => {
    const index = Math.floor(Math.random() * alphabet.length);
    return alphabet[index];
  }).join("");
}

const features = [
  {
    title: "실시간 화상회의",
    body: "브라우저에서 바로 2명이 접속해 카메라와 마이크를 공유합니다.",
  },
  {
    title: "판교어 모더레이션",
    body: "STT로 발화를 읽고 판교 밀도를 점수화해 통과 여부를 즉시 판단합니다.",
  },
  {
    title: "자동 음소거 + TTS",
    body: "기준 미달 시 참가자 전체를 잠깐 묶고 교정된 문장을 다시 읽어줍니다.",
  },
];

export function LandingScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState(createRoomCode());

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedRoomCode = roomCode.trim().toLowerCase();

    if (!trimmedName || !trimmedRoomCode) {
      return;
    }

    router.push(`/room/${trimmedRoomCode}?name=${encodeURIComponent(trimmedName)}`);
  }

  return (
    <main className="align-shell min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1500px] flex-col rounded-[40px] border border-white/8 bg-black px-5 py-5 sm:px-8 sm:py-8">
        <header className="neon-line flex flex-col gap-6 border-b border-white/8 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <span className="align-badge">Align.ai</span>
            <div className="max-w-3xl space-y-4">
              <h1 className="editorial-title text-5xl leading-none tracking-[-0.05em] text-white sm:text-6xl lg:text-8xl">
                조직의 말을
                <br />
                판교식으로 정렬하는
                <br />
                회의 인터셉터
              </h1>
              <p className="max-w-2xl text-base text-[#bbbbb4] sm:text-lg">
                블랙박스처럼 조용히 지켜보다가, 판교어가 아닌 순간만 개입합니다.
                참가자 두 명이 같은 방에 들어와 바로 화상 통화를 시작할 수 있고,
                비즈니스 톤이 무너지면 시스템이 음소거와 TTS로 회의를 다시 정렬합니다.
              </p>
            </div>
          </div>

          <div className="w-full max-w-[420px] space-y-3">
            <div className="surface-card p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                <span>Deploy Stack</span>
                <span>Cloud Run / GCP TTS</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="data-card p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                    Call
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">2P</p>
                </div>
                <div className="data-card p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                    Flow
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">STT</p>
                </div>
                <div className="data-card p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                    Voice
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">TTS</p>
                </div>
              </div>
            </div>

            <div className="surface-card ticker-grid p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                Moderation Logic
              </p>
              <div className="mt-4 space-y-3 text-sm text-[#c7c7c1]">
                <div className="hairline-frame p-4">
                  <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[#7d7d77]">
                    Pass
                  </p>
                  <p className="mt-2">
                    얼라인, 오너십, 액션 아이템 같은 판교어가 충분하면 원문 그대로
                    송출합니다.
                  </p>
                </div>
                <div className="hairline-frame p-4">
                  <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[#7d7d77]">
                    Block
                  </p>
                  <p className="mt-2">
                    몰라요, 못 해요, 그냥 같은 표현이 감지되면 전체 음성을 잠깐
                    묶고 교정 문장을 다시 읽습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="surface-card p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                    Project Intro
                  </p>
                  <h2 className="editorial-title mt-4 text-3xl leading-tight text-white sm:text-4xl">
                    온라인 화상 통화 중 판교어가 아니면 시스템이 직접 개입합니다.
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-7 text-[#9f9f98]">
                  해커톤 데모에 맞춰 별도 앱 설치 없이 웹 브라우저에서 바로
                  동작하도록 설계했습니다. 브라우저 STT, WebRTC, GCP TTS를 조합해
                  비용을 낮추고 실사용 감각은 살렸습니다.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {features.map((feature) => (
                  <article key={feature.title} className="hairline-frame p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                      {feature.title}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#c0c0ba]">
                      {feature.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="surface-card mosaic p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                  Meeting Script
                </p>
                <div className="mt-5 space-y-4 text-sm leading-7 text-[#b6b6b0]">
                  <div className="hairline-frame p-4">
                    <p className="text-white">“오늘 방향성 싱크 먼저 맞추고요.”</p>
                    <p className="mt-2 text-[#72726d]">원문 그대로 통과</p>
                  </div>
                  <div className="hairline-frame p-4">
                    <p className="text-white">“몰라요. 그냥 그렇게 하죠.”</p>
                    <p className="mt-2 text-[#72726d]">
                      즉시 음소거 후 교정 TTS 재생
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface-card p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                  Hackathon Fit
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="data-card p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                      Credit Strategy
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#c7c7c1]">
                      Cloud Run 단일 인스턴스와 TTS 호출만 사용해 5달러 크레딧
                      안에서 시연 가능합니다.
                    </p>
                  </div>
                  <div className="data-card p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#7d7d77]">
                      Browser First
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#c7c7c1]">
                      STT 미지원 환경에서는 수동 입력 콘솔로 바로 폴백됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="surface-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                  Enter Session
                </p>
                <h2 className="editorial-title mt-3 text-3xl text-white">
                  바로 방을 열고
                  <br />
                  상대를 초대하세요
                </h2>
              </div>
              <div className="scan-ring flex h-16 w-16 items-center justify-center rounded-full border border-[#c5ff00]/30 text-xs uppercase tracking-[0.18em] text-[#c5ff00]">
                Live
              </div>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-3 block text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                  Display Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="예: 김얼라인"
                  className="w-full rounded-[22px] border border-white/8 bg-[#080808] px-5 py-4 text-base text-white outline-none focus:border-[#c5ff00]/40"
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-xs uppercase tracking-[0.22em] text-[#9f9f98]">
                  Room Code
                </span>
                <div className="flex gap-3">
                  <input
                    value={roomCode}
                    onChange={(event) => setRoomCode(event.target.value)}
                    className="min-w-0 flex-1 rounded-[22px] border border-white/8 bg-[#080808] px-5 py-4 text-base tracking-[0.22em] text-white outline-none focus:border-[#c5ff00]/40"
                  />
                  <button
                    type="button"
                    onClick={() => setRoomCode(createRoomCode())}
                    className="capsule-button capsule-button-secondary px-4 text-sm"
                  >
                    재생성
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={!name.trim() || !roomCode.trim()}
                className="capsule-button capsule-button-primary w-full text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                회의방 입장
              </button>
            </form>

            <div className="mt-8 space-y-4 border-t border-white/8 pt-6">
              <div className="flex items-start gap-3">
                <div className="status-dot mt-2 shrink-0" />
                <p className="text-sm leading-7 text-[#b8b8b1]">
                  참여자는 동일한 방 코드로 접속하면 자동으로 1:1 WebRTC 연결을
                  시도합니다.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="status-dot mt-2 shrink-0" />
                <p className="text-sm leading-7 text-[#b8b8b1]">
                  Chrome에서 카메라와 마이크를 허용하면 실시간 STT가 활성화됩니다.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="status-dot mt-2 shrink-0" />
                <p className="text-sm leading-7 text-[#b8b8b1]">
                  GCP TTS가 없더라도 브라우저 음성 합성으로 데모를 이어갈 수
                  있습니다.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
