import type {
  ModerationState,
  ParticipantDeviceState,
  RoomParticipant,
  RoomSnapshot,
  SignalEvent,
  SignalKind,
  SpeechLogEntry,
} from "@/types/realtime";

interface StoredRoom {
  roomId: string;
  participants: RoomParticipant[];
  logs: SpeechLogEntry[];
  moderation: ModerationState | null;
  signals: SignalEvent[];
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

const PARTICIPANT_STALE_MS = 30_000;
const EMPTY_ROOM_TTL_MS = 5 * 60_000;
const MODERATION_PADDING_MS = 400;
const MAX_LOGS = 40;
const MAX_SIGNALS = 200;

function getStore() {
  const globalStore = globalThis as typeof globalThis & {
    __alignAiRoomStore?: Map<string, StoredRoom>;
  };

  if (!globalStore.__alignAiRoomStore) {
    globalStore.__alignAiRoomStore = new Map<string, StoredRoom>();
  }

  return globalStore.__alignAiRoomStore;
}

function nowIso() {
  return new Date().toISOString();
}

function createRoom(roomId: string): StoredRoom {
  const now = nowIso();

  return {
    roomId,
    participants: [],
    logs: [],
    moderation: null,
    signals: [],
    sequence: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeRoles(room: StoredRoom) {
  const ordered = [...room.participants].sort((left, right) =>
    left.joinedAt.localeCompare(right.joinedAt),
  );

  room.participants = ordered.map((participant, index) => ({
    ...participant,
    role: index === 0 ? "host" : "guest",
  }));
}

function touchRoom(room: StoredRoom) {
  room.updatedAt = nowIso();
}

function pruneRoom(roomId: string, room: StoredRoom) {
  const now = Date.now();

  room.participants = room.participants.filter((participant) => {
    return now - new Date(participant.lastSeenAt).getTime() < PARTICIPANT_STALE_MS;
  });

  normalizeRoles(room);

  if (
    room.participants.length === 0 &&
    now - new Date(room.updatedAt).getTime() > EMPTY_ROOM_TTL_MS
  ) {
    getStore().delete(roomId);
    return null;
  }

  if (
    room.moderation &&
    now > new Date(room.moderation.endsAt).getTime() + MODERATION_PADDING_MS
  ) {
    room.moderation = null;
  }

  return room;
}

function getOrCreateRoom(roomId: string) {
  const store = getStore();
  const existing = store.get(roomId);

  if (existing) {
    return pruneRoom(roomId, existing) ?? createAndStore(roomId);
  }

  return createAndStore(roomId);
}

function createAndStore(roomId: string) {
  const room = createRoom(roomId);
  getStore().set(roomId, room);
  return room;
}

function snapshotRoom(room: StoredRoom): RoomSnapshot {
  return {
    roomId: room.roomId,
    participants: [...room.participants],
    logs: [...room.logs],
    moderation: room.moderation,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

export function sanitizeRoomId(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 18);
}

export function joinRoom(roomId: string, participantId: string, name: string) {
  const normalizedRoomId = sanitizeRoomId(roomId);

  if (!normalizedRoomId) {
    throw new Error("유효한 방 코드가 필요합니다.");
  }

  const room = getOrCreateRoom(normalizedRoomId);
  const now = nowIso();
  const existing = room.participants.find(
    (participant) => participant.id === participantId,
  );

  if (!existing && room.participants.length >= 2) {
    throw new Error("이 데모는 최대 2명까지만 입장할 수 있습니다.");
  }

  if (existing) {
    existing.name = name;
    existing.lastSeenAt = now;
  } else {
    room.participants.push({
      id: participantId,
      name,
      role: room.participants.length === 0 ? "host" : "guest",
      joinedAt: now,
      lastSeenAt: now,
      microphoneEnabled: true,
      cameraEnabled: true,
    });
  }

  normalizeRoles(room);
  touchRoom(room);

  const self = room.participants.find((participant) => participant.id === participantId);

  if (!self) {
    throw new Error("참가자 정보를 생성하지 못했습니다.");
  }

  return {
    cursor: room.sequence,
    room: snapshotRoom(room),
    self,
  };
}

export function leaveRoom(roomId: string, participantId: string) {
  const normalizedRoomId = sanitizeRoomId(roomId);
  const store = getStore();
  const room = store.get(normalizedRoomId);

  if (!room) {
    return null;
  }

  room.participants = room.participants.filter(
    (participant) => participant.id !== participantId,
  );
  normalizeRoles(room);
  touchRoom(room);

  if (room.participants.length === 0) {
    room.moderation = null;
  }

  return snapshotRoom(room);
}

export function updateParticipantDeviceState(
  roomId: string,
  participantId: string,
  state: Partial<ParticipantDeviceState>,
) {
  const normalizedRoomId = sanitizeRoomId(roomId);
  const room = getOrCreateRoom(normalizedRoomId);
  const participant = room.participants.find((entry) => entry.id === participantId);

  if (!participant) {
    throw new Error("참가자를 찾을 수 없습니다.");
  }

  participant.lastSeenAt = nowIso();
  participant.microphoneEnabled =
    state.microphoneEnabled ?? participant.microphoneEnabled;
  participant.cameraEnabled = state.cameraEnabled ?? participant.cameraEnabled;
  touchRoom(room);

  return {
    cursor: room.sequence,
    room: snapshotRoom(room),
  };
}

export function queueSignal(
  roomId: string,
  fromParticipantId: string,
  targetParticipantId: string,
  kind: SignalKind,
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
) {
  const normalizedRoomId = sanitizeRoomId(roomId);
  const room = getOrCreateRoom(normalizedRoomId);

  room.sequence += 1;
  room.signals.push({
    id: room.sequence,
    kind,
    fromParticipantId,
    targetParticipantId,
    payload,
    createdAt: nowIso(),
  });
  room.signals = room.signals.slice(-MAX_SIGNALS);
  touchRoom(room);

  return {
    cursor: room.sequence,
    room: snapshotRoom(room),
  };
}

export function readRoomEvents(
  roomId: string,
  participantId: string,
  cursor: number,
) {
  const normalizedRoomId = sanitizeRoomId(roomId);
  const room = getOrCreateRoom(normalizedRoomId);
  const participant = room.participants.find((entry) => entry.id === participantId);

  if (participant) {
    participant.lastSeenAt = nowIso();
  }

  touchRoom(room);

  return {
    cursor: room.sequence,
    events: room.signals.filter((signal) => {
      return signal.id > cursor && signal.targetParticipantId === participantId;
    }),
    room: snapshotRoom(room),
  };
}

export function appendSpeechLog(
  roomId: string,
  entry: SpeechLogEntry,
  moderation: ModerationState | null,
) {
  const normalizedRoomId = sanitizeRoomId(roomId);
  const room = getOrCreateRoom(normalizedRoomId);

  room.logs = [entry, ...room.logs].slice(0, MAX_LOGS);
  room.moderation = moderation;
  touchRoom(room);

  return {
    cursor: room.sequence,
    room: snapshotRoom(room),
  };
}
