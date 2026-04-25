import { GoogleAuth } from "google-auth-library";

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const GOOGLE_STT_URL = "https://speech.googleapis.com/v2";

interface SpeechRecognitionAlternative {
  transcript?: string;
}

interface SpeechRecognitionResult {
  alternatives?: SpeechRecognitionAlternative[];
}

interface RecognizeResponse {
  results?: SpeechRecognitionResult[];
  metadata?: {
    totalBilledDuration?: string;
  };
}

interface ShortAudioTranscript {
  billedDuration?: string;
  transcript: string;
}

function resolveProjectId() {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    null
  );
}

function resolveLocation() {
  return process.env.STT_LOCATION?.trim() || "global";
}

function resolveLanguageCodes() {
  const configured = process.env.STT_LANGUAGE_CODES?.trim() || "ko-KR";

  return configured
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

function resolveModel() {
  return process.env.STT_MODEL?.trim() || "short";
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function buildRecognitionEndpoint(projectId: string, location: string) {
  return `${GOOGLE_STT_URL}/projects/${projectId}/locations/${location}/recognizers/_:recognize`;
}

function extractTranscript(payload: RecognizeResponse) {
  const transcript = payload.results
    ?.flatMap((result) => result.alternatives ?? [])
    .map((alternative) => alternative.transcript?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return normalizeWhitespace(transcript ?? "");
}

async function getAccessToken(auth: GoogleAuth) {
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  if (typeof token === "string") {
    return token;
  }

  return token?.token ?? null;
}

export async function transcribeShortAudio(
  audioBuffer: ArrayBuffer,
): Promise<ShortAudioTranscript | null> {
  const auth = new GoogleAuth({
    scopes: [CLOUD_PLATFORM_SCOPE],
  });
  const projectId = resolveProjectId() || (await auth.getProjectId().catch(() => null));
  const accessToken = await getAccessToken(auth);

  if (!projectId || !accessToken) {
    throw new Error(
      "Cloud STT 인증이 설정되지 않았습니다. Cloud Run 서비스 계정 또는 로컬 ADC(gcloud auth application-default login)를 연결해 주세요.",
    );
  }

  const response = await fetch(
    buildRecognitionEndpoint(projectId, resolveLocation()),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-goog-user-project": projectId,
      },
      body: JSON.stringify({
        config: {
          autoDecodingConfig: {},
          languageCodes: resolveLanguageCodes(),
          model: resolveModel(),
          features: {
            enableAutomaticPunctuation: true,
          },
        },
        content: Buffer.from(audioBuffer).toString("base64"),
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const rawBody = await response.text().catch(() => "");

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Cloud STT 호출 권한이 없습니다. 서비스 계정 또는 ADC에 Speech-to-Text 접근 권한을 부여해 주세요.",
      );
    }

    throw new Error(
      rawBody
        ? `Cloud STT 전사 요청이 실패했습니다. ${rawBody}`
        : "Cloud STT 전사 요청이 실패했습니다.",
    );
  }

  const payload = (await response.json()) as RecognizeResponse;
  const transcript = extractTranscript(payload);

  if (!transcript) {
    return null;
  }

  return {
    billedDuration: payload.metadata?.totalBilledDuration,
    transcript,
  };
}
