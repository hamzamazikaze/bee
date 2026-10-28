/**
 * Model output → TripIntentDraft.
 *
 * Two jobs, and they are separate on purpose:
 *
 * 1. **Normalise.** An enum the model invented is dropped, not coerced; one bad interest
 *    does not cost us the other two. A confidence of 7, "0.9" or NaN becomes a number in
 *    0..1. Keys we never asked for never reach application state.
 * 2. **Score.** Confidence is computed here from what we can actually verify — did the
 *    place ground against the curated dataset, how much of the profile is filled — and
 *    only partly from what the model says about itself. A model's self-report is a
 *    signal, never the answer.
 *
 * Nothing in this file talks to a network or imports `server-only`.
 */
import { coverageCandidates, resolvePoiCandidates, resolvePoiId } from "@/lib/ai/resolve-poi";
import type { Locale } from "@/types/common";
import type {
  DraftField,
  FieldProvenance,
  IntentEvidence,
  IntentSource,
  TripIntentDraft,
} from "@/types/intent";
import {
  INTERESTS,
  type BudgetLevel,
  type Interest,
  type TimeAvailable,
  type TripPace,
  type TripProfile,
  type WalkingPreference,
} from "@/types/profile";
import { bandOf, clampConfidence, createEmptyDraft, parseTripIntentDraft } from "./schema";

const TIME_VALUES: readonly TimeAvailable[] = ["few_hours", "half_day", "full_day"];
const BUDGET_VALUES: readonly BudgetLevel[] = ["low", "medium", "premium"];
const PACE_VALUES: readonly TripPace[] = ["relaxed", "balanced", "explorer"];

/** An enum value the model produced, or null. Never the "closest" one. */
function pickEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== "string") return null;
  const normalised = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.find((option) => option === normalised) ?? null;
}

/** Valid interests only, deduplicated, most important first, capped at three. */
export function pickInterests(value: unknown): Interest[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<Interest>();
  for (const entry of value) {
    const interest = pickEnum(entry, INTERESTS);
    if (interest) seen.add(interest);
    if (seen.size === 3) break;
  }
  return [...seen];
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function pickStrings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(pickString)
    .filter((entry): entry is string => entry !== null)
    .slice(0, limit);
}

/** Models answer booleans as booleans, as "true", and as "yes". Accept all three. */
function pickBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["true", "yes", "oui", "نعم"].includes(text)) return true;
    if (["false", "no", "non", "لا"].includes(text)) return false;
  }
  return null;
}

/** The model's own numbers, sanitised. A string "0.8" counts; 7 and NaN do not. */
function pickConfidence(value: unknown): number {
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
  }
  return typeof value === "number" && value >= 0 && value <= 1 ? clampConfidence(value) : 0;
}

/** The shape the intent prompt asks for. Every field is optional and untrusted. */
export interface RawIntent {
  city?: unknown;
  region?: unknown;
  detectedPlace?: unknown;
  interests?: unknown;
  timeAvailable?: unknown;
  budgetLevel?: unknown;
  pace?: unknown;
  avoidLongWalks?: unknown;
  constraints?: unknown;
  confidence?: unknown;
  [key: string]: unknown;
}

export interface BuildDraftInput {
  source: IntentSource;
  locale: Locale;
  /** Raw, unvalidated model JSON. Undefined when no model answered. */
  model?: unknown;
  evidence?: Partial<IntentEvidence>;
  /** How sure the modality itself was about the place (image analysis, oEmbed match). */
  placeConfidence?: number;
  /** Attributed to every field the model filled. */
  provenance?: FieldProvenance;
  /** Attributed to the place fields when they came from somewhere else than the text. */
  placeProvenance?: FieldProvenance;
  /** True when no provider answered and this draft is local salvage. */
  degraded?: boolean;
}

/**
 * How much each preference is worth when judging how well we understood a day.
 *
 * Not a flat count: interests and time are what the matching engine and the scheduler
 * actually turn into a different itinerary, while budget, pace and mobility refine one.
 * Weighting them equally meant a sentence that named everything a traveller normally says
 * — "half a day in Casablanca, culture and food, medium budget, not too much walking" —
 * still lost a fifth of its score for not volunteering a pace, and landed a step below the
 * band it deserved.
 */
const PREFERENCE_WEIGHT: Record<string, number> = {
  interests: 2,
  timeAvailable: 2,
  budgetLevel: 1,
  pace: 1,
  mobility: 1,
};

const PREFERENCE_FIELDS: readonly DraftField[] = [
  "interests",
  "timeAvailable",
  "budgetLevel",
  "pace",
  "mobility",
] as const;

const TOTAL_PREFERENCE_WEIGHT = PREFERENCE_FIELDS.reduce(
  (total, field) => total + PREFERENCE_WEIGHT[field],
  0,
);

