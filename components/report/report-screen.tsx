"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "@/components/shared/panel-card";
import { buildMeetingReport, loadMeetingSession } from "@/lib/meeting-session";
import type { MeetingSession } from "@/types/meeting";

function getVerdictAccent(score: number) {
  if (score >= 80) {
    return "success" as const;
  }

  return "danger" as const;
}

export function ReportScreen() {
  const [session, setSession] = useState<MeetingSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setSession(loadMeetingSession());
    setIsHydrated(true);
  }, []);

  const report = useMemo(() => {
    return session ? buildMeetingReport(session) : null;
  }, [session]);

  if (!isHydrated) {
    return null;
  }

  if (!session || !report) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-6 py-16">
        <div className="glass-panel max-w-2xl rounded-[32px] border border-white/10 px-8 py-10 text-center">
          <p className="dashboard-title text-sm text-sky-200/80">
            Empty Report
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            아직 리포트를 만들 발화가 없습니다.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            메인 화면에서 회의방에 입장한 뒤 몇 개의 발화를 제출하면 리포트가
            채워집니다.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-sky-300 px-6 py-3 text-sm font-semibold text-slate-950"
          >
            메인으로 이동
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        <header className="glass-panel grid-accent rounded-[32px] border border-white/10 px-8 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="dashboard-title text-sm text-emerald-300">
                Meeting Report
              </p>
              <h1 className="mt-3 text-4xl font-semibold text-white lg:text-5xl">
                Pangyo Firewall 회의 리포트
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-300">
                룸 코드 {session.roomCode} / 발표자{" "}
                <span className="font-semibold text-white">{session.nickname}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/room"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/8 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/12"
              >
                회의방으로 복귀
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-sky-300 px-5 py-3 text-sm font-semibold text-slate-950"
              >
                새 회의 시작
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-4">
          {[
            {
              label: "총 발화 수",
              value: report.totalSpeeches,
              tone: "text-white",
            },
            {
              label: "차단된 발화 수",
              value: report.blockedSpeeches,
              tone: "text-red-200",
            },
            {
              label: "평균 Pangyo Score",
              value: report.averagePangyoScore,
              tone: "text-emerald-200",
            },
            {
              label: "참가자 수",
              value: session.participants.length,
              tone: "text-sky-200",
            },
          ].map((metric) => (
            <PanelCard key={metric.label} title={metric.label} className="h-full">
              <div className={`text-5xl font-semibold ${metric.tone}`}>
                {metric.value}
              </div>
            </PanelCard>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <PanelCard
            title="Final Verdict"
            subtitle="평균 점수와 차단 횟수를 종합해 데모 안정성을 평가합니다."
            accent={getVerdictAccent(report.averagePangyoScore)}
          >
            <div className="rounded-[28px] border border-white/10 bg-slate-950/65 p-6">
              <p className="text-2xl font-semibold leading-10 text-white">
                {report.finalVerdict}
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                차단 비율은{" "}
                <span className="font-semibold text-white">
                  {report.totalSpeeches === 0
                    ? 0
                    : Math.round((report.blockedSpeeches / report.totalSpeeches) * 100)}
                  %
                </span>
                이고, 지금 단계에서는 mock 룰 기반 분석기로 동작합니다.
              </p>
            </div>
          </PanelCard>

          <PanelCard
            title="Most Dangerous Speech"
            subtitle="가장 낮은 Pangyo Score를 기록한 발화를 강조해서 보여줍니다."
            accent={report.mostDangerousSpeech?.isDangerous ? "danger" : "neutral"}
          >
            {report.mostDangerousSpeech ? (
              <div className="space-y-4">
                <article className="rounded-[24px] border border-red-500/18 bg-red-950/22 p-5">
                  <p className="dashboard-title text-xs text-red-200/75">
                    Original
                  </p>
                  <p className="mt-3 text-lg leading-8 text-white">
                    {report.mostDangerousSpeech.originalText}
                  </p>
                </article>
                <article className="rounded-[24px] border border-emerald-400/18 bg-emerald-950/22 p-5">
                  <p className="dashboard-title text-xs text-emerald-200/75">
                    Replacement
                  </p>
                  <p className="mt-3 text-lg leading-8 text-emerald-50">
                    {report.mostDangerousSpeech.finalText}
                  </p>
                </article>
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-5 text-slate-300">
                기록된 발화가 없어 아직 위험 문장을 집계할 수 없습니다.
              </div>
            )}
          </PanelCard>
        </div>

        <PanelCard
          title="Transcript Snapshot"
          subtitle="최신 회의 로그를 리포트 화면에서도 다시 확인할 수 있습니다."
        >
          <div className="space-y-4">
            {session.logs.map((entry) => (
              <article
                key={entry.id}
                className={`rounded-[22px] border p-5 ${
                  entry.isDangerous
                    ? "border-red-500/24 bg-red-950/22"
                    : "border-emerald-400/22 bg-emerald-950/16"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="font-medium text-white">{entry.originalText}</p>
                  <span className="dashboard-title text-xs text-slate-300">
                    Score {entry.pangyoScore}
                  </span>
                </div>
                {entry.replacement ? (
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    AI 대체 발화: {entry.replacement}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </PanelCard>
      </div>
    </main>
  );
}

