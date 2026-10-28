/**
 * Trip engine contract. Lead-owned; the implementation belongs to the AI/Data worker.
 * The engine is deterministic and local — it never calls a model.
 */
import type { POI } from "@/types/poi";
import type { TripProfile } from "@/types/profile";
import type { BaseRoute, Trip, TripStop } from "@/types/trip";

export interface MatchInput {
  profile: TripProfile;
  pois: POI[];
  baseRoutes?: BaseRoute[];
  /**
   * Stops the curator proposed for this traveller, best first.
   *
   * Already validated against the dataset by @/lib/ai/curator, so these are ids we own —
   * but they are still only an opinion. The engine takes them first and then applies every
   * rule it always did: availability, the traveller's own named stop, budget and time
   * repair, and the narrative order. Empty or absent means the day is built exactly as it
   * was before there was a curator.
   */
  suggestedPoiIds?: string[];
  /** Injectable for deterministic tests. */
  now?: Date;
}

export interface MatchResult {
  /** Exactly TRIP_STOP_COUNT POIs, already in narrative order. */
  pois: POI[];
  baseRouteId: string | null;
  /** Debug/explainability only — not shown to the jury. */
  scores?: Record<string, number>;
}

export interface TripEngine {
  /** Selects and orders the stops. Pure, synchronous, always returns 4. */
  match(input: MatchInput): MatchResult;
  /** Turns matched POIs into timed stops. Routing is applied separately. */
  schedule(pois: POI[], profile: TripProfile, now?: Date): TripStop[];
}

/** Convenience shape for the /api generation route. */
export interface GenerateTripResult {
  trip: Trip;
  usedFallback: boolean;
}
