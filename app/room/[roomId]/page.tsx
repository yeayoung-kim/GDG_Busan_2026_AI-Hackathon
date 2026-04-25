import { LiveRoomScreen } from "@/components/room/live-room-screen";

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
  searchParams: Promise<{
    name?: string;
  }>;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const [{ roomId }, resolvedSearchParams] = await Promise.all([params, searchParams]);

  return (
    <LiveRoomScreen
      roomId={roomId}
      participantName={resolvedSearchParams.name?.trim() ?? ""}
    />
  );
}
