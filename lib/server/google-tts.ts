interface SynthesizedSpeech {
  source: "gcp" | "browser";
  audioBase64?: string;
  audioMimeType?: string;
}

const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

async function fetchAccessToken() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(METADATA_TOKEN_URL, {
      headers: {
        "Metadata-Flavor": "Google",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { access_token?: string };
    return payload.access_token ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function synthesizePangyoSpeech(
  text: string,
): Promise<SynthesizedSpeech> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  const accessToken = apiKey ? null : await fetchAccessToken();

  if (!apiKey && !accessToken) {
    return {
      source: "browser",
    };
  }

  const endpoint = apiKey ? `${GOOGLE_TTS_URL}?key=${apiKey}` : GOOGLE_TTS_URL;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: "ko-KR",
          name: process.env.GCP_TTS_VOICE || "ko-KR-Neural2-B",
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 1.04,
          pitch: -1.5,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        source: "browser",
      };
    }

    const payload = (await response.json()) as { audioContent?: string };

    if (!payload.audioContent) {
      return {
        source: "browser",
      };
    }

    return {
      source: "gcp",
      audioBase64: payload.audioContent,
      audioMimeType: "audio/mpeg",
    };
  } catch {
    return {
      source: "browser",
    };
  }
}
