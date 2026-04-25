import type { SpeechLog } from "@/types/meeting";

type SirenModalProps = {
  entry: SpeechLog | null;
  onClose: () => void;
};

export function SirenModal({ entry, onClose }: SirenModalProps) {
  if (!entry) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-6 backdrop-blur-sm">
      <div className="animate-siren glass-panel siren-stripes w-full max-w-2xl rounded-[36px] border border-red-500/35 p-8 shadow-[0_0_80px_rgba(239,68,68,0.18)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="dashboard-title text-sm text-red-200">Siren Triggered</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              위험 발화가 감지되어 자동 음소거되었습니다.
            </h2>
            <p className="mt-4 text-base leading-7 text-red-50/85">
              감지 표현:{" "}
              <span className="rounded-full border border-red-300/30 bg-red-500/15 px-3 py-1 text-sm">
                {entry.matchedPhrase}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/12"
          >
            닫기
          </button>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="rounded-[24px] border border-red-500/25 bg-red-950/35 p-5">
            <p className="dashboard-title text-xs text-red-200/80">Original</p>
            <p className="mt-3 text-lg leading-8 text-red-50">
              {entry.originalText}
            </p>
          </article>
          <article className="rounded-[24px] border border-emerald-400/25 bg-emerald-950/25 p-5">
            <p className="dashboard-title text-xs text-emerald-200/80">
              AI Replacement
            </p>
            <p className="mt-3 text-lg leading-8 text-emerald-50">
              {entry.replacement}
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}

