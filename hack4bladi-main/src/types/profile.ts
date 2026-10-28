import type { ConfidenceMap, Locale } from "./common";

/** Where a signal came from. Nothing is mandatory — any combination is valid. */
export type InputSource = "image" | "social_url" | "voice" | "text" | "manual" | "preset";

export type SocialPlatform = "tiktok" | "instagram" | "facebook" | "youtube" | "other";

/** The six interests. Identical to POICategory by design — matching stays trivial. */
export type Interest =
  | "culture"
  | "food"
  | "coast_nature"
  | "hidden_gems"
  | "art_creative"
  | "activities";

export const INTERESTS: readonly Interest[] = [
  "culture",
  "food",
  "coast_nature",
  "hidden_gems",
  "art_creative",
  "activities",
] as const;

export type BudgetLevel = "low" | "medium" | "premium";
export type TripPace = "relaxed" | "balanced" | "explorer";
export type TimeAvailable = "few_hours" | "half_day" | "full_day";
export type WalkingPreference = "minimal" | "normal" | "plenty";

export type TripProfileConfidenceKey =
  | "destination"
  | "detectedPlace"
  | "interests"
  | "timeAvailable"
  | "budgetLevel"
  | "pace";

export type TripProfileConfidence = ConfidenceMap<TripProfileConfidenceKey>;

/** Optional enrichment from a pasted social URL. Never a hard dependency. */
export interface SocialContext {
  platform: SocialPlatform;
  url: string;
  author?: string | null;
  title?: string | null;
  caption?: string | null;
  hashtags?: string[];
  thumbnailUrl?: string | null;
}

/**
 * The single structured hand-off from the AI layer to the local trip engine.
 * Every field is nullable: the app must work with whatever the user gave us.
 */
export interface TripProfile {
  destination: string | null;
  detectedPlace: string | null;
  /** Resolved against the curated dataset when the detected place matches a POI. */
  detectedPoiId: string | null;
  interests: Interest[];
  timeAvailable: TimeAvailable | null;
  budgetLevel: BudgetLevel | null;
  pace: TripPace | null;
  walkingPreference: WalkingPreference | null;
  locale: Locale;
  confidence: TripProfileConfidence;
  sources: InputSource[];
  social?: SocialContext | null;
  transcript?: string | null;
  /** ISO 8601 */
  createdAt: string;
}
