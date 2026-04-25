import { Suspense } from "react";
import { MeetingRoomScreen } from "@/components/room/meeting-room-screen";

function RoomLoading() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-6 py-16">
      <div className="glass-panel animate-float w-full max-w-xl rounded-[32px] border border-white/10 px-8 py-10 text-center">
        <p className="dashboard-title text-sm text-sky-200/80">
          Initializing Firewall
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          회의방 설정을 불러오는 중입니다.
        </h1>
      </div>
    </main>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<RoomLoading />}>
      <MeetingRoomScreen />
    </Suspense>
  );
}

