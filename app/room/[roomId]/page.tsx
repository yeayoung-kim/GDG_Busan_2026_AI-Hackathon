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
  const participantName = resolvedSearchParams.name?.trim() || "USER_GUEST";

  return (
    <LiveRoomScreen roomId={roomId} participantName={participantName} />
  );
}
