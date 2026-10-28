/**
 * The untrusted boundary for everything a model says about a trip.
 *
 * `parseTripIntentDraft` never throws and never lets a model-authored value through
 * unchecked: an enum it invented is discarded, a confidence outside 0..1 is clamped,
 * a key we never asked for is stripped. Invalid input yields an empty draft, which the
 * app can still work from — the traveller simply confirms more by hand.
 *
 * No `server-only` import: this is pure validation and must stay unit-testable.
 */
import { z } from "zod";
import { INTERESTS } from "@/types/profile";
import type { Locale } from "@/types/common";
import type { ConfidenceBand, DraftField, IntentSource, TripIntentDraft } from "@/types/intent";

/** HIGH >= 0.80 · MEDIUM 0.50–0.79 · LOW < 0.50. */
export const CONFIDENCE_BANDS = { high: 0.8, medium: 0.5 } as const;

export function bandOf(confidence: number): ConfidenceBand {
  if (confidence >= CONFIDENCE_BANDS.high) return "high";
  if (confidence >= CONFIDENCE_BANDS.medium) return "medium";
  return "low";
}

/**
 * High: preselect the interpretation. Medium: show it with its alternatives.
 * Low: ask. Claiming certainty we do not have is the one failure mode worse than
 * asking one extra question.
 */
export function shouldPreselect(draft: TripIntentDraft): boolean {
  return draft.band === "high";
}

/** Clamps to 0..1; anything unusable becomes 0. */
export function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

const interestSchema = z.enum(INTERESTS as unknown as [string, ...string[]]);
const confidenceSchema = z.number().min(0).max(1).catch(0);

const sourceSchema = z.enum(["image", "audio", "text", "url"]);

const provenanceSchema = z.enum([
  "image_visual",
  "image_ocr",
  "voice",
  "text",
  "url_title",
  "url_description",
  "url_thumbnail",
  "manual",
  "fallback",
]);

const draftFieldSchema = z.enum([
  "city",
  "detectedPlace",
  "detectedPoiId",
  "interests",
  "timeAvailable",
  "budgetLevel",
  "pace",
  "mobility",
  "constraints",
]);

const candidateSchema = z.object({
  poiId: z.string(),
  name: z.string(),
  city: z.string(),
  score: confidenceSchema,
  reason: z.string().catch(""),
  /* Zod strips what it does not declare, so an undeclared `kind` silently became
     undefined on the wire and the reveal lost the one thing that tells a coverage
     stand-in apart from a real match. */
  kind: z.enum(["name", "coverage"]).catch("name"),
});

export const tripIntentDraftSchema = z.object({
  source: sourceSchema.catch("text"),
  destination: z
    .object({
      region: z.string().nullable().catch(null),
      city: z.string().nullable().catch(null),
      detectedPlace: z.string().nullable().catch(null),
      detectedPoiId: z.string().nullable().catch(null),
      confidence: confidenceSchema,
    })
    .catch({ region: null, city: null, detectedPlace: null, detectedPoiId: null, confidence: 0 }),
  candidates: z.array(candidateSchema).max(5).catch([]),
  interests: z.array(interestSchema).max(3).catch([]),
  timeAvailable: z.enum(["few_hours", "half_day", "full_day"]).nullable().catch(null),
  budgetLevel: z.enum(["low", "medium", "premium"]).nullable().catch(null),
  pace: z.enum(["relaxed", "balanced", "explorer"]).nullable().catch(null),
  mobility: z
    .object({ avoidLongWalks: z.boolean().nullable().catch(null) })
    .catch({ avoidLongWalks: null }),
  constraints: z.array(z.string()).max(6).catch([]),
  evidence: z
    .object({
      transcript: z.string().nullable().catch(null),
      ocrText: z.string().nullable().catch(null),
      urlTitle: z.string().nullable().catch(null),
      urlDescription: z.string().nullable().catch(null),
      urlAuthor: z.string().nullable().catch(null),
      urlThumbnailUrl: z.string().nullable().catch(null),
      visualClues: z.array(z.string()).max(8).catch([]),
      provider: z.string().nullable().catch(null),
    })
    .catch(emptyEvidence()),
  confidence: confidenceSchema,
  band: z.enum(["high", "medium", "low"]).catch("low"),
  uncertainFields: z.array(draftFieldSchema).catch([]),
  provenance: z.partialRecord(draftFieldSchema, provenanceSchema).catch({}),
  degraded: z.boolean().catch(false),
  locale: z.enum(["en", "fr", "ar"]).catch("en"),
  createdAt: z.string().catch(() => new Date().toISOString()),
});

function emptyEvidence(): TripIntentDraft["evidence"] {
  return {
    transcript: null,
    ocrText: null,
    urlTitle: null,
    urlDescription: null,
    urlAuthor: null,
    urlThumbnailUrl: null,
    visualClues: [],
    provider: null,
  };
}

export function createEmptyDraft(
  source: IntentSource = "text",
  locale: Locale = "en",
): TripIntentDraft {
  return {
    source,
    destination: {
      region: null,
      city: null,
      detectedPlace: null,
      detectedPoiId: null,
      confidence: 0,
    },
    candidates: [],
    interests: [],
    timeAvailable: null,
    budgetLevel: null,
    pace: null,
    mobility: { avoidLongWalks: null },
    constraints: [],
    evidence: emptyEvidence(),
    confidence: 0,
    band: "low",
    uncertainFields: [],
    provenance: {},
    degraded: true,
    locale,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Never throws. Anything the schema cannot repair becomes an empty draft rather than an
 * exception — the traveller still gets a trip, built from what they choose by hand.
 */
export function parseTripIntentDraft(
  input: unknown,
  source: IntentSource = "text",
  locale: Locale = "en",
): TripIntentDraft {
  const result = tripIntentDraftSchema.safeParse(input);
  if (!result.success) return createEmptyDraft(source, locale);
  const draft = { ...createEmptyDraft(source, locale), ...result.data } as TripIntentDraft;
  // The band is derived, never accepted from outside: it is the one field a caller
  // could use to claim a certainty the number does not support.
  draft.band = bandOf(draft.confidence);
  return draft;
}

export const DRAFT_FIELDS: readonly DraftField[] = [
  "city",
  "detectedPlace",
  "detectedPoiId",
  "interests",
  "timeAvailable",
  "budgetLevel",
  "pace",
  "mobility",
  "constraints",
] as const;
