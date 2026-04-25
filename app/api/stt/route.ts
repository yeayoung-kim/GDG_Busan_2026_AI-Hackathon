import { NextResponse } from "next/server";
import { transcribeShortAudio } from "@/lib/server/google-stt";

export const runtime = "nodejs";

const MAX_INLINE_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_SYNC_AUDIO_DURATION_MS = 60_000;

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function shouldIgnoreTranscript(text: string) {
  const condensed = text.replace(/[\s\p{P}\p{S}]+/gu, "");
  return condensed.length < 2;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get("audio");
  const durationMs = Number(formData.get("durationMs") ?? "0");

  if (!(audio instanceof Blob)) {
    return NextResponse.json(
      { message: "audio 파일이 필요합니다." },
      { status: 400 },
    );
  }

  if (audio.size === 0) {
    return NextResponse.json({
      durationMs: Number.isFinite(durationMs) ? durationMs : 0,
      ignored: true,
      transcript: "",
    });
  }

  if (audio.size > MAX_INLINE_AUDIO_BYTES) {
    return NextResponse.json(
      { message: "오디오 길이가 너무 깁니다. 1분 이내의 짧은 발화만 전사할 수 있습니다." },
      { status: 400 },
    );
  }

  if (Number.isFinite(durationMs) && durationMs > MAX_SYNC_AUDIO_DURATION_MS) {
    return NextResponse.json(
      { message: "오디오 길이가 너무 깁니다. 1분 이내로 다시 시도해 주세요." },
      { status: 400 },
    );
  }

  try {
    const transcriptResult = await transcribeShortAudio(await audio.arrayBuffer());
    const transcript = normalizeWhitespace(transcriptResult?.transcript ?? "");
    const ignored = !transcript || shouldIgnoreTranscript(transcript);

    return NextResponse.json({
      durationMs: Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0,
      ignored,
      transcript: ignored ? "" : transcript,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "음성 전사 처리에 실패했습니다.";
    const status =
      /Cloud STT 인증|ADC|project|권한/.test(message) ? 503 : 502;

    return NextResponse.json({ message }, { status });
  }
}
