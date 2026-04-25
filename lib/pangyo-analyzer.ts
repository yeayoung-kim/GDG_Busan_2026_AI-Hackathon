import type { PangyoAnalysis } from "@/types/realtime";

const mandatoryPangyoLexicon = [
  "얼라인",
  "싱크",
  "액션 아이템",
  "임팩트",
  "오너십",
  "로드맵",
  "스코프",
  "우선순위",
  "레버리지",
  "핸드오프",
  "컨텍스트",
  "블로커",
  "아젠다",
  "아웃컴",
  "리스크",
  "드릴다운",
  "비저빌리티",
  "온보딩",
];

const structuralBoostLexicon = [
  "공유드리겠습니다",
  "정리하겠습니다",
  "확인해보겠습니다",
  "기준으로",
  "실행 가능한",
  "빠르게",
  "우선",
  "정렬",
  "전달드리겠습니다",
  "논의",
  "플랜",
];

const hardBlockPhrases = [
  {
    phrase: "몰라요",
    rewrite:
      "현재는 필요한 팩트가 충분히 확보되지 않았습니다. 확인 범위를 빠르게 정리한 뒤 액션 아이템으로 공유드리겠습니다.",
  },
  {
    phrase: "못 해요",
    rewrite:
      "현재 리소스 기준으로는 바로 확정이 어렵습니다. 대신 스코프를 다시 얼라인해서 실행 가능한 대안을 제안드리겠습니다.",
  },
  {
    phrase: "안 돼요",
    rewrite:
      "지금 방식은 리스크가 커 보여서, 임팩트를 유지하는 다른 경로로 정렬해보겠습니다.",
  },
  {
    phrase: "싫어요",
    rewrite:
      "지금 안은 효율 대비 임팩트가 낮아 보여서, 더 설득력 있는 옵션으로 다시 비교 정리하겠습니다.",
  },
  {
    phrase: "이 회의 왜 해요",
    rewrite:
      "회의 목적과 의사결정 포인트를 먼저 얼라인하고, 필요한 아젠다만 남겨서 다시 진행하겠습니다.",
  },
  {
    phrase: "그냥",
    rewrite:
      "현재 가설을 기준으로 우선순위를 정리하고, 검증 가능한 포인트부터 빠르게 진행하겠습니다.",
  },
  {
    phrase: "대충",
    rewrite:
      "퀄리티 기준과 일정 범위를 먼저 얼라인한 뒤, 납기 안에서 가장 임팩트 있는 결과로 정리하겠습니다.",
  },
  {
    phrase: "버그예요",
    rewrite:
      "이슈는 재현 경로와 영향 범위를 먼저 드릴다운하고, 우선순위 기준으로 핫픽스 플랜을 공유드리겠습니다.",
  },
  {
    phrase: "별로",
    rewrite:
      "현재 안은 사용자 임팩트가 약합니다. 가설과 메시지를 다시 정렬해서 더 선명한 방향으로 제안드리겠습니다.",
  },
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function sliceContext(text: string) {
  return text.length > 26 ? `${text.slice(0, 26)}...` : text;
}

function buildRewrite(originalText: string, pangyoHits: string[]) {
  const focus = sliceContext(originalText);
  const pivotKeyword = pangyoHits[0] ?? "액션 아이템";

  return `방금 공유 주신 "${focus}" 건은 ${pivotKeyword} 기준으로 다시 얼라인하고, 오너십과 우선순위를 정리한 뒤 실행 가능한 플랜으로 바로 공유드리겠습니다.`;
}

export function analyzePangyoSpeech(input: string): PangyoAnalysis {
  const text = normalizeWhitespace(input);
  const hardBlock = hardBlockPhrases.find((entry) => text.includes(entry.phrase));

  if (hardBlock) {
    return {
      status: "blocked",
      pangyoScore: clampScore(18),
      matchedKeywords: [hardBlock.phrase],
      originalText: text,
      rewrittenText: hardBlock.rewrite,
      reason: `비판교식 발화 "${hardBlock.phrase}" 이(가) 감지되어 교정이 필요합니다.`,
    };
  }

  const pangyoHits = mandatoryPangyoLexicon.filter((keyword) => text.includes(keyword));
  const structuralHits = structuralBoostLexicon.filter((keyword) =>
    text.includes(keyword),
  );
  const rhetoricalPenalty = /(\?|음|어|그게|아마|그런데요)/.test(text) ? 8 : 0;

  const score = clampScore(
    24 + pangyoHits.length * 22 + structuralHits.length * 8 + Math.min(10, Math.floor(text.length / 20)) - rhetoricalPenalty,
  );

  if (score < 60 || pangyoHits.length === 0) {
    return {
      status: "blocked",
      pangyoScore: score,
      matchedKeywords: pangyoHits,
      originalText: text,
      rewrittenText: buildRewrite(text, pangyoHits),
      reason:
        "판교어 밀도가 기준치에 미달했습니다. 메시지를 비즈니스 톤으로 정렬합니다.",
    };
  }

  return {
    status: "pass",
    pangyoScore: score,
    matchedKeywords: pangyoHits,
    originalText: text,
    rewrittenText: text,
    reason: "판교어 기준치를 통과했습니다.",
  };
}
