import { NextResponse } from "next/server";
import { updateParticipantDeviceState } from "@/lib/server/room-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    const payload = (await request.json()) as {
      participantId?: string;
      microphoneEnabled?: boolean;
      cameraEnabled?: boolean;
    };
    const participantId = payload.participantId?.trim();

    if (!participantId) {
      return NextResponse.json(
        { message: "participantId가 필요합니다." },
        { status: 400 },
      );
    }

    const result = updateParticipantDeviceState(roomId, participantId, {
      microphoneEnabled: payload.microphoneEnabled,
      cameraEnabled: payload.cameraEnabled,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "장치 상태 갱신에 실패했습니다.";

    return NextResponse.json({ message }, { status: 400 });
  }
}
