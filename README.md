# Align.ai
[화면 기록 2026-05-12 오후 9.13.51.mov](attachment:ca8e369a-7309-4103-9126-fa1d2cbcc75a:화면_기록_2026-05-12_오후_9.13.51.mov)

![스크린샷 2026-05-11 오후 10.26.06.png](attachment:c945e111-b1c8-4c90-81f3-a6784b9bab9f:스크린샷_2026-05-11_오후_10.26.06.png)

# **Align.ai**

**<[Align.ai](https://align-ai-service-630128429382.asia-northeast3.run.app/)>** 

2명의 참가자가 같은 방에 접속해 WebRTC 화상 통화를 진행하고, 브라우저 STT로 발화를 감지한 뒤 판교어 밀도를 분석하는 해커톤용 실전 MVP입니다. 판교어가 아니라고 판단되면 방 전체를 잠시 음소거하고, Gemini 기반으로 완성된 판교어 문장을 TTS로 다시 읽어줍니다.

![스크린샷 2026-05-11 오후 10.26.20.png](attachment:6220b5ac-3002-442f-b32a-816e00d24192:스크린샷_2026-05-11_오후_10.26.20.png)

**핵심 기능**

- Next.js App Router 기반 2인 화상회의
- 브라우저별 폴백이 있는 실시간 발화 감지
- Gemini API + 판교어 사전 기반 문장 완성 및 교정
- 위반 시 전원 강제 음소거 상태 동기화
- Google Cloud Text-to-Speech 우선, 브라우저 `speechSynthesis` 폴백
- Cloud Run 단일 인스턴스 배포 전제 인메모리 룸 상태 관리

**기술 스택**

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- WebRTC
- Web Speech API + MediaRecorder + Cloud Speech-to-Text
- Gemini API
- Google Cloud Text-to-Speech REST API
    
    ![스크린샷 2026-05-11 오후 10.26.36.png](attachment:42f1677c-3f23-4470-8a78-d38bd01f63fd:스크린샷_2026-05-11_오후_10.26.36.png)
    

**로컬 실행**

```
npm install
npm run dev
```

`Chrome` 계열은 브라우저 STT를 우선 사용하고, `Safari`/`Firefox`/`Edge` 등에서는 `MediaRecorder`로 짧은 발화를 업로드해 Cloud STT로 전사합니다. 비 Chrome 브라우저에서 자동 전사를 쓰려면 Cloud Run 서비스 계정 또는 로컬 ADC(`gcloud auth application-default login`)가 필요합니다.

**환경 변수**

Vertex AI Express Mode 키가 있으면 그 경로를 우선 사용하고, 없으면 Gemini API 키를 사용합니다. 둘 다 없으면 로컬 판교어 사전 폴백이 동작합니다. TTS 키가 없으면 브라우저 음성 합성으로 자동 폴백됩니다.

```
VERTEX_AI_API_KEY=your_vertex_express_api_key
VERTEX_GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
STT_LOCATION=global
STT_LANGUAGE_CODES=ko-KR
STT_MODEL=short
GOOGLE_TTS_API_KEY=your_api_key
GCP_TTS_VOICE=ko-KR-Neural2-B
```

`VERTEX_GEMINI_MODEL`과 `GEMINI_MODEL`은 선택 사항이며, 기본값은 `gemini-2.5-flash-lite`입니다. Cloud Run에서는 TTS에 한해 API Key 없이도 기본 서비스 계정으로 호출하도록 시도합니다. Cloud STT는 API 키 대신 Cloud Run 서비스 계정 또는 로컬 ADC를 사용합니다.

**GCP 배포 가이드**

1. GCP에서 `Cloud Run`, `Cloud Build`, `Artifact Registry`, `Text-to-Speech API`를 활성화합니다.
2. 실시간 방 상태가 인메모리이므로 `최대 인스턴스 1개`로 배포합니다.
3. 예시 배포:

```
gcloud run deploy align-ai \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --max-instances 1 \
  --set-env-vars GCP_TTS_VOICE=ko-KR-Neural2-B
```

1. 배포 후 브라우저에서 카메라/마이크 권한을 허용하고, 동일한 방 코드를 두 명이 공유해 접속하면 됩니다.

**주의 사항**

- 룸/시그널 상태는 서버 메모리에 유지되므로 해커톤 데모나 단일 인스턴스 Cloud Run 운영에 적합합니다.
- 브라우저 STT가 없는 환경은 `MediaRecorder + Cloud STT` 폴백으로 처리하며, 그마저 사용할 수 없으면 화면의 수동 입력 콘솔로 시연할 수 있습니다.
- 별도 테스트 코드는 작성하지 않았고, 린트/타입체크/프로덕션 빌드 기준으로 검증하도록 구성했습니다.

**검증 커맨드**

```
npm run lint
npm run typecheck
npm run build
```

**주요 구조**

`app/
  api/rooms/[roomId]/*
  room/[roomId]/page.tsx
components/
  landing/
  room/
lib/
  pangyo-analyzer.ts
  server/
types/
  realtime.ts
  web-speech.d.ts`

![스크린샷 2026-05-11 오후 10.27.13.png](attachment:ae228c2b-ab06-4f56-8a19-a7ab0fd1952b:스크린샷_2026-05-11_오후_10.27.13.png)
