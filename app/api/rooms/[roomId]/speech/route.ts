import { after, NextResponse } from "next/server";
import { analyzePangyoSpeech } from "@/lib/pangyo-analyzer";
import { analyzePangyoSpeechFallback } from "@/lib/pangyo/fallback";
import { synthesizePangyoSpeech } from "@/lib/server/google-tts";
import { appendSpeechLog, updateSpeechLog } from "@/lib/server/room-store";
import type {
  ModerationState,
  PangyoAnalysis,
  SpeechLogEntry,
} from "@/types/realtime";

export const runtime = "nodejs";

function estimateModerationDuration(text: string) {
  return Math.min(8_000, 2_800 + text.length * 90);
}

function buildModerationState(
  entryId: string,
  participantId: string,
  speakerName: string,
  transcript: string,
  analysis: PangyoAnalysis,
  startedAt: Date,
  voice: {
    source: "gcp" | "browser";
    audioBase64?: string;
    audioMimeType?: string;
  },
): ModerationState {
  const endsAt = new Date(
    startedAt.getTime() + estimateModerationDuration(analysis.rewrittenText),
  );

  return {
    id: entryId,
    sourceParticipantId: participantId,
    sourceParticipantName: speakerName,
    originalText: transcript,
    replacementText: analysis.rewrittenText,
    warning: "판교어 기준치 미달. 회의 톤을 재정렬합니다.",
    audioBase64: voice.audioBase64,
    audioMimeType: voice.audioMimeType,
    voiceSource: voice.source,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

function buildSpeechLogEntry(
  entryId: string,
  participantId: string,
  speakerName: string,
  transcript: string,
  analysis: PangyoAnalysis,
  createdAt: Date,
): SpeechLogEntry {
  return {
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
    createdAt: createdAt.toISOString(),
  };
}

function queueBlockedSpeechEnhancement({
  roomId,
  entryId,
  participantId,
  speakerName,
  transcript,
  startedAt,
  initialAnalysis,
  shouldRefineText,
}: {
  roomId: string;
  entryId: string;
  participantId: string;
  speakerName: string;
  transcript: string;
  startedAt: Date;
  initialAnalysis: PangyoAnalysis;
  shouldRefineText: boolean;
}) {
  after(async () => {
    try {
      const analysis = shouldRefineText
        ? await analyzePangyoSpeech(transcript)
        : initialAnalysis;

      if (analysis.status !== "blocked") {
        return;
      }

      const tts = await synthesizePangyoSpeech(analysis.rewrittenText);
      const moderation = buildModerationState(
        entryId,
        participantId,
        speakerName,
        transcript,
        analysis,
        startedAt,
        tts,
      );
      const moderationStillActive = Date.now() < new Date(moderation.endsAt).getTime();

      updateSpeechLog(
        roomId,
        entryId,
        {
          deliveredText: analysis.rewrittenText,
          pangyoScore: analysis.pangyoScore,
          status: analysis.status,
          matchedKeywords: analysis.matchedKeywords,
          reason: analysis.reason,
        },
        moderationStillActive ? moderation : null,
      );
    } catch (error) {
      console.error("speech enhancement failed", error);
    }
  });
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

  const now = new Date();
  const entryId = crypto.randomUUID();
  const fallbackAnalysis = analyzePangyoSpeechFallback(transcript);

  if (fallbackAnalysis.status === "blocked") {
    const entry = buildSpeechLogEntry(
      entryId,
      participantId,
      speakerName,
      transcript,
      fallbackAnalysis,
      now,
    );
    const moderation = buildModerationState(
      entryId,
      participantId,
      speakerName,
      transcript,
      fallbackAnalysis,
      now,
      {
        source: "browser",
      },
    );
    const result = appendSpeechLog(roomId, entry, moderation);

    queueBlockedSpeechEnhancement({
      roomId,
      entryId,
      participantId,
      speakerName,
      transcript,
      startedAt: now,
      initialAnalysis: fallbackAnalysis,
      shouldRefineText: true,
    });

    return NextResponse.json(
      {
        ...result,
        analysis: fallbackAnalysis,
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

  const analysis = await analyzePangyoSpeech(transcript);
  const entry = buildSpeechLogEntry(
    entryId,
    participantId,
    speakerName,
    transcript,
    analysis,
    now,
  );
  let moderation: ModerationState | null = null;

  if (analysis.status === "blocked") {
    moderation = buildModerationState(
      entryId,
      participantId,
      speakerName,
      transcript,
      analysis,
      now,
      {
        source: "browser",
      },
    );

    queueBlockedSpeechEnhancement({
      roomId,
      entryId,
      participantId,
      speakerName,
      transcript,
      startedAt: now,
      initialAnalysis: analysis,
      shouldRefineText: false,
    });
  }

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
