# Pangyo Firewall

회의 중 발화가 판교어 기준을 통과하는지 검사하고, 위험 발화는 사이렌과 함께 차단한 뒤 AI 대체 문장으로 바꿔주는 해커톤 MVP 웹앱입니다.

## 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- LocalStorage 기반 mock 세션 상태

## 구현된 화면

- 메인 화면
  - 서비스명, 닉네임 입력, 방 코드 입력, 회의방 입장 버튼
- 회의방 화면
  - 참가자 목록
  - 발화 입력창
  - 발화 제출 버튼
  - 회의 로그 영역
  - Pangyo Score 표시
  - 위험 발화 감지 시 사이렌 모달
  - 음소거 연출
  - AI 대체 발화 카드
- 회의 리포트 화면
  - 총 발화 수
  - 차단된 발화 수
  - 평균 Pangyo Score
  - 가장 위험한 발화
  - 최종 평가 문구

## Mock 분석 규칙

아래 표현이 포함되면 위험 발화로 판단합니다.

- 못 해요
- 몰라요
- 싫어요
- 제가 안 했어요
- 이 회의 왜 해요
- 버그예요
- 별로

위험 발화는 낮은 `pangyoScore`를 받고, 고쳐 말한 `replacement` 문장을 생성합니다. 그 외 발화는 통과 처리됩니다.

## 실행 방법

1. 의존성 설치

```bash
npm install
```

2. 개발 서버 실행

```bash
npm run dev
```

3. 브라우저에서 확인

```text
http://localhost:3000
```

## 검증 커맨드

```bash
npm run lint
npm run typecheck
npm run build
```

## 디렉터리 구조

```text
app/
  page.tsx
  room/page.tsx
  report/page.tsx
components/
  home/
  room/
  report/
  shared/
lib/
  pangyo-analyzer.ts
  meeting-session.ts
types/
  meeting.ts
```

## 다음 단계 TODO

- Gemini API 연결로 실제 판교어 점수화 및 대체 발화 생성
- Socket.IO 연결로 실시간 멀티 유저 회의방 반영
- TTS 연결로 AI 대체 발화를 음성으로 재생
- STT 연결로 텍스트 입력 대신 실제 발화 분석
- 회의 리포트 저장 및 공유 기능 추가
