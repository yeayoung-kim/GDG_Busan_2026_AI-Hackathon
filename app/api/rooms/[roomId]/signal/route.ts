import { NextResponse } from "next/server";
import { queueSignal } from "@/lib/server/room-store";
import type { SignalKind } from "@/types/realtime";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;
  const payload = (await request.json()) as {
    participantId?: string;
    targetParticipantId?: string;
    kind?: SignalKind;
    signal?: RTCSessionDescriptionInit | RTCIceCandidateInit;
  };

  const participantId = payload.participantId?.trim();
  const targetParticipantId = payload.targetParticipantId?.trim();
  const kind = payload.kind;
  const signal = payload.signal;

  if (!participantId || !targetParticipantId || !kind || !signal) {
    return NextResponse.json(
      { message: "participantId, targetParticipantId, kind, signal이 필요합니다." },
      { status: 400 },
    );
  }

  const result = queueSignal(roomId, participantId, targetParticipantId, kind, signal);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
