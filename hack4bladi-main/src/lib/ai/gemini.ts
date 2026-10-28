/**
 * Gemini image understanding.
 *
 * The model understands; it never decides. It is not allowed to return a POI id, a
 * coordinate or a stop list: it returns free text, tags and category hints, and the local
 * resolver decides what any of that means. Everything it produces crosses a Zod boundary
 * before it is believed.
 *
 * Structured *intent* extraction moved to @/lib/ai/intent — one prompt for all four
 * modalities rather than one per entry point. `extractTripProfile` stays on the
 * `AIProvider` contract and now delegates there, so there is a single extractor.
 */
import "server-only";
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { GeminiIntentProvider } from "@/lib/ai/intent";
import { generateJson } from "@/lib/ai/gemini-client";
import { boundedSignal } from "@/lib/ai/http";
import { outputLanguageDirective } from "@/lib/ai/output-language";
import { CURATED_PLACE_NAMES, resolvePoiId } from "@/lib/ai/resolve-poi";
import type {
  AIProvider,
  ExtractProfileInput,
  ImageAnalysisResult,
  ImageInput,
} from "@/lib/ai/types";
import { draftToProfile, pickInterests } from "@/lib/intent";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import type { Locale } from "@/types/common";
import type { IntentSource } from "@/types/intent";
import type { TripProfile } from "@/types/profile";
import { INTERESTS } from "@/types/profile";

export const EMPTY_ANALYSIS: ImageAnalysisResult = {
  destination: null,
  country: null,
  detectedPlace: null,
  detectedPoiId: null,
  labels: [],
  ocrText: null,
  interestHints: [],
  activityHints: [],
  confidence: {},
};

const ANALYZE_PROMPT = `You identify places in tourism photos and screenshots from Morocco's Casablanca-Settat region.

Return ONLY JSON:
{"destination": string|null, "country": string|null, "detectedPlace": string|null, "labels": string[], "ocrText": string|null, "interestHints": string[], "activityHints": string[], "confidence": {"destination": number, "detectedPlace": number}}

Rules:
- "destination" is a town: Casablanca, El Jadida, Azemmour, Oualidia, Mohammedia, Boulaouane. null if unsure.
- "country" is the country you believe the image shows, e.g. "Morocco". null if unsure.
- "detectedPlace" is the real place the photo shows. Decide it in this order:
  1. Check this list. If the photo genuinely shows one of these, return that exact spelling: ${CURATED_PLACE_NAMES.join("; ")}
  2. Otherwise name the place as it is actually known in the world — "Casablanca Finance City", "Sidi Bouzid beach", "Twin Center". The list is a spelling reference, not a menu: NEVER answer with a place from it that the photo does not show. An office district is not a marina, and a beach we do not cover is still that beach by name. Naming it correctly is how we tell the traveller we do not cover it yet.
  3. If you cannot identify the specific place, describe it plainly ("a modern business district") and give a low detectedPlace confidence.
- "labels": 3-6 short visual clues for what is actually in the frame (e.g. "minaret", "market stall", "beach", "art deco facade").
- "ocrText": any legible text in the image — captions, signs, overlaid titles — else null.
- "interestHints": which of these the image suggests, at most 3, most relevant first: ${INTERESTS.join(", ")}
- "activityHints": 1-3 short phrases for what a traveller would do there (e.g. "guided visit", "eat grilled fish", "sunset walk").
- confidence values are 0..1 and honest: a photo you cannot place is a low number, not a guess.
- Never invent coordinates, ids, opening hours or prices. Never guess a place you cannot see. Never return an itinerary.`;

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  constructor(private readonly apiKey: string) {}

  private get model(): string {
    return serverEnv.gemini.model;
  }

  async analyzeImage(
    input: ImageInput,
    signal?: AbortSignal,
    locale: Locale = "en",
  ): Promise<ImageAnalysisResult> {
    const json = await generateJson(
      this.apiKey,
      this.model,
      [
        // `labels` and `activityHints` are rendered as chips under the recognised photo,
        // so they are the one part of this response the traveller actually reads.
        { text: `${ANALYZE_PROMPT}${outputLanguageDirective(locale)}` },
        { inline_data: { mime_type: input.mimeType, data: input.base64 } },
      ],
      // The route handler passes a bounded signal; this default is the belt to its braces.
      signal ?? boundedSignal(TIMEOUTS.imageAnalysisMs),
    );

    const raw = (json ?? {}) as Record<string, unknown>;
    const detectedPlace = typeof raw.detectedPlace === "string" ? raw.detectedPlace : null;
    const strings = (value: unknown, limit: number): string[] =>
      Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string").slice(0, limit)
        : [];

    return {
      destination: typeof raw.destination === "string" ? raw.destination : null,
      country: typeof raw.country === "string" ? raw.country : null,
      detectedPlace,
      // The model is never asked for an id; we resolve it locally against the dataset.
      detectedPoiId: resolvePoiId(detectedPlace),
      labels: strings(raw.labels, 6),
      ocrText: typeof raw.ocrText === "string" ? raw.ocrText : null,
      interestHints: pickInterests(raw.interestHints),
      activityHints: strings(raw.activityHints, 3),
      confidence:
        raw.confidence && typeof raw.confidence === "object"
          ? (raw.confidence as ImageAnalysisResult["confidence"])
          : {},
    };
  }

  /**
   * Kept on the contract, implemented on top of the intent path: one prompt, one
   * normaliser, one Zod boundary. The draft is confirmed immediately here because this
   * entry point has no confirmation screen of its own — callers that do have one should
   * use `createIntentProvider()` and confirm explicitly.
   */
  async extractTripProfile(
    input: ExtractProfileInput,
    signal?: AbortSignal,
  ): Promise<TripProfile> {
    const provider = new GeminiIntentProvider(this.apiKey, this.model);
    const draft = await provider.extractIntent(
      {
        source: sourceOf(input),
        locale: input.locale,
        text: input.text,
        transcript: input.transcript,
        image: input.image,
        known: input.known,
        evidence: input.socialUrl ? { urlTitle: null, provider: "url" } : undefined,
      },
      signal,
    );

    const profile = draftToProfile(draft, {
      locale: input.locale,
      edits: input.known,
    });
    return { ...profile, sources: input.sources.length > 0 ? input.sources : profile.sources };
  }
}

/** Which modality dominated this request. Image wins, then voice, then a link. */
function sourceOf(input: ExtractProfileInput): IntentSource {
  if (input.image) return "image";
  if (input.transcript) return "audio";
  if (input.socialUrl) return "url";
  return "text";
}

/** null when no key is configured — the caller falls back to local data and still ships a trip. */
export function createGeminiProvider(): AIProvider | null {
  const apiKey = serverEnv.gemini.apiKey;
  return apiKey ? new GeminiProvider(apiKey) : null;
}

/** The profile we hand back when there is no model, or the model was no help. */
export function fallbackProfile(input: ExtractProfileInput): TripProfile {
  const profile = createEmptyProfile(input.locale);
  const chosen = Object.fromEntries(
    Object.entries(input.known ?? {}).filter(
      ([, value]) =>
        value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0),
    ),
  );
  const merged: TripProfile = { ...profile, ...chosen, locale: input.locale };
  merged.sources = input.sources;
  merged.transcript = input.transcript ?? input.text ?? merged.transcript ?? null;
  merged.detectedPoiId = resolvePoiId(merged.detectedPlace) ?? merged.detectedPoiId;
  return merged;
}
