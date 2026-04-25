"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { mockRiskPhrases } from "@/lib/pangyo-analyzer";
import { PanelCard } from "@/components/shared/panel-card";

const defaultRoomCode = "PF-2026";

export function HomeScreen() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(defaultRoomCode);

  const isJoinDisabled = useMemo(() => {
    return nickname.trim().length < 2 || roomCode.trim().length < 3;
  }, [nickname, roomCode]);

  function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isJoinDisabled) {
      return;
    }

    const params = new URLSearchParams({
      nickname: nickname.trim(),
      room: roomCode.trim(),
    });

    router.push(`/room?${params.toString()}`);
  }

  return (
    <main className="page-shell min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] flex-col gap-6">
        <header className="glass-panel grid-accent rounded-[32px] border border-white/10 px-8 py-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="dashboard-title text-sm text-emerald-300">
                Pangyo Firewall
              </p>
              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white lg:text-7xl">
                판교어가 아니면,
                <br />
                회의실에서 바로 차단.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 lg:text-lg">
                Pangyo Firewall은 회의 중 나온 발화를 실시간으로 점검하고,
                기준 미달 문장은 사이렌과 함께 음소거한 뒤 AI가 더 세련된
                판교어 버전으로 다시 말해주는 해커톤 데모용 MVP입니다.
              </p>
            </div>

            <div className="rounded-[28px] border border-red-500/25 bg-red-500/10 px-6 py-5 text-sm text-red-100">
              <p className="dashboard-title text-xs text-red-200">
                Danger Dictionary
              </p>
              <div className="mt-3 flex max-w-lg flex-wrap gap-2">
                {mockRiskPhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <PanelCard
            title="Demo Flow"
            subtitle="과장된 해커톤 데모 톤에 맞춰, 첫 화면부터 위험 발화 룰과 실시간 심판 역할을 강조했습니다."
            className="h-full"
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "입장",
                  body: "닉네임과 방 코드를 넣고 회의방으로 진입합니다.",
                },
                {
                  step: "02",
                  title: "검사",
                  body: "발화를 제출하면 mock 분석기가 Pangyo Score와 차단 여부를 계산합니다.",
                },
                {
                  step: "03",
                  title: "대체",
                  body: "위험 발화는 사이렌 모달과 함께 차단되고, AI 대체 문장이 회의 로그에 기록됩니다.",
                },
              ].map((item) => (
                <article
                  key={item.step}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-5"
                >
                  <p className="dashboard-title text-xs text-sky-200/70">
                    Step {item.step}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-4 rounded-[28px] border border-emerald-400/20 bg-emerald-400/8 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="dashboard-title text-xs text-emerald-200/80">
                  Designed For
                </p>
                <p className="mt-2 text-lg font-medium text-emerald-50">
                  데스크톱 데모, 발표 시연, 과장된 위기 감지 연출
                </p>
              </div>
              <Link
                href="/report"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/12"
              >
                마지막 리포트 보기
              </Link>
            </div>
          </PanelCard>

          <PanelCard
            title="Join Meeting"
            subtitle="회의방 입장 정보를 입력하면 바로 Pangyo Firewall 데모를 시작할 수 있습니다."
            accent="success"
            className="h-full"
          >
            <form className="space-y-5" onSubmit={handleJoin}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  닉네임
                </span>
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="예: 10년차-해커톤러"
                  className="w-full rounded-[20px] border border-white/10 bg-slate-950/80 px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  방 코드
                </span>
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  placeholder="예: PF-2026"
                  className="w-full rounded-[20px] border border-white/10 bg-slate-950/80 px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50"
                />
              </label>

              <button
                type="submit"
                disabled={isJoinDisabled}
                className="w-full rounded-[22px] bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-300 px-5 py-4 text-base font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                회의방 입장
              </button>
            </form>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
              <p className="dashboard-title text-xs text-slate-400">
                What You Get
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                <li>실시간 참가자 패널과 회의 로그</li>
                <li>위험 발화 감지 시 빨간 사이렌 모달</li>
                <li>자동 음소거 연출과 AI 대체 발화 출력</li>
                <li>종합 Pangyo Score 리포트 화면</li>
              </ul>
            </div>
          </PanelCard>
        </div>
      </div>
    </main>
  );
}

