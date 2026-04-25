export type SpeechStatus = "safe" | "blocked";

export interface SpeechAnalysis {
  isDangerous: boolean;
  pangyoScore: number;
  replacement?: string;
  matchedPhrase?: string;
  reason: string;
}

export interface SpeechLog {
  id: string;
  originalText: string;
  finalText: string;
  pangyoScore: number;
  isDangerous: boolean;
  replacement?: string;
  matchedPhrase?: string;
  createdAt: string;
  status: SpeechStatus;
}

export interface MeetingSession {
  nickname: string;
  roomCode: string;
  participants: string[];
  logs: SpeechLog[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingReport {
  totalSpeeches: number;
  blockedSpeeches: number;
  averagePangyoScore: number;
  mostDangerousSpeech?: SpeechLog;
  finalVerdict: string;
}

