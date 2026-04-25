export type ModerationStatus = "pass" | "blocked";
export type ParticipantRole = "host" | "guest";

export interface PangyoAnalysis {
  status: ModerationStatus;
  pangyoScore: number;
  matchedKeywords: string[];
  originalText: string;
  rewrittenText: string;
  reason: string;
}

export interface ParticipantDeviceState {
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
}

export interface RoomParticipant extends ParticipantDeviceState {
  id: string;
  name: string;
  role: ParticipantRole;
  joinedAt: string;
  lastSeenAt: string;
}

export interface SpeechLogEntry {
  id: string;
  speakerId: string;
  speakerName: string;
  originalText: string;
  deliveredText: string;
  pangyoScore: number;
  status: ModerationStatus;
  matchedKeywords: string[];
  reason: string;
  createdAt: string;
}

export interface ModerationState {
  id: string;
  sourceParticipantId: string;
  sourceParticipantName: string;
  originalText: string;
  replacementText: string;
  warning: string;
  audioBase64?: string;
  audioMimeType?: string;
  voiceSource: "gcp" | "browser";
  startedAt: string;
  endsAt: string;
}

export interface RoomSnapshot {
  roomId: string;
  participants: RoomParticipant[];
  logs: SpeechLogEntry[];
  moderation: ModerationState | null;
  createdAt: string;
  updatedAt: string;
}

export interface JoinRoomResponse {
  cursor: number;
  role: ParticipantRole;
  room: RoomSnapshot;
  self: RoomParticipant;
}

export type SignalKind = "offer" | "answer" | "candidate";

export interface SignalEvent {
  id: number;
  kind: SignalKind;
  fromParticipantId: string;
  targetParticipantId: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  createdAt: string;
}

export interface RoomEventsResponse {
  cursor: number;
  events: SignalEvent[];
  room: RoomSnapshot;
}
