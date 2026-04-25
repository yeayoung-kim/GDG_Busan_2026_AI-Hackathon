type PanelCardProps = {
  title: string;
  subtitle?: string;
  accent?: "neutral" | "success" | "danger";
  className?: string;
  children: React.ReactNode;
};

const accentClasses: Record<NonNullable<PanelCardProps["accent"]>, string> = {
  neutral: "border-white/10",
  success: "border-emerald-400/25 shadow-[0_0_0_1px_rgba(34,197,94,0.12)]",
  danger: "border-red-500/30 siren-stripes shadow-[0_0_0_1px_rgba(239,68,68,0.14)]",
};

export function PanelCard({
  title,
  subtitle,
  accent = "neutral",
  className = "",
  children,
}: PanelCardProps) {
  return (
    <section
      className={`glass-panel rounded-[28px] border p-6 ${accentClasses[accent]} ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="dashboard-title text-xs text-sky-200/70">{title}</p>
          {subtitle ? (
            <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

