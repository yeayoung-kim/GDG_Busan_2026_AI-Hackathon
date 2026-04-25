"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "@/components/shared/panel-card";
import { SirenModal } from "@/components/room/siren-modal";
import {
  appendSpeechToSession,
  clearMeetingSession,
  createMeetingSession,
  getAveragePangyoScore,
  loadMeetingSession,
  saveMeetingSession,
} from "@/lib/meeting-session";
import type { MeetingSession, SpeechLog } from "@/types/meeting";

function formatTime(dateValue: string) {
  return new Date(dateValue).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScoreLabel(score: number, hasLogs: boolean) {
  if (!hasLogs) {
    return "첫 발화를 기다리는 중입니다.";
  }

  if (score >= 90) {
    return "투자자 앞에서도 흔들리지 않는 판교어";
  }

  if (score >= 75) {
    return "충분히 살아남는 실무형 판교어";
  }

  if (score >= 45) {
    return "아슬아슬한 데모 통과권";
  }

  return "즉시 방화벽 개입이 필요한 위험 구간";
}

export function MeetingRoomScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nickname = searchParams.get("nickname")?.trim() ?? "";
  const roomCode = searchParams.get("room")?.trim() ?? "";

  const [session, setSession] = useState<MeetingSession | null>(null);
  const [speech, setSpeech] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeAlert, setActiveAlert] = useState<SpeechLog | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const storedSession = loadMeetingSession();

    if (nickname && roomCode) {
      const hasSameRoom =
        storedSession?.nickname === nickname &&
        storedSession?.roomCode === roomCode;
      const nextSession = hasSameRoom
        ? storedSession
        : createMeetingSession(nickname, roomCode);

      setSession(nextSession);
      saveMeetingSession(nextSession);
    } else if (storedSession) {
      setSession(storedSession);
    }

    setIsHydrated(true);
  }, [nickname, roomCode]);

  useEffect(() => {
    if (!activeAlert) {
      return undefined;
    }

    setIsMuted(true);

    const timer = window.setTimeout(() => {
      setIsMuted(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [activeAlert]);

  const averageScore = useMemo(() => {
    return session ? getAveragePangyoScore(session.logs) : 0;
  }, [session]);

  const latestBlockedEntry = useMemo(() => {
    return session?.logs.find((entry) => entry.isDangerous) ?? null;
  }, [session]);

  const latestEntry = session?.logs[0] ?? null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !speech.trim() || isMuted) {
      return;
    }

    const nextSession = appendSpeechToSession(session, speech.trim());
    const nextEntry = nextSession.logs[0];

    setSession(nextSession);
    saveMeetingSession(nextSession);
    setSpeech("");

    if (nextEntry.isDangerous) {
      setActiveAlert(nextEntry);
      return;
    }

    setActiveAlert(null);
  }

  function handleReset() {
    clearMeetingSession();
    router.push("/");
  }

  if (!isHydrated) {
    return null;
  }

  if (!session) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-6 py-16">
        <div className="glass-panel max-w-2xl rounded-[32px] border border-white/10 px-8 py-10 text-center">
          <p className="dashboard-title text-sm text-sky-200/80">
            No Active Room
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            아직 활성화된 회의방이 없습니다.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            메인 화면에서 닉네임과 방 코드를 입력한 뒤 회의방에 입장해주세요.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-sky-300 px-6 py-3 text-sm font-semibold text-slate-950"
          >
            메인으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      {isMuted ? (
        <div className="mute-curtain pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-6">
          <div className="rounded-[28px] border border-red-500/30 bg-red-950/80 px-8 py-6 text-center shadow-[0_0_80px_rgba(239,68,68,0.22)] backdrop-blur-md">
            <p className="dashboard-title text-sm text-red-200">Mic Muted</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              위험 발화 차단. AI가 대신 말하는 중입니다.
            </p>
          </div>
        </div>
      ) : null}

      <SirenModal entry={activeAlert} onClose={() => setActiveAlert(null)} />

      <main className="page-shell min-h-screen px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
          <header className="glass-panel grid-accent rounded-[32px] border border-white/10 px-8 py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="dashboard-title text-sm text-emerald-300">
                  Pangyo Firewall Live
                </p>
                <h1 className="mt-3 text-4xl font-semibold text-white lg:text-5xl">
                  Room {session.roomCode}
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  발표자 <span className="font-semibold text-white">{session.nickname}</span>
                  님의 발화를 판교어 기준으로 모니터링 중입니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/report"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/8 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/12"
                >
                  회의 리포트
                </Link>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/18"
                >
                  새 회의 시작
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="flex flex-col gap-6">
              <PanelCard
                title="Speech Console"
                subtitle="발화를 입력하고 제출하면 mock 판교어 분석기가 즉시 검사합니다."
              >
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <textarea
                    value={speech}
                    onChange={(event) => setSpeech(event.target.value)}
                    placeholder="예: 오늘 아젠다 기준으로 액션 아이템 얼라인해서 공유드릴게요."
                    rows={5}
                    disabled={isMuted}
                    className="min-h-[180px] w-full rounded-[24px] border border-white/10 bg-slate-950/85 px-5 py-5 text-base leading-8 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/45 disabled:opacity-60"
                  />

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-slate-400">
                      위험 발화가 감지되면 사이렌 모달과 자동 음소거 연출이 실행됩니다.
                    </p>
                    <button
                      type="submit"
                      disabled={!speech.trim() || isMuted}
                      className="inline-flex items-center justify-center rounded-[20px] bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      발화 제출
                    </button>
                  </div>
                </form>
              </PanelCard>

              <PanelCard
                title="Meeting Log"
                subtitle="최신 로그가 위에 쌓입니다. 차단된 발화는 빨간색, 통과 발화는 초록색으로 표시됩니다."
                className="flex-1"
              >
                <div className="max-h-[640px] space-y-4 overflow-y-auto pr-1">
                  {session.logs.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/3 px-5 py-8 text-center text-slate-400">
                      아직 로그가 없습니다. 첫 발화를 입력해보세요.
                    </div>
                  ) : (
                    session.logs.map((entry) => (
                      <article
                        key={entry.id}
                        className={`rounded-[24px] border p-5 ${
                          entry.isDangerous
                            ? "border-red-500/30 bg-red-950/28"
                            : "border-emerald-400/25 bg-emerald-950/18"
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                entry.isDangerous
                                  ? "bg-red-500/16 text-red-100"
                                  : "bg-emerald-500/16 text-emerald-100"
                              }`}
                            >
                              {entry.isDangerous ? "BLOCKED" : "PASS"}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatTime(entry.createdAt)}
                            </span>
                          </div>
                          <span className="dashboard-title text-xs text-slate-300">
                            Pangyo Score {entry.pangyoScore}
                          </span>
                        </div>

                        <p className="mt-4 text-base leading-8 text-white">
                          {entry.originalText}
                        </p>

                        {entry.isDangerous ? (
                          <div className="mt-4 rounded-[20px] border border-white/8 bg-white/6 p-4">
                            <p className="dashboard-title text-[11px] text-emerald-200/80">
                              AI Replacement
                            </p>
                            <p className="mt-2 text-sm leading-7 text-emerald-50">
                              {entry.finalText}
                            </p>
                          </div>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </PanelCard>
            </div>

            <div className="flex flex-col gap-6">
              <PanelCard
                title="Pangyo Score"
                subtitle="회의 전체 평균 점수와 최근 발화 상태를 한 번에 보여줍니다."
                accent={averageScore >= 70 ? "success" : "danger"}
              >
                <div className="grid gap-5 lg:grid-cols-[180px_1fr] lg:items-center">
                    <div className="score-ring mx-auto flex h-[180px] w-[180px] items-center justify-center rounded-full p-3">
                      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950/92 text-center">
                        <span className="dashboard-title text-xs text-sky-200/70">
                          Average
                        </span>
                      <strong className="mt-2 text-5xl font-semibold text-white">
                        {averageScore}
                      </strong>
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">
                      {getScoreLabel(averageScore, session.logs.length > 0)}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      최근 상태:{" "}
                      <span
                        className={
                          latestEntry?.isDangerous ? "text-red-200" : "text-emerald-200"
                        }
                      >
                        {latestEntry
                          ? latestEntry.isDangerous
                            ? "사이렌 발동"
                            : "정상 통과"
                          : "대기 중"}
                      </span>
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      총 {session.logs.length}개의 발화를 기준으로 산출됩니다.
                    </p>
                  </div>
                </div>
              </PanelCard>

              <PanelCard
                title="Participants"
                subtitle="Socket.IO 연동 이전 단계이므로 데모용 참가자 패널을 mock 데이터로 제공합니다."
              >
                <div className="space-y-3">
                  {session.participants.map((participant, index) => (
                    <div
                      key={participant}
                      className="flex items-center justify-between rounded-[20px] border border-white/8 bg-white/4 px-4 py-4"
                    >
                      <div>
                        <p className="font-medium text-white">{participant}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {index === 0 ? "Speaking Candidate" : "Monitoring"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          index === 0
                            ? "bg-sky-500/14 text-sky-100"
                            : "bg-white/8 text-slate-200"
                        }`}
                      >
                        {index === 0 ? "LIVE" : "ONLINE"}
                      </span>
                    </div>
                  ))}
                </div>
              </PanelCard>

              <PanelCard
                title="AI Replacement"
                subtitle="최근 차단된 발화가 있으면 대체 문장을 크게 보여줍니다."
                accent={latestBlockedEntry ? "danger" : "success"}
              >
                {latestBlockedEntry ? (
                  <div className="rounded-[24px] border border-red-500/20 bg-red-950/25 p-5">
                    <p className="text-sm leading-7 text-red-100">
                      원문: {latestBlockedEntry.originalText}
                    </p>
                    <p className="mt-4 text-lg leading-8 text-emerald-100">
                      {latestBlockedEntry.replacement}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-950/20 p-5 text-sm leading-7 text-emerald-50">
                    아직 차단된 발화가 없습니다. 지금 상태라면 자연스럽게 통과됩니다.
                  </div>
                )}
              </PanelCard>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
