/**
 * Where a stop on the map actually came from — and therefore what we are allowed to say
 * about it.
 *
 * THE PROBLEM THIS SOLVES. The trip screen used to print a shield beside every stop under
 * a heading that said "Verified places", next to a line claiming the app never invents a
 * location or a coordinate. Two of those three things were not true of every day. The
 * planner cannot invent a place — the model is never asked for an id and `resolvePoiId`
 * grounds its answer against the curated dataset — but the conversational guide is
 * deliberately allowed to author stops the catalogue does not have, with its own
 * coordinates (see `syntheticPoi` in @/lib/ai/curator). The data already recorded that
 * honestly; the interface simply never read it.
 *
 * NOTHING NEW IS INVENTED HERE. This reads two facts that already exist:
 *
 *   1. is this id in the curated dataset at all?  → `getPoiById`
 *   2. what does the dataset say about it?        → `POI.verification`
 *
 * Deliberately free of React and of any `server-only` import so it stays unit-testable.
 */
import { getPoiById } from "@/data/pois";
import type { POI } from "@/types/poi";
import type { Trip } from "@/types/trip";

/**
 * What we can honestly tell a traveller about a stop.
 *
 * These are *presentation* states, not a fifth column in the dataset. They are derived,
 * never stored, so there is exactly one place to change if the data model grows.
 */
export type PoiProvenance =
  /** In the curated dataset, and its coordinates were corroborated against OSM. */
  | "verified"
  /** In the curated dataset, but the coordinate or the hours are still curated guesses. */
  | "curated"
  /** Authored by the AI guide because the catalogue did not cover the ask. */
  | "ai_suggested"
  /** We cannot tell. Says nothing rather than guessing — see `poiProvenance`. */
  | "unknown";

/**
 * The id prefix `syntheticPoi` stamps on every stop the model authored.
 *
 * It is the only writer of this prefix, and `parsePicks` refuses an id the catalogue
 * already holds, so it cannot collide with a curated `poi-*` or `exp-*` id.
 */
const AI_ID_PREFIX = "ai-";

/**
 * Which of the four a stop is.
 *
 * The dataset is consulted by id rather than trusting the object in hand, and that is
 * deliberate: a trip restored from localStorage was serialised by an older build, and its
 * copy of `verification` may be stale or absent. The live dataset is the truth about a
 * curated id; the object only gets to speak for itself when the dataset has never heard
 * of it.
 *
 * The one rule that matters: **missing or unrecognised information never becomes a claim.**
 * Anything this function cannot place lands on `"unknown"`, and `"unknown"` renders no
 * badge at all.
 */
export function poiProvenance(poi: Pick<POI, "id" | "verification"> | null | undefined): PoiProvenance {
  if (!poi || typeof poi.id !== "string") return "unknown";

  const curated = getPoiById(poi.id);
  if (curated) {
    switch (curated.verification) {
      case "verified":
        return "verified";
      case "needs_verification":
      case "unverified":
        /*
         * Both mean "ours, but not corroborated", and they are one thing to a traveller.
         * They are NOT the same as an AI suggestion and must never be labelled as one:
         * `unverified` is what the six curated experiences carry, because they are our own
         * MVP content rather than a signed partner — a real place we wrote down, not a
         * place a model produced.
         */
        return "curated";
      default:
        return "unknown";
    }
  }

  /* Not in the dataset. Only the guide's own stops are identifiable, and only they get
     labelled; anything else unrecognised stays silent rather than being accused. */
  return poi.id.startsWith(AI_ID_PREFIX) ? "ai_suggested" : "unknown";
}

/** True for the stops the guide wrote itself. The one state that needs flagging inline. */
export function isAiSuggested(poi: Pick<POI, "id" | "verification"> | null | undefined): boolean {
  return poiProvenance(poi) === "ai_suggested";
}

export interface ProvenanceCounts {
  verified: number;
  curated: number;
  aiSuggested: number;
  unknown: number;
  /** Everything the curated dataset vouches for: `verified` + `curated`. */
  fromDataset: number;
  total: number;
}

export function countProvenance(
  pois: readonly (Pick<POI, "id" | "verification"> | null | undefined)[],
): ProvenanceCounts {
  const counts: ProvenanceCounts = {
    verified: 0,
    curated: 0,
    aiSuggested: 0,
    unknown: 0,
    fromDataset: 0,
    total: pois.length,
  };

  for (const poi of pois) {
    switch (poiProvenance(poi)) {
      case "verified":
        counts.verified += 1;
        counts.fromDataset += 1;
        break;
      case "curated":
        counts.curated += 1;
        counts.fromDataset += 1;
        break;
      case "ai_suggested":
        counts.aiSuggested += 1;
        break;
      default:
        counts.unknown += 1;
    }
  }

  return counts;
}

export function tripProvenance(trip: Trip): ProvenanceCounts {
  return countProvenance(trip.stops.map((stop) => stop.poi));
}

/** A message key under `trip.provenance.` plus the numbers it interpolates. */
export interface ProvenanceSummary {
  key:
    | "trip.provenance.summaryVerified"
    | "trip.provenance.summaryCurated"
    | "trip.provenance.summaryMixed"
    | "trip.provenance.summaryAi"
    | "trip.provenance.summaryNeutral";
  params: Record<string, number>;
}

/**
 * The headline claim for a whole day, and the narrowest one its stops support.
 *
 * The ordering is the whole point. Each branch is only reached when every stronger claim
 * has already been ruled out, so the sentence on screen can never outrun the data:
 *
 *   every stop verified          → "4 verified places"
 *   every stop ours, some not corroborated → "4 curated places"   (verified ⊂ curated)
 *   any stop the guide authored  → "3 curated · 1 AI"
 *   anything we cannot place     → "4 places"                     (a count, not a claim)
 */
export function provenanceSummary(counts: ProvenanceCounts): ProvenanceSummary {
  const { verified, aiSuggested, unknown, fromDataset, total } = counts;

  if (aiSuggested > 0) {
    return fromDataset === 0
      ? { key: "trip.provenance.summaryAi", params: { n: aiSuggested } }
      : {
          key: "trip.provenance.summaryMixed",
          params: { dataset: fromDataset, ai: aiSuggested },
        };
  }

  /* One stop we cannot place is enough to withdraw the claim for the whole day: a summary
     is a statement about all of them. */
  if (unknown > 0) return { key: "trip.provenance.summaryNeutral", params: { n: total } };

  if (verified === total && total > 0) {
    return { key: "trip.provenance.summaryVerified", params: { n: total } };
  }

  return { key: "trip.provenance.summaryCurated", params: { n: total } };
}
