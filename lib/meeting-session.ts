import { analyzePangyoSpeech } from "@/lib/pangyo-analyzer";
import type {
  MeetingReport,
  MeetingSession,
  SpeechAnalysis,
  SpeechLog,
} from "@/types/meeting";

const STORAGE_KEY = "pangyo-firewall/current-session";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `speech-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function createMeetingSession(
  nickname: string,
  roomCode: string,
): MeetingSession {
  const now = nowIso();

  return {
    nickname,
    roomCode,
    createdAt: now,
    updatedAt: now,
    logs: [],
    participants: [
      nickname,
      "AI Firewall",
      "Biz Ops Observer",
      "TTS Bridge",
    ],
  };
}

export function createSpeechLog(
  message: string,
  analysis: SpeechAnalysis,
): SpeechLog {
  return {
    id: makeId(),
    originalText: message,
    finalText: analysis.replacement ?? message,
    pangyoScore: analysis.pangyoScore,
    isDangerous: analysis.isDangerous,
    replacement: analysis.replacement,
    matchedPhrase: analysis.matchedPhrase,
    createdAt: nowIso(),
    status: analysis.isDangerous ? "blocked" : "safe",
  };
}

export function appendSpeechToSession(
  session: MeetingSession,
  message: string,
): MeetingSession {
  const analysis = analyzePangyoSpeech(message);
  const nextLog = createSpeechLog(message, analysis);

  return {
    ...session,
    logs: [nextLog, ...session.logs],
    updatedAt: nowIso(),
  };
}

export function getAveragePangyoScore(logs: SpeechLog[]) {
  if (logs.length === 0) {
    return 0;
  }

  const total = logs.reduce((sum, log) => sum + log.pangyoScore, 0);

  return Math.round(total / logs.length);
}

export function buildMeetingReport(session: MeetingSession): MeetingReport {
  const blockedLogs = session.logs.filter((log) => log.isDangerous);
  const averagePangyoScore = getAveragePangyoScore(session.logs);
  const mostDangerousSpeech = [...session.logs].sort(
    (left, right) => left.pangyoScore - right.pangyoScore,
  )[0];

  let finalVerdict = "판교어 방화벽이 정상 작동 중입니다. 데모 안정권입니다.";

  if (session.logs.length === 0) {
    finalVerdict = "아직 분석된 발화가 없습니다. 첫 발화를 던져서 방화벽을 깨워보세요.";
  } else if (blockedLogs.length >= 3) {
    finalVerdict =
      "위험 발화가 누적되고 있습니다. 지금은 방화벽이 팀의 생명줄입니다.";
  } else if (averagePangyoScore >= 88) {
    finalVerdict =
      "판교 네이티브 레벨입니다. 투자자 데모에서도 자신 있게 밀 수 있습니다.";
  } else if (averagePangyoScore >= 72) {
    finalVerdict =
      "안정적인 MVP 수준입니다. 몇 문장만 더 다듬으면 훨씬 설득력이 올라갑니다.";
  }

  return {
    totalSpeeches: session.logs.length,
    blockedSpeeches: blockedLogs.length,
    averagePangyoScore,
    mostDangerousSpeech,
    finalVerdict,
  };
}

export function loadMeetingSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as MeetingSession;
  } catch {
    return null;
  }
}

export function saveMeetingSession(session: MeetingSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearMeetingSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

