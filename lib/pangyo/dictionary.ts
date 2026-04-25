export interface PangyoPhraseEntry {
  id: string;
  sourcePatterns: string[];
  rewrite: string;
  keywords: string[];
}

export const pangyoKeywordPool = [
  "스크럼",
  "스탠드업",
  "얼라인",
  "싱크",
  "파킹",
  "랩업",
  "캘린더 인바이트",
  "원온원",
  "애자일",
  "린",
  "MVP",
  "킥오프",
  "오너",
  "DRI",
  "태스크",
  "투두",
  "액션 아이템",
  "어싸인",
  "백로그",
  "페인 포인트",
  "북극성 지표",
  "KPI",
  "레퍼런스",
  "인사이트",
  "스케일업",
  "로드맵",
  "스코프",
  "컨텍스트",
  "블로커",
  "우선순위",
  "임팩트",
  "핸드오프",
];

export const pangyoToneGuidelines = [
  "핵심 의도는 유지하되, 회의체에서 바로 읽어도 되는 완결된 한국어 문장으로 다듬는다.",
  "판교어 키워드는 한 문장에 1개에서 3개 정도만 자연스럽게 섞고, 과하게 난삽하지 않게 만든다.",
  "직접적 거절 대신 얼라인, 우선순위, 액션 아이템, 다음 스텝 중심으로 말한다.",
  "TTS용 출력이므로 마크다운, 슬래시, 괄호 속 영문 병기, 불필요한 따옴표는 쓰지 않는다.",
];

