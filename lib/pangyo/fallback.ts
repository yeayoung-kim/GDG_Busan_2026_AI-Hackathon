import { extractPangyoKeywords, matchPangyoDictionary } from "@/lib/pangyo/dictionary";
import type { PangyoAnalysis } from "@/types/realtime";

interface HardBlockRewrite {
  patterns: string[];
  rewrite: string;
}

interface IntentTemplate {
  patterns: string[];
  build: (keywords: string[]) => string;
}

const hardBlockRewrites: HardBlockRewrite[] = [
  {
    patterns: ["몰라요", "모르겠어요", "잘 모르겠"],
    rewrite:
      "필요한 팩트부터 빠르게 확인하고 액션 아이템으로 다시 공유드리겠습니다.",
  },
  {
    patterns: ["못 해요", "못합니다", "어려워요"],
    rewrite:
      "현재 리소스 기준으로는 바로 확정이 어려워서, 우선순위 얼라인 후 실행 가능한 대안으로 다시 말씀드릴게요.",
  },
  {
    patterns: ["안 돼요", "안됩니다", "불가능해요"],
    rewrite:
      "지금 방식은 리스크가 있어서, 임팩트를 유지할 다른 옵션으로 다시 얼라인해보겠습니다.",
  },
  {
    patterns: ["싫어요", "별로예요", "별로에요"],
    rewrite:
      "이 안은 효율 대비 임팩트가 낮아서, 더 설득력 있는 옵션으로 다시 비교해보겠습니다.",
  },
  {
    patterns: ["그냥", "대충"],
    rewrite:
      "우선 가설과 스코프를 먼저 얼라인하고, 가장 임팩트 있는 방향으로 빠르게 가져가겠습니다.",
  },
  {
    patterns: ["버그예요", "버그에요", "오류예요", "에러예요"],
    rewrite:
      "이슈는 재현 경로와 영향 범위를 먼저 드릴다운하고, 우선순위 기준으로 핫픽스 플랜 공유드릴게요.",
  },
];

const intentTemplates: IntentTemplate[] = [
  {
    patterns: ["회의", "안건", "논의", "정리", "요약"],
    build: (keywords) =>
      `이 안건은 ${keywords[0] ?? "얼라인"} 기준으로 다시 정리하고 ${keywords[1] ?? "랩업"}까지 깔끔하게 가져가겠습니다.`,
  },
  {
    patterns: ["일정", "다음 주", "언제", "초대", "캘린더"],
    build: (keywords) =>
      `일정은 ${keywords[0] ?? "캘린더 인바이트"}로 바로 싱크 맞추고 킥오프 포인트까지 정리해둘게요.`,
  },
  {
    patterns: ["업무", "작업", "할 일", "책임", "담당", "배당"],
    build: (keywords) =>
      `이 건은 ${keywords[0] ?? "오너"}와 ${keywords[1] ?? "액션 아이템"}부터 정리해서 바로 가져가시죠.`,
  },
  {
    patterns: ["고객", "유저", "불편", "목표", "지표", "시장", "확장"],
    build: (keywords) =>
      `유저 ${keywords[0] ?? "페인 포인트"}와 ${keywords[1] ?? "북극성 지표"} 기준으로 다시 얼라인해보죠.`,
  },
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function isSentenceLike(text: string) {
  return /(?:[.!?]|요|죠|니다|습니다|할게요|하겠습니다|하시죠)$/.test(text);
}

function buildGenericRewrite(text: string) {
  const matchedEntries = matchPangyoDictionary(text);

  if (matchedEntries.length > 0) {
    return matchedEntries[0]?.rewrite ?? text;
  }

  const keywords = extractPangyoKeywords(text);
  const template = intentTemplates.find((entry) =>
    entry.patterns.some((pattern) => text.includes(pattern)),
  );

  if (template) {
    return template.build(keywords);
  }

  return `이 건은 ${keywords[0] ?? "얼라인"} 기준으로 다시 정리하고 ${keywords[1] ?? "액션 아이템"}까지 바로 공유드리겠습니다.`;
}

export function analyzePangyoSpeechFallback(input: string): PangyoAnalysis {
  const text = normalizeWhitespace(input);
  const dictionaryMatches = matchPangyoDictionary(text);
  const pangyoKeywords = extractPangyoKeywords(text);
  const hardBlock = hardBlockRewrites.find((entry) =>
    entry.patterns.some((pattern) => text.includes(pattern)),
  );
  const fragmentPenalty = isSentenceLike(text) ? 0 : 10;

  if (hardBlock) {
    return {
      status: "blocked",
      pangyoScore: clampScore(18 + pangyoKeywords.length * 6),
      matchedKeywords: extractPangyoKeywords(hardBlock.rewrite),
      originalText: text,
      rewrittenText: hardBlock.rewrite,
      reason: "직설적이거나 건조한 표현이라 판교어 톤으로 재정렬했습니다.",
    };
  }

  const passScore = clampScore(
    28 +
      pangyoKeywords.length * 18 +
      dictionaryMatches.length * 10 +
      (isSentenceLike(text) ? 12 : 0) -
      fragmentPenalty,
  );
  const isPass =
    pangyoKeywords.length >= 2 &&
    isSentenceLike(text) &&
    !dictionaryMatches.some((entry) => entry.rewrite !== text);

  if (isPass) {
    return {
      status: "pass",
      pangyoScore: passScore,
      matchedKeywords: pangyoKeywords,
      originalText: text,
      rewrittenText: text,
      reason: "이미 판교어 톤과 문장 완성도가 충분합니다.",
    };
  }

  const rewrittenText = buildGenericRewrite(text);

  return {
    status: "blocked",
    pangyoScore: clampScore(passScore - 16),
    matchedKeywords: extractPangyoKeywords(rewrittenText),
    originalText: text,
    rewrittenText,
    reason:
      dictionaryMatches.length > 0
        ? "판교어 사전 기준으로 더 자연스러운 회의체 문장으로 보정했습니다."
        : "의도를 유지하면서 TTS용 판교어 문장으로 완성했습니다.",
  };
}
