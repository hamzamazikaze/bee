import type { ClockTime, Coordinates, LocalizedText, MadRange, Locale, Weekday } from "./common";
import type { Interest } from "./profile";

/** The six POI categories are the six interests. One union, one matching rule. */
export type POICategory = Interest;

/**
 * What kind of stop this is.
 *
 * A day of four monuments is a sightseeing list; a day that mixes seeing, meeting, making
 * and tasting is an experience. This field is what lets the engine tell the difference.
 * Absent means `place` — every POI curated before experiences existed stays exactly as it
 * was, and nothing downstream has to change to read it.
 */
export type ExperienceKind = "place" | "local_activity" | "workshop" | "food_experience";

/** How sure we are that a partner is real. Never presented as more than it is. */
export type PartnerStatus =
  /** Our own curated MVP content. Not a commercial agreement. */
  | "demo"
  /** A partner who has agreed. Only set this when that is actually true. */
  | "confirmed";

export type PartnerType = "artisan" | "local_host" | "food" | "guide" | "cooperative";

export interface ExperienceHost {
  /** Shown as-is when we have a real name, else a neutral role. */
  name: string;
  displayName?: Partial<LocalizedText>;
}

export interface ExperiencePrice {
  amount?: number;
  min?: number;
  max?: number;
  currency: "MAD";
}

/** A partner offer the wallet can unlock. Percentage or flat, never both. */
export interface ExperienceDiscount {
  percent?: number;
  amountMAD?: number;
  /** Coins the traveller must spend to unlock it. */
  minimumCoins: number;
}

/**
 * Everything a stop needs to read as a bookable human experience rather than a location.
 * Optional throughout: a `place` has none of it.
 */
export interface ExperienceMeta {
  host?: ExperienceHost;
  capacity?: number;
  bookingRequired?: boolean;
  price?: ExperiencePrice;
  /** What the traveller actually does, localised. */
  includes?: LocalizedText[];
  /** What they walk away knowing, localised. */
  skills?: LocalizedText[];
  /** Overrides the per-kind default in @/config/rewards. */
  rewardCoins?: number;
  discount?: ExperienceDiscount;
  partnerStatus: PartnerStatus;
  partnerType?: PartnerType;
  /** Money spent here reaches a local person rather than a chain. */
  supportsLocalBusiness?: boolean;
}

export type CoordinateType = "exact" | "representative";
export type VerificationStatus = "verified" | "needs_verification" | "unverified";
export type AvailabilityStatus =
  | "open"
  | "seasonal"
  | "temporarily_unavailable"
  | "permanently_closed"
  | "unknown";
export type IndoorOutdoor = "indoor" | "outdoor" | "mixed";

export type PriceRange = "free" | "0_30" | "30_60" | "60_150" | "150_300" | "300_plus" | "unknown";

/** 1 = very easy … 5 = significant walking. Numeric internally, humanised in the UI. */
export type WalkingScore = 1 | 2 | 3 | 4 | 5;

export interface TimeWindow {
  open: ClockTime;
  close: ClockTime;
}

export interface OpeningHours {
  /** An empty array for a weekday means closed that day. */
  weekly: Record<Weekday, TimeWindow[]>;
  notes?: LocalizedText;
  needsVerification: boolean;
}

export interface POIMedia {
  heroImage: string;
  /** MUST be a local asset — the demo cannot depend on a remote image. */
  fallbackImage: string;
  gallery?: string[];
  heroVideo?: string | null;
  credit?: string;
  /**
   * A recording of the host, in their own voice, saying what this experience is.
   *
   * DATA HONESTY. This is the host speaking, not narration and not a synthesised voice
   * standing in for a real person — the UI attributes it to them by name. Absent means
   * absent: the "Hear from your host" control simply does not render, and the experience
   * reads exactly as it does today. Never populate it with generated audio.
   *
   * See public/audio/README.md for the files this dataset is waiting on.
   */
  hostAudio?: string | null;
}

export interface CulturalContent {
  /** 3–4 lines. Not an encyclopedia entry. */
  story: LocalizedText;
  tip: LocalizedText;
  /** Pre-generated narration per locale. Never runtime TTS. */
  audio?: Partial<Record<Locale, string>>;
}

export interface POIAvailability {
  status: AvailabilityStatus;
  note?: LocalizedText;
  /** ISO date the status was last confirmed. */
  checkedAt?: string;
}

export interface POISource {
  name: string;
  url?: string;
}

export interface POI {
  id: string;
  slug: string;
  name: string;
  localizedName?: Partial<LocalizedText>;
  city: string;
  region: string;
  coordinates: Coordinates;
  coordinateType: CoordinateType;
  categories: POICategory[];
  /** Absent means "place". Only experiential stops set this. */
  kind?: ExperienceKind;
  /** Present only when `kind` is not "place". */
  experience?: ExperienceMeta;
  /** 4–6 free-form precision tags. */
  tags: string[];
  openingHours: OpeningHours | null;
  baseDurationMinutes: number;
  priceRange: PriceRange;
  /** Known fixed admission, when verified. */
  approxPriceMad?: MadRange | null;
  indoorOutdoor: IndoorOutdoor;
  walkingScore: WalkingScore;
  cultural: CulturalContent;
  media: POIMedia;
  /** Eligible as a regional hero card. */
  hero: boolean;
  /** Must-see: fills the signature slot in the 2+1+1 selection pattern. */
  signature: boolean;
  /** Curation weight, 1 (low) … 5 (high). */
  priority: number;
  verification: VerificationStatus;
  availability: POIAvailability;
  sources?: POISource[];
  baseRouteIds?: string[];
}
