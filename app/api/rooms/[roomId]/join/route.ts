import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/server/room-store";
import type { JoinRoomResponse } from "@/types/realtime";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const payload = (await request.json()) as {
      participantId?: string;
      participantName?: string;
    };
    const participantId = payload.participantId?.trim();
    const participantName = payload.participantName?.trim();

    if (!participantId || !participantName) {
      return NextResponse.json(
        { message: "participantId와 participantName이 필요합니다." },
        { status: 400 },
      );
    }

    const joined = joinRoom(roomId, participantId, participantName);
    const body: JoinRoomResponse = {
      cursor: joined.cursor,
      role: joined.self.role,
      room: joined.room,
      self: joined.self,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "입장 처리 중 오류가 발생했습니다.";

    return NextResponse.json({ message }, { status: 400 });
  }
}
