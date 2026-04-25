import { NextResponse } from "next/server";
import { leaveRoom } from "@/lib/server/room-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;
  const payload = (await request.json()) as {
    participantId?: string;
  };
  const participantId = payload.participantId?.trim();

  if (!participantId) {
    return NextResponse.json(
      { message: "participantId가 필요합니다." },
      { status: 400 },
    );
  }

  const room = leaveRoom(roomId, participantId);

  return NextResponse.json(
    { room },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