export const pangyoPhraseEntries: PangyoPhraseEntry[] = [
  {
    id: "scrum-meeting",
    sourcePatterns: ["오늘 아침 회의", "짧은 회의", "데일리 회의", "아침 회의"],
    rewrite: "오늘 스크럼에서 핵심 아젠다 먼저 얼라인하시죠.",
    keywords: ["스크럼", "아젠다", "얼라인"],
  },
  {
    id: "align-opinions",
    sourcePatterns: ["의견을 맞추", "방향을 맞추", "생각을 맞추", "서로 의견"],
    rewrite: "이 건은 먼저 얼라인부터 맞추죠.",
    keywords: ["얼라인"],
  },
  {
    id: "sync-progress",
    sourcePatterns: ["진행 상황 공유", "진행상황 공유", "현황 공유", "업데이트 공유"],
    rewrite: "진행 상황 싱크 먼저 맞출게요.",
    keywords: ["싱크"],
  },
  {
    id: "parking",
    sourcePatterns: ["보류합시다", "보류", "잠깐 미루", "나중에 하"],
    rewrite: "이 건은 일단 파킹해두죠.",
    keywords: ["파킹"],
  },
  {
    id: "wrap-up",
    sourcePatterns: ["회의 내용 요약", "마지막으로 요약", "정리할게요", "마무리할게요"],
    rewrite: "마지막으로 랩업하겠습니다.",
    keywords: ["랩업"],
  },
  {
    id: "calendar-invite",
    sourcePatterns: ["일정 잡아서 초대", "미팅 잡아", "회의 일정 잡", "초대할게요"],
    rewrite: "다음 주에 캘린더 인바이트 날릴게요.",
    keywords: ["캘린더 인바이트"],
  },
  {
    id: "one-on-one",
    sourcePatterns: ["1:1", "일대일", "면담", "따로 얘기"],
    rewrite: "이 내용은 따로 원온원으로 싱크 맞추시죠.",
    keywords: ["원온원", "싱크"],
  },
  {
    id: "agile",
    sourcePatterns: ["빠르고 신속", "유연하게", "빨리 움직", "기민하게"],
    rewrite: "이 건은 애자일하게 가져가시죠.",
    keywords: ["애자일"],
  },
  {
    id: "lean-mvp",
    sourcePatterns: ["최소한으로 빨리", "빨리 만들어서 테스트", "간단하게 먼저 만들", "우선 테스트"],
    rewrite: "린하게 MVP 버전부터 빠르게 뽑아보죠.",
    keywords: ["린", "MVP"],
  },
  {
    id: "kickoff",
    sourcePatterns: ["내일부터 시작", "프로젝트 시작", "바로 시작", "착수합시다"],
    rewrite: "이 프로젝트는 내일 바로 킥오프하시죠.",
    keywords: ["킥오프"],
  },
  {
    id: "owner",
    sourcePatterns: ["누가 책임", "누가 맡", "담당이 누구", "책임지고 하나요"],
    rewrite: "이 업무 오너가 누구인지 먼저 정하시죠.",
    keywords: ["오너"],
  },
  {
    id: "task-todo",
    sourcePatterns: ["업무 목록", "해야 할 업무", "할 일 목록", "오늘 할 일"],
    rewrite: "오늘 쳐낼 태스크랑 투두 먼저 정리하시죠.",
    keywords: ["태스크", "투두"],
  },
  {
    id: "action-item",
    sourcePatterns: ["실행해야 할 일", "다음 할 일", "실행할 것", "후속 조치"],
    rewrite: "다음 액션 아이템 정하고 바로 가져가시죠.",
    keywords: ["액션 아이템"],
  },
  {
    id: "assign",
    sourcePatterns: ["배당할게요", "맡길게요", "할당할게요", "담당 지정"],
    rewrite: "이 건은 담당 오너께 바로 어싸인할게요.",
    keywords: ["오너", "어싸인"],
  },
  {
    id: "backlog",
    sourcePatterns: ["나중에 시간", "남은 일들", "나중에 하자", "우선순위 낮"],
    rewrite: "그건 백로그에 넣어두고 우선순위 다시 보시죠.",
    keywords: ["백로그", "우선순위"],
  },
  {
    id: "pain-point",
    sourcePatterns: ["가장 불편", "불편해하는 부분", "힘들어하는 지점", "고객 불편"],
    rewrite: "유저 페인 포인트부터 다시 보시죠.",
    keywords: ["페인 포인트"],
  },
  {
    id: "north-star",
    sourcePatterns: ["중요한 목표", "중요한 지표", "핵심 목표", "가장 중요하게 봐야"],
    rewrite: "북극성 지표랑 핵심 KPI부터 얼라인하시죠.",
    keywords: ["북극성 지표", "KPI", "얼라인"],
  },
  {
    id: "reference",
    sourcePatterns: ["타사 사례", "비슷한 사례", "참고할 만한", "레퍼런스 찾"],
    rewrite: "타사 레퍼런스 먼저 체크해볼게요.",
    keywords: ["레퍼런스"],
  },
  {
    id: "insight",
    sourcePatterns: ["깨달은 점", "해결책", "결과를 보고", "알게 된 점"],
    rewrite: "데이터에서 인사이트 먼저 도출해보죠.",
    keywords: ["인사이트"],
  },
  {
    id: "scale-up",
    sourcePatterns: ["더 큰 시장", "기능으로 확장", "확장하자", "더 크게 가"],
    rewrite: "이 방향은 시장과 기능 기준으로 스케일업해보죠.",
    keywords: ["스케일업"],
  },
];

function normalizeLookupText(text: string) {
  return text
    .toLowerCase()
    .replace(/[\s.,!?/()"'~`_\-:;[\]{}]+/g, "")
    .trim();
}

export function extractPangyoKeywords(text: string) {
  return pangyoKeywordPool.filter((keyword) => text.includes(keyword));
}

export function matchPangyoDictionary(text: string) {
  const normalized = normalizeLookupText(text);

  return pangyoPhraseEntries.filter((entry) =>
    entry.sourcePatterns.some((pattern) =>
      normalized.includes(normalizeLookupText(pattern)),
    ),
  );
}

export function buildPangyoDictionaryPrompt(limit = pangyoPhraseEntries.length) {
  return pangyoPhraseEntries
    .slice(0, limit)
    .map(
      (entry) =>
        `- 일반어: ${entry.sourcePatterns[0]} -> 판교어: ${entry.rewrite} (키워드: ${entry.keywords.join(", ")})`,
    )
    .join("\n");
}
