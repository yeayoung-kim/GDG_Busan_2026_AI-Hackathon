import { GoogleGenAI, Type } from "@google/genai";
import { extractPangyoKeywords } from "@/lib/pangyo/dictionary";
import { buildPangyoSystemPrompt, buildPangyoUserPrompt } from "@/lib/pangyo/prompt";
import type { PangyoAnalysis } from "@/types/realtime";

const GEMINI_TIMEOUT_MS = 6_000;
const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    originalText: { type: Type.STRING },
    rewrittenText: { type: Type.STRING },
    status: {
      type: Type.STRING,
      enum: ["pass", "blocked"],
    },
    pangyoScore: { type: Type.INTEGER },
    matchedKeywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    reason: { type: Type.STRING },
  },
  required: [
    "originalText",
    "rewrittenText",
    "status",
    "pangyoScore",
    "matchedKeywords",
    "reason",
  ],
} as const;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function resolveGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    null
  );
}

function resolveVertexApiKey() {
  return (
    process.env.VERTEX_AI_API_KEY ||
    process.env.VERTEX_EXPRESS_API_KEY ||
    process.env.GOOGLE_CLOUD_API_KEY ||
    null
  );
}

function resolveVertexProject() {
  return process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || null;
}

function resolveVertexLocation() {
  return (
    process.env.GOOGLE_CLOUD_LOCATION ||
    process.env.VERTEX_LOCATION ||
    process.env.GCLOUD_LOCATION ||
    "global"
  );
}

function resolveGeminiModel() {
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const configuredVertexModel = process.env.VERTEX_GEMINI_MODEL?.trim();
  return (configuredVertexModel || configuredModel || "gemini-2.5-flash-lite").replace(
    /^models\//,
    "",
  );
}

function createGoogleGenAiClient() {
  const vertexApiKey = resolveVertexApiKey();

  if (vertexApiKey) {
    return new GoogleGenAI({
      vertexai: true,
      apiKey: vertexApiKey,
      apiVersion: "v1",
    });
  }

  const vertexProject = resolveVertexProject();

  if (vertexProject) {
    return new GoogleGenAI({
      vertexai: true,
      project: vertexProject,
      location: resolveVertexLocation(),
      apiVersion: "v1",
    });
  }

  const geminiApiKey = resolveGeminiApiKey();

  if (geminiApiKey) {
    return new GoogleGenAI({
      apiKey: geminiApiKey,
    });
  }

  return null;
}

function extractCandidateText(response: {
  text?: string;
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}) {
  if (typeof response.text === "string" && response.text.trim()) {
    return response.text.trim();
  }

  return response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text?.trim())
    .find((text): text is string => Boolean(text));
}

function parseJsonFromModelText(rawText: string) {
  const candidates = [
    rawText.trim(),
    rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim(),
  ];
  const jsonStart = rawText.indexOf("{");
  const jsonEnd = rawText.lastIndexOf("}");

  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    candidates.push(rawText.slice(jsonStart, jsonEnd + 1).trim());
  }

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeStatus(
  value: unknown,
  fallbackStatus: PangyoAnalysis["status"],
): PangyoAnalysis["status"] {
  if (typeof value !== "string") {
    return fallbackStatus;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "pass") {
    return "pass";
  }

  if (normalized === "blocked" || normalized === "vibe_mismatch") {
    return "blocked";
  }

  return fallbackStatus;
}

function sanitizeMatchedKeywords(value: unknown, rewrittenText: string) {
  const rawKeywords = Array.isArray(value)
    ? value.filter((keyword): keyword is string => typeof keyword === "string")
    : [];

  const normalizedKeywords = rawKeywords
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const fallbackKeywords = extractPangyoKeywords(rewrittenText);

  return [...new Set([...normalizedKeywords, ...fallbackKeywords])].slice(0, 8);
}

function sanitizeGeminiAnalysis(
  payload: Record<string, unknown>,
  originalText: string,
): PangyoAnalysis | null {
  const rawRewrittenText =
    typeof payload.rewrittenText === "string"
      ? payload.rewrittenText
      : typeof payload.pangyoTranslation === "string"
        ? payload.pangyoTranslation
        : "";
  const rewrittenText = normalizeWhitespace(rawRewrittenText);
  const score =
    typeof payload.pangyoScore === "number"
      ? payload.pangyoScore
      : typeof payload.pangyoScore === "string"
        ? Number(payload.pangyoScore)
        : NaN;
  const fallbackStatus =
    extractPangyoKeywords(originalText).length >= 2 && rewrittenText === originalText
      ? "pass"
      : "blocked";
  const status = normalizeStatus(payload.status, fallbackStatus);
  const finalRewrittenText =
    status === "pass" ? originalText : rewrittenText || originalText;
  const reason =
    typeof payload.reason === "string" && payload.reason.trim()
      ? payload.reason.trim()
      : status === "pass"
        ? "이미 판교어 톤과 문장 완성도가 충분합니다."
        : "의도를 유지하면서 판교어 회의체로 재작성했습니다.";

  if (!finalRewrittenText) {
    return null;
  }

  return {
    status,
    pangyoScore: clampScore(Number.isFinite(score) ? score : status === "pass" ? 78 : 36),
    matchedKeywords: sanitizeMatchedKeywords(payload.matchedKeywords, finalRewrittenText),
    originalText,
    rewrittenText: finalRewrittenText,
    reason,
  };
}

export async function analyzePangyoSpeechWithGemini(
  input: string,
): Promise<PangyoAnalysis | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const client = createGoogleGenAiClient();

    if (!client) {
      return null;
    }

    const model = resolveGeminiModel();
    const response = await client.models.generateContent({
      model,
      contents: buildPangyoUserPrompt(input),
      config: {
        abortSignal: controller.signal,
        systemInstruction: buildPangyoSystemPrompt(),
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 220,
        responseMimeType: "application/json",
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
    });

    if (response.promptFeedback?.blockReason) {
      return null;
    }

    const candidateText = extractCandidateText(response);

    if (!candidateText) {
      return null;
    }

    const parsed = parseJsonFromModelText(candidateText);

    if (!parsed) {
      return null;
    }

    return sanitizeGeminiAnalysis(parsed, input);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