/**
 * How confident we are overall, as a blend of three things we weight differently:
 *
 * - **grounding** — did the named place resolve to a curated POI? That is the only
 *   verifiable claim in the whole draft, so a local match is worth more than any number
 *   the model reports about itself.
 * - **coverage** — how much of the day the input actually described.
 * - **self-report** — what the model claims, at a quarter of the weight. It is the least
 *   trustworthy input here and is never allowed to carry a draft on its own.
 *
 * Image and URL inputs lean on grounding; typed and spoken input leans on coverage,
 * because a sentence about a half-day in Casablanca is complete without naming a monument.
 */
export function scoreDraft(draft: TripIntentDraft, selfReport = 0): number {
  const placeOriented = draft.source === "image" || draft.source === "url";

  const grounding = draft.destination.detectedPoiId
    ? Math.max(0.85, draft.destination.confidence)
    : draft.destination.detectedPlace
      ? draft.destination.confidence * 0.7
      : draft.destination.city
        ? 0.7
        : 0.2;

  const filled = PREFERENCE_FIELDS.filter((field) => {
    if (field === "interests") return draft.interests.length > 0;
    if (field === "mobility") return draft.mobility.avoidLongWalks !== null;
    return draft[field as "timeAvailable" | "budgetLevel" | "pace"] !== null;
  }).reduce((total, field) => total + PREFERENCE_WEIGHT[field], 0);
  const coverage = filled / TOTAL_PREFERENCE_WEIGHT;

  /* A photo or a video thumbnail is *about* a place and says almost nothing about a
     budget; judging it on coverage would score a perfect landmark match as a shrug.
     A typed or spoken sentence is the reverse. Hence two weightings, not one. */
  const groundingWeight = placeOriented ? 0.6 : 0.25;
  const coverageWeight = placeOriented ? 0.15 : 0.6;
  const selfWeight = 0.25;

  const total =
    (grounding * groundingWeight + coverage * coverageWeight + selfReport * selfWeight) /
    (groundingWeight + coverageWeight + selfWeight);

  // Without a model we are guessing at the preferences, whatever the local match says.
  const ceiling = draft.degraded ? 0.45 : 1;
  return Number(Math.min(ceiling, clampConfidence(total)).toFixed(3));
}

/** Everything the draft did not learn. The confirmation screen asks about these. */
export function uncertainFieldsOf(draft: TripIntentDraft): DraftField[] {
  const uncertain: DraftField[] = [];
  if (!draft.destination.city) uncertain.push("city");
  if (!draft.destination.detectedPoiId && draft.destination.detectedPlace) {
    uncertain.push("detectedPoiId");
  }
  if (draft.interests.length === 0) uncertain.push("interests");
  if (!draft.timeAvailable) uncertain.push("timeAvailable");
  if (!draft.budgetLevel) uncertain.push("budgetLevel");
  if (!draft.pace) uncertain.push("pace");
  if (draft.mobility.avoidLongWalks === null) uncertain.push("mobility");
  return uncertain;
}

/**
 * The single constructor. Every modality funnels through here, so a draft from a TikTok
 * link and a draft from a spoken sentence are the same object with different evidence.
 */
