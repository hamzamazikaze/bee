/**
 * Structured intent extraction — the model-backed half of the understanding layer.
 *
 * One prompt, one provider interface, four modalities. Whatever the traveller gave us
 * arrives here as evidence (typed text, a transcript, a video title, OCR, an image) and
 * leaves as a validated TripIntentDraft.
 *
 * The model understands; it never decides. It is not allowed to return a POI id, a
 * coordinate, a stop list or an itinerary — it returns enum values and free text, and the
 * local resolver and the trip engine take it from there. Nothing it says reaches
 * application state before `buildDraft` has normalised it and Zod has validated it.
 */
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { generateJson, type GeminiPart } from "@/lib/ai/gemini-client";
import { boundedSignal } from "@/lib/ai/http";
import { CURATED_PLACE_NAMES } from "@/lib/ai/resolve-poi";
import { outputLanguageDirective } from "@/lib/ai/output-language";
import type { IntentExtractionInput, IntentExtractionProvider } from "@/lib/ai/types";
import { buildDraft, mergeKnown } from "@/lib/intent";
import type { TripIntentDraft } from "@/types/intent";
import { INTERESTS } from "@/types/profile";

/**
 * Enum values are quoted literally in the prompt so the model copies rather than
 * paraphrases them. Anything it invents anyway is dropped by `pickInterests` and friends —
 * the prompt is an optimisation, not the guarantee.
 */
const INTENT_PROMPT = `You read a traveller's messy input and return what you understood about the day they want in Morocco's Casablanca-Settat region.

Return ONLY JSON with exactly these keys:
{"city": string|null, "region": string|null, "detectedPlace": string|null, "interests": string[], "timeAvailable": "few_hours"|"half_day"|"full_day"|null, "budgetLevel": "low"|"medium"|"premium"|null, "pace": "relaxed"|"balanced"|"explorer"|null, "avoidLongWalks": boolean|null, "constraints": string[], "confidence": number}

Rules:
- "city" is a town in the region: Casablanca, El Jadida, Azemmour, Oualidia, Mohammedia, Boulaouane. null if the input does not say.
- "detectedPlace" is a specific place the input is about, in plain words. Prefer a name from this list when the input genuinely refers to it: ${CURATED_PLACE_NAMES.join("; ")}
- If the input names a specific place that is NOT in that list, still return that place's own name — do not substitute one from the list and do not return null. Naming it is how we tell the traveller we do not cover it yet. null only when the input names no specific place at all.
- "interests" comes only from this list, at most 3, most important first: ${INTERESTS.join(", ")}
- "avoidLongWalks" is true only when the input says walking is a problem (tired, knees, stroller, "not too much walking"). false only when it says they enjoy walking. null otherwise.
- "constraints" are short quoted requirements the input states, at most 3, e.g. "back before 18:00", "travelling with a toddler". [] if none.
- "confidence" is 0..1: how well the input actually supports what you returned. Be honest — a vague sentence is a low number.
- Use null or [] for anything the input does not support. Do not guess to fill the object.
- Never invent a place, a coordinate, a price, an id or an itinerary. Never return stops.
- The input may be English, French or Arabic. The JSON keys and enum values above are fixed English strings regardless.`;

/** Everything we know, laid out for the model. Absent evidence is simply not mentioned. */
function evidenceBlock(input: IntentExtractionInput): string {
  const evidence = input.evidence ?? {};
  const lines = [
    input.text && `Typed: ${input.text}`,
    input.transcript && `Said out loud: ${input.transcript}`,
    evidence.transcript && !input.transcript && `Said out loud: ${evidence.transcript}`,
    evidence.urlTitle && `Shared video/post title: ${evidence.urlTitle}`,
    evidence.urlDescription &&
      evidence.urlDescription !== evidence.urlTitle &&
      `Shared post description: ${evidence.urlDescription}`,
    evidence.urlAuthor && `Posted by: ${evidence.urlAuthor}`,
    evidence.ocrText && `Text visible in the image: ${evidence.ocrText}`,
    evidence.visualClues?.length && `Visible in the image: ${evidence.visualClues.join(", ")}`,
    input.image && "An image is attached — use it as the primary evidence for the place.",
    input.known &&
      Object.keys(input.known).length > 0 &&
      `Already chosen by the traveller, treat as fixed, do not contradict: ${JSON.stringify(input.known)}`,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : "(the traveller gave no usable detail)";
}

export class GeminiIntentProvider implements IntentExtractionProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async extractIntent(
    input: IntentExtractionInput,
    signal?: AbortSignal,
  ): Promise<TripIntentDraft> {
    const parts: GeminiPart[] = [
      {
        text: `${INTENT_PROMPT}${outputLanguageDirective(input.locale)}\n\nTraveller input:\n${evidenceBlock(input)}`,
      },
    ];
    if (input.image) {
      parts.push({
        inline_data: { mime_type: input.image.mimeType, data: input.image.base64 },
      });
    }

    const json = await generateJson(
      this.apiKey,
      this.model,
      parts,
      signal ?? boundedSignal(TIMEOUTS.profileExtractionMs),
    );

    const draft = buildDraft({
      source: input.source,
      locale: input.locale,
      model: json,
      evidence: {
        ...input.evidence,
        transcript: input.transcript ?? input.text ?? input.evidence?.transcript ?? null,
        provider: [input.evidence?.provider, this.name].filter(Boolean).join("+") || this.name,
      },
      placeConfidence: input.placeConfidence,
      provenance: input.provenance,
      placeProvenance: input.placeProvenance,
      degraded: false,
    });

    // A tap always outranks the model. This is the last word on precedence.
    return mergeKnown(draft, input.known);
  }
}

/**
 * null when no key is configured. Every caller treats that as a supported path and falls
 * through to the local adapters in @/lib/intent/sources.
 */
export function createIntentProvider(): IntentExtractionProvider | null {
  const apiKey = serverEnv.gemini.apiKey;
  return apiKey ? new GeminiIntentProvider(apiKey, serverEnv.gemini.model) : null;
}
