import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth={1.85}
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" />
      <path d="M7 11a5 5 0 0 0 10 0" />
      <path d="M12 16v4" />
      <path d="M9 20h6" />
    </IconBase>
  );
}

export function MicOffIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 5 14 14" />
      <path d="M9.5 9.5V7a2.5 2.5 0 1 1 5 0v5a2.4 2.4 0 0 1-.2 1" />
      <path d="M7 11a5 5 0 0 0 8.3 3.7" />
      <path d="M12 16v4" />
      <path d="M9 20h6" />
    </IconBase>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4z" />
      <path d="m17 11 3-2v8l-3-2" />
    </IconBase>
  );
}

export function CameraOffIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4 4 16 16" />
      <path d="M6 8h8a2 2 0 0 1 2 2v4" />
      <path d="M10.5 6H15a2 2 0 0 1 2 2v1" />
      <path d="m17 11 3-2v8l-3-2" />
      <path d="M4 9v7a2 2 0 0 0 2 2h8" />
    </IconBase>
  );
}

export function WarningTriangleIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M12 3 2.6 20h18.8L12 3Zm-1 5h2v6h-2V8Zm0 8h2v2h-2v-2Z" />
    </svg>
  );
}

export function VolumeMuteIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 10h3l4-4v12l-4-4H5z" />
      <path d="m16 9 4 6" />
      <path d="m20 9-4 6" />
    </IconBase>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z" />
      <path d="M4.7 13.2v-2.4l2-.5.7-1.7-1.2-1.7 1.7-1.7 1.7 1.2 1.7-.7.5-2h2.4l.5 2 1.7.7 1.7-1.2 1.7 1.7-1.2 1.7.7 1.7 2 .5v2.4l-2 .5-.7 1.7 1.2 1.7-1.7 1.7-1.7-1.2-1.7.7-.5 2h-2.4l-.5-2-1.7-.7-1.7 1.2-1.7-1.7 1.2-1.7-.7-1.7-2-.5Z" />
    </IconBase>
  );
}

export function HelpCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="M9.4 9a2.8 2.8 0 1 1 4.5 2.2c-.8.6-1.4 1-1.4 2.1" />
      <path d="M12 17h.01" />
    </IconBase>
  );
}

export function SegmentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M8 12h12" />
      <path d="M10 17h10" />
    </IconBase>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 19V9" />
      <path d="M10 19V5" />
      <path d="M15 19v-7" />
      <path d="M20 19v-4" />
    </IconBase>
  );
}

export function RecordDotIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle cx="12" cy="12" r="6.5" />
    </svg>
  );
}

export function HangupIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M4.5 15.3c2.3-2.2 5-3.3 7.5-3.3s5.2 1.1 7.5 3.3l-1.8 3c-.3.5-.9.7-1.4.5l-3.2-1.3a1 1 0 0 0-.9.1l-1.2.8-1.2-.8a1 1 0 0 0-.9-.1l-3.2 1.3c-.6.2-1.2 0-1.4-.5l-1.8-3Z" />
    </svg>
  );
}

export function ExitDoorIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        d="M10.5 4.5H19a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 19.5h-8.5"
        stroke="currentColor"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="2.8"
      />
      <path
        d="M3.5 12h9.75"
        stroke="currentColor"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="2.8"
      />
      <path
        d="m9.8 7.2 4.8 4.8-4.8 4.8"
        stroke="currentColor"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="2.8"
      />
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12a8 8 0 1 0 2.3-5.7" />
      <path d="M4 5v4h4" />
      <path d="M12 8v4l2.5 2.5" />
    </IconBase>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="m18.5 4 1 2.5L22 7.5l-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" />
      <path d="m6 14 1 2.5L9.5 17 7 18l-1 2.5L5 18l-2.5-1L5 16.5 6 14Z" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="m8.5 12.2 2.2 2.3 4.8-5" />
    </IconBase>
  );
}
