import type { SpeechAnalysis } from "@/types/meeting";

const riskReplacements: Record<string, string> = {
  "못 해요":
    "현재 리소스 기준으로는 바로 확정이 어렵지만, 스코프를 재정렬하면 실행 가능한 대안을 빠르게 제안드리겠습니다.",
  "몰라요":
    "아직 팩트가 충분히 수집되지 않았습니다. 필요한 데이터를 빠르게 확인해서 액션 아이템 형태로 공유드리겠습니다.",
  "싫어요":
    "지금 안은 임팩트 대비 효율이 낮아 보여서, 더 나은 옵션을 비교 가능한 형태로 다시 제안드리겠습니다.",
  "제가 안 했어요":
    "오너십 구간을 다시 얼라인해서 담당 범위를 명확히 정리하고, 필요한 핸드오프까지 연결하겠습니다.",
  "이 회의 왜 해요":
    "이 회의의 목적과 의사결정 포인트를 다시 얼라인하고, 필요한 논의만 남기도록 압축하겠습니다.",
  "버그예요":
    "현재 이슈는 재현 경로와 영향 범위를 먼저 정리한 뒤, 우선순위 기반으로 핫픽스 플랜을 제안드리겠습니다.",
  "별로":
    "사용자 임팩트가 아직 약한 상태라서, 가설을 조정하고 개선 포인트를 다시 정의해보겠습니다.",
};

const riskPhrases = Object.keys(riskReplacements);
const pangyoBoostWords = [
  "얼라인",
  "싱크",
  "임팩트",
  "로드맵",
  "액션 아이템",
  "레버리지",
  "스케일",
  "온보딩",
];

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

export function analyzePangyoSpeech(input: string): SpeechAnalysis {
  const text = input.trim();
  const matchedPhrase = riskPhrases.find((phrase) => text.includes(phrase));

  if (matchedPhrase) {
    const riskIndex = riskPhrases.indexOf(matchedPhrase);

    return {
      isDangerous: true,
      pangyoScore: clampScore(28 - riskIndex * 2),
      replacement: riskReplacements[matchedPhrase],
      matchedPhrase,
      reason: `위험 발화 패턴 "${matchedPhrase}" 이(가) 감지되었습니다.`,
    };
  }

  const boostCount = pangyoBoostWords.filter((word) => text.includes(word)).length;
  const score = clampScore(78 + boostCount * 4 + Math.min(8, Math.floor(text.length / 18)));

  return {
    isDangerous: false,
    pangyoScore: score,
    reason: "판교어 기준치를 통과했습니다.",
  };
}

export const mockRiskPhrases = riskPhrases;

