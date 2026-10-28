/**
 * The four on-ramps. Each modality has its own evidence and its own way of being wrong;
 * all four end at the same `buildDraft` and hand back the same TripIntentDraft.
 *
 * These are the *local* adapters — no network, no model. The model-backed path lives in
 * @/lib/ai/intent and calls the same constructor with a richer `model` object. That is
 * the point: the degraded draft and the real one differ in confidence, not in shape.
 */
import type { ImageAnalysisResult } from "@/lib/ai/types";
import type { UrlMetadata } from "@/lib/ai/url";
import type { Locale } from "@/types/common";
import type { TripIntentDraft } from "@/types/intent";
import { localExtract } from "./local-extract";
import { buildDraft, type RawIntent } from "./normalize";

/** Longest legible run of text an image analysis is allowed to contribute as evidence. */
const OCR_LIMIT = 400;

/**
 * IMAGE → analysis → candidate POI → draft.
 *
 * The place the model named is words; `buildDraft` decides whether those words are a
 * curated POI id. OCR is kept as evidence and is also searched for a place name, because
 * a screenshot of a post about the Hassan II Mosque often says so in the caption.
 */
export function draftFromImageAnalysis(
  analysis: ImageAnalysisResult,
  options: { locale: Locale; degraded?: boolean },
): TripIntentDraft {
  const ocrText = analysis.ocrText?.slice(0, OCR_LIMIT) ?? null;

  /* The activity words and OCR say more about the *kind of day* than the place does, so
     they get a keyword pass of their own. Anything the model already inferred wins. */
  const fromWords = localExtract([...(analysis.activityHints ?? []), ocrText ?? ""].join(" "));

  const model: RawIntent = {
    ...fromWords,
    city: analysis.destination ?? fromWords.city ?? null,
    detectedPlace: analysis.detectedPlace,
    interests:
      analysis.interestHints?.length > 0 ? analysis.interestHints : (fromWords.interests ?? []),
    confidence: analysis.confidence?.detectedPlace ?? analysis.confidence?.destination ?? 0,
  };

  return buildDraft({
    source: "image",
    locale: options.locale,
    model,
    placeConfidence:
      analysis.confidence?.detectedPlace ?? analysis.confidence?.destination ?? undefined,
    evidence: {
      ocrText,
      visualClues: analysis.labels ?? [],
      provider: options.degraded ? null : "gemini_vision",
    },
    provenance: "image_visual",
    /* A place read off a caption is not a place the model saw; the trace should say so. */
    placeProvenance: ocrText && !analysis.detectedPlace ? "image_ocr" : "image_visual",
    degraded: options.degraded ?? false,
  });
}

/**
 * URL → metadata → draft, with no model in the loop.
 *
 * A TikTok caption or a YouTube title is often explicit enough on its own — "half a day
 * in Casablanca, all the good food" — so the keyword pass runs over title and description
 * and the place resolver runs over both. This is the branch that keeps a pasted link
 * useful when Gemini is unavailable.
 */
export function draftFromUrlMetadata(
  metadata: UrlMetadata,
  options: { locale: Locale },
): TripIntentDraft {
  const combined = [metadata.title, metadata.description, ...metadata.hashtags]
    .filter(Boolean)
    .join(" ");

  return buildDraft({
    source: "url",
    locale: options.locale,
    model: localExtract(combined),
    evidence: {
      urlTitle: metadata.title,
      urlDescription: metadata.description,
      urlAuthor: metadata.author,
      urlThumbnailUrl: metadata.thumbnailUrl,
      provider: metadata.provider,
    },
    provenance: metadata.title ? "url_title" : "url_description",
    degraded: true,
  });
}

/**
 * TEXT or VOICE → draft, with no model in the loop. Same keyword pass, different
 * provenance, because a sentence someone spoke and a sentence someone typed are the same
 * evidence with different reliability.
 */
export function draftFromLocalText(
  text: string | null | undefined,
  options: { locale: Locale; source: "text" | "audio" },
): TripIntentDraft {
  const value = text?.trim() || null;
  return buildDraft({
    source: options.source,
    locale: options.locale,
    model: localExtract(value),
    evidence:
      options.source === "audio" ? { transcript: value } : { transcript: value, provider: null },
    provenance: options.source === "audio" ? "voice" : "text",
    degraded: true,
  });
}
