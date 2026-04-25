import { NextResponse } from "next/server";
import { analyzePangyoSpeech } from "@/lib/pangyo-analyzer";
import { synthesizePangyoSpeech } from "@/lib/server/google-tts";
import { appendSpeechLog } from "@/lib/server/room-store";
import type { ModerationState, SpeechLogEntry } from "@/types/realtime";

export const runtime = "nodejs";

function estimateModerationDuration(text: string) {
  return Math.min(8_000, 2_800 + text.length * 90);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;
  const payload = (await request.json()) as {
    participantId?: string;
    speakerName?: string;
    transcript?: string;
  };

  const participantId = payload.participantId?.trim();
  const speakerName = payload.speakerName?.trim();
  const transcript = payload.transcript?.trim();

  if (!participantId || !speakerName || !transcript) {
    return NextResponse.json(
      { message: "participantId, speakerName, transcript가 필요합니다." },
      { status: 400 },
    );
  }

  const analysis = analyzePangyoSpeech(transcript);
  const now = new Date();
  const entryId = crypto.randomUUID();

  let moderation: ModerationState | null = null;

  if (analysis.status === "blocked") {
    const tts = await synthesizePangyoSpeech(analysis.rewrittenText);
    const endsAt = new Date(
      now.getTime() + estimateModerationDuration(analysis.rewrittenText),
    );

    moderation = {
      id: entryId,
      sourceParticipantId: participantId,
      sourceParticipantName: speakerName,
      originalText: transcript,
      replacementText: analysis.rewrittenText,
      warning: "판교어 기준치 미달. 회의 톤을 재정렬합니다.",
      audioBase64: tts.audioBase64,
      audioMimeType: tts.audioMimeType,
      voiceSource: tts.source,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
    };
  }

  const entry: SpeechLogEntry = {
    id: entryId,
    speakerId: participantId,
    speakerName,
    originalText: transcript,
    deliveredText:
      analysis.status === "blocked" ? analysis.rewrittenText : analysis.originalText,
    pangyoScore: analysis.pangyoScore,
    status: analysis.status,
    matchedKeywords: analysis.matchedKeywords,
    reason: analysis.reason,
    createdAt: now.toISOString(),
  };

  const result = appendSpeechLog(roomId, entry, moderation);

  return NextResponse.json(
    {
      ...result,
      analysis,
      entry,
      moderation,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