export function buildDraft(input: BuildDraftInput): TripIntentDraft {
  const raw = (input.model && typeof input.model === "object" ? input.model : {}) as RawIntent;
  const evidence = { ...createEmptyDraft(input.source, input.locale).evidence, ...input.evidence };
  const provenanceTag = input.provenance ?? (input.degraded ? "fallback" : "text");
  const placeTag = input.placeProvenance ?? provenanceTag;

  const modelPlace = pickString(raw.detectedPlace);
  const city = pickString(raw.city);

  /* Grounding: the model names a place in words, the dataset decides whether that is an
     id. Text clues are searched too, in order of how much they are about a place — the
     model's own answer, then OCR, a video title, a caption, and finally what the traveller
     typed or said. Deliberately a priority chain rather than one concatenated blob: two
     POIs mentioned in the same sentence must not blend into a third. */
  const groundingText =
    modelPlace ??
    evidence.ocrText ??
    evidence.urlTitle ??
    evidence.urlDescription ??
    evidence.transcript ??
    null;
  const detectedPoiId = resolvePoiId(modelPlace) ?? resolvePoiId(groundingText);
  const named = resolvePoiCandidates(groundingText, { city, limit: 3 });

  /* Coverage, not recognition. A photo of Sidi Bouzid beach is read correctly — the
     dataset simply stops at El Jadida's curated stops. Offering the closest thing we do
     cover, clearly labelled as such, is the honest middle between inventing a match and
     handing back nothing. Only when nothing was named, so it can never outrank a real
     match, and never when the town itself is outside the region.

     It also requires the model to have named a place at all. "Culture and food in
     Casablanca" names none, and answering it with "did you mean Mosquée Hassan II?" is
     not a coverage gap — it is a suggestion nobody asked for, attached to a sentence that
     was already fully understood. Coverage exists for the case where we recognised
     somewhere real and cannot offer it; no place named means there is nothing to be
     honest about. */
  const candidates =
    named.length > 0
      ? named
      : modelPlace
        ? coverageCandidates(city, { interests: pickInterests(raw.interests), limit: 2 })
        : [];

  /* When the evidence grounded but the model named nothing, we can still say the place —
     using the dataset's own name for it, never a phrase we made up. */
  const detectedPlace =
    modelPlace ??
    candidates.find(
      (candidate) => candidate.kind !== "coverage" && candidate.poiId === detectedPoiId,
    )?.name ??
    null;

  const interests = pickInterests(raw.interests);
  const timeAvailable = pickEnum(raw.timeAvailable, TIME_VALUES);
  const budgetLevel = pickEnum(raw.budgetLevel, BUDGET_VALUES);
  const pace = pickEnum(raw.pace, PACE_VALUES);
  const avoidLongWalks = pickBoolean(raw.avoidLongWalks);

  const provenance: TripIntentDraft["provenance"] = {};
  if (city) provenance.city = placeTag;
  if (detectedPlace) provenance.detectedPlace = placeTag;
  if (detectedPoiId) provenance.detectedPoiId = placeTag;
  if (interests.length > 0) provenance.interests = provenanceTag;
  if (timeAvailable) provenance.timeAvailable = provenanceTag;
  if (budgetLevel) provenance.budgetLevel = provenanceTag;
  if (pace) provenance.pace = provenanceTag;
  if (avoidLongWalks !== null) provenance.mobility = provenanceTag;

  const constraints = pickStrings(raw.constraints, 6);
  if (constraints.length > 0) provenance.constraints = provenanceTag;

  const partial: TripIntentDraft = {
    ...createEmptyDraft(input.source, input.locale),
    source: input.source,
    destination: {
      region: pickString(raw.region),
      city,
      detectedPlace,
      detectedPoiId,
      confidence: clampConfidence(input.placeConfidence ?? (detectedPoiId ? 0.8 : 0)),
    },
    candidates,
    interests,
    timeAvailable,
    budgetLevel,
    pace,
    mobility: { avoidLongWalks },
    constraints,
    evidence,
    provenance,
    degraded: input.degraded ?? false,
    locale: input.locale,
  };

  const confidence = scoreDraft(partial, pickConfidence(raw.confidence));
  const scored: TripIntentDraft = {
    ...partial,
    confidence,
    band: bandOf(confidence),
    uncertainFields: uncertainFieldsOf(partial),
  };

  // Belt to the braces: the assembled object crosses the schema before it leaves.
  return parseTripIntentDraft(scored, input.source, input.locale);
}

/**
 * A deliberate choice outranks the model, always — the same rule the profile extractor
 * has always followed. The model fills gaps; it never overwrites a tap.
 */
export function mergeKnown(
  draft: TripIntentDraft,
  known: Partial<TripProfile> | undefined,
): TripIntentDraft {
  if (!known) return draft;

  const merged: TripIntentDraft = {
    ...draft,
    destination: { ...draft.destination },
    mobility: { ...draft.mobility },
    provenance: { ...draft.provenance },
  };

  if (known.destination) {
    merged.destination.city = known.destination;
    merged.provenance.city = "manual";
  }
  if (known.detectedPlace) {
    merged.destination.detectedPlace = known.detectedPlace;
    merged.provenance.detectedPlace = "manual";
  }
  if (known.detectedPoiId) {
    merged.destination.detectedPoiId = known.detectedPoiId;
    merged.provenance.detectedPoiId = "manual";
  }
  if (known.interests && known.interests.length > 0) {
    merged.interests = known.interests.slice(0, 3);
    merged.provenance.interests = "manual";
  }
  for (const field of ["timeAvailable", "budgetLevel", "pace"] as const) {
    const value = known[field];
    if (value) {
      // Narrow through the union one field at a time; each is a different enum.
      (merged[field] as typeof value) = value;
      merged.provenance[field] = "manual";
    }
  }
  if (known.walkingPreference) {
    merged.mobility.avoidLongWalks = known.walkingPreference === "minimal";
    merged.provenance.mobility = "manual";
  }

  merged.uncertainFields = uncertainFieldsOf(merged);
  return merged;
}

/** The one place `avoidLongWalks` becomes the engine's vocabulary. */
export function walkingPreferenceOf(
  avoidLongWalks: boolean | null,
): WalkingPreference | null {
  if (avoidLongWalks === null) return null;
  return avoidLongWalks ? "minimal" : "normal";
}
