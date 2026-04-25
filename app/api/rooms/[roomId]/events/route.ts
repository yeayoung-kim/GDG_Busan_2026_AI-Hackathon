import { NextResponse } from "next/server";
import { readRoomEvents } from "@/lib/server/room-store";
import type { RoomEventsResponse } from "@/types/realtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;
  const { searchParams } = new URL(request.url);
  const participantId = searchParams.get("participantId")?.trim();
  const cursor = Number(searchParams.get("cursor") ?? "0");

  if (!participantId) {
    return NextResponse.json(
      { message: "participantId가 필요합니다." },
      { status: 400 },
    );
  }

  const snapshot = readRoomEvents(roomId, participantId, Number.isNaN(cursor) ? 0 : cursor);
  const body: RoomEventsResponse = {
    cursor: snapshot.cursor,
    events: snapshot.events,
    room: snapshot.room,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
