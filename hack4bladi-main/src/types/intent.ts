/**
 * TripIntentDraft — the one structure every modality produces.
 *
 * Image, voice, text and URL each have their own provider, and every one of them
 * hands back this. Downstream code must not care where the inspiration came from.
 *
 * A draft is not a TripProfile. It is what the AI *understood*, carrying its own
 * confidence and its own provenance; the profile is what the traveller *confirmed*.
 * `draftToProfile()` in @/lib/intent is the only bridge between the two.
 *
 * Every enum here is imported from @/types/profile. There are no parallel vocabularies.
 */
import type { Locale } from "./common";
import type { BudgetLevel, Interest, TimeAvailable, TripPace } from "./profile";

/** The four ways inspiration reaches us. */
export type IntentSource = "image" | "audio" | "text" | "url";

/**
 * Where a value came from. Internal: for debugging and confidence resolution, never a
 * provider name shown in the UI.
 */
export type FieldProvenance =
  | "image_visual"
  | "image_ocr"
  | "voice"
  | "text"
  | "url_title"
  | "url_description"
  | "url_thumbnail"
  | "manual"
  | "fallback";

/** Fields whose origin is worth keeping. */
export type DraftField =
  | "city"
  | "detectedPlace"
  | "detectedPoiId"
  | "interests"
  | "timeAvailable"
  | "budgetLevel"
  | "pace"
  | "mobility"
  | "constraints";

/** 0.80+ / 0.50–0.79 / below. Drives preselect vs. candidates vs. ask. */
export type ConfidenceBand = "high" | "medium" | "low";

export interface IntentDestination {
  region: string | null;
  city: string | null;
  detectedPlace: string | null;
  /** Only ever an id from the curated dataset, resolved locally. Never model-authored. */
  detectedPoiId: string | null;
  confidence: number;
}

/** A local POI the evidence might be pointing at, with the reason it scored. */
export interface PoiCandidate {
  poiId: string;
  name: string;
  city: string;
  /** 0..1 */
  score: number;
  /** Human-readable, for the dev trace: "matched hassan, ii". */
  reason: string;
  /**
   * How this candidate was reached.
   *
   * `name` — the input actually named it. `coverage` — it did not: the input named a real
   * place we simply do not cover, and this is the closest thing in the curated dataset.
   * The screen must not present the second as if it were the first, so the distinction
   * travels with the candidate rather than being re-derived from the score.
   */
  kind?: "name" | "coverage";
}

/** Raw material the draft was derived from. Kept so a low score can be re-read. */
export interface IntentEvidence {
  transcript: string | null;
  ocrText: string | null;
  urlTitle: string | null;
  urlDescription: string | null;
  urlAuthor: string | null;
  urlThumbnailUrl: string | null;
  visualClues: string[];
  /** Internal provider chain label, e.g. "tiktok_oembed+gemini". Dev trace only. */
  provider: string | null;
}

export interface IntentMobility {
  /** null = the input said nothing about walking. */
  avoidLongWalks: boolean | null;
}

export interface TripIntentDraft {
  source: IntentSource;
  destination: IntentDestination;
  /** Ranked local matches. Empty when nothing scored; never invented. */
  candidates: PoiCandidate[];
  interests: Interest[];
  timeAvailable: TimeAvailable | null;
  budgetLevel: BudgetLevel | null;
  pace: TripPace | null;
  mobility: IntentMobility;
  /** Free-text constraints the model heard, e.g. "no long walks", "back by 18:00". */
  constraints: string[];
  evidence: IntentEvidence;
  /** Overall 0..1. */
  confidence: number;
  band: ConfidenceBand;
  /** Names of fields we are not confident about — the UI asks about these. */
  uncertainFields: DraftField[];
  provenance: Partial<Record<DraftField, FieldProvenance>>;
  /** True when no model answered and the draft is whatever local parsing salvaged. */
  degraded: boolean;
  locale: Locale;
  /** ISO 8601 */
  createdAt: string;
}
