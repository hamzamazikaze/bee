import type { ClockTime, Coordinates, Locale, LocalizedText, MadRange } from "./common";
import type { POI } from "./poi";
import type { Interest, TripProfile } from "./profile";
import type { WeatherSummary } from "./experience";

export type TravelMode = "walking" | "car";

export type VisitState = "upcoming" | "current" | "visited" | "skipped";

/** MVP trips are always exactly 4 stops / 3 segments. Do not vary. */
export const TRIP_STOP_COUNT = 4;
export const TRIP_SEGMENT_COUNT = TRIP_STOP_COUNT - 1;

export interface RouteSegment {
  id: string;
  fromStopId: string;
  toStopId: string;
  mode: TravelMode;
  distanceMeters: number;
  durationMinutes: number;
  /** Decoded path. null → renderer draws a straight line between the two stops. */
  geometry: Coordinates[] | null;
  source: "provider" | "fallback";
}

export interface TripStop {
  /** Stable within a trip; segments reference these, not POI ids. */
  id: string;
  /** 1-based position in the day. */
  order: number;
  poiId: string;
  /** Denormalised so renderers never need a lookup table. */
  poi: POI;
  arrivalTime: ClockTime;
  durationMinutes: number;
  visitState: VisitState;
  /** Optional "why this stop" line. */
  reason?: LocalizedText;
}

export interface RouteMetrics {
  walkingMeters: number;
  carMeters: number;
  movementMinutes: number;
  activityMinutes: number;
  totalMinutes: number;
  estimatedCostMad: MadRange;
}

export interface Trip {
  id: string;
  /** ISO 8601 */
  createdAt: string;
  destination: string;
  locale: Locale;
  profile: TripProfile;
  /** Exactly TRIP_STOP_COUNT, ordered. */
  stops: TripStop[];
  /** Exactly TRIP_SEGMENT_COUNT, stop[i] → stop[i+1]. */
  segments: RouteSegment[];
  metrics: RouteMetrics;
  /** Headline vibe(s) for the trip header. */
  vibe: Interest[];
  baseRouteId?: string | null;
  /** true when built from local fallback data rather than live providers. */
  isFallback: boolean;
  weather?: WeatherSummary | null;
  /** The curator's voice, when a model chose the day: a headline and a line to the traveller. */
  guide?: { headline: string; note: string } | null;
}

/** Curated day templates. The engine personalises from these — it never returns them raw. */
export interface BaseRoute {
  id: string;
  slug: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  city: string;
  interests: Interest[];
  /** Ordered POI ids. */
  poiIds: string[];
  heroImage: string;
}
