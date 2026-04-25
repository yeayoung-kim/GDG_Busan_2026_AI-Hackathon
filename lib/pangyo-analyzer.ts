import { analyzePangyoSpeechFallback } from "@/lib/pangyo/fallback";
import { analyzePangyoSpeechWithGemini } from "@/lib/server/gemini-pangyo";
import type { PangyoAnalysis } from "@/types/realtime";

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export async function analyzePangyoSpeech(input: string): Promise<PangyoAnalysis> {
  const text = normalizeWhitespace(input);
  const fallback = analyzePangyoSpeechFallback(text);
  const geminiAnalysis = await analyzePangyoSpeechWithGemini(text);

  if (!geminiAnalysis) {
    return fallback;
  }

  // Keep moderation conservative: if the deterministic fallback says this is
  // plain Korean, we should not let a permissive model response suppress the alert.
  if (fallback.status === "blocked" && geminiAnalysis.status === "pass") {
    return fallback;
  }

  return geminiAnalysis;
}
