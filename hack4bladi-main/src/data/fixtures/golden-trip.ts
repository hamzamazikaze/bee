/**
 * The golden Casablanca day. This object must render correctly with every external
 * service dead: Gemini, routing, weather and social metadata.
 *
 * Timings and distances come from docs/DEMO_PATH.md §Fallback metrics and are meant to
 * be edited there first. Segment geometry is null on purpose — the map draws straight
 * lines until the routing provider returns a real path.
 */
import { calculateMetrics } from "@/lib/routing/metrics";
import type { TripProfile } from "@/types/profile";
import type { RouteSegment, Trip, TripStop } from "@/types/trip";
import { GOLDEN_POIS } from "./golden-pois";

export const GOLDEN_PROFILE: TripProfile = {
  destination: "Casablanca",
  detectedPlace: "Hassan II Mosque",
  detectedPoiId: "poi-hassan-ii",
  interests: ["culture", "food", "art_creative"],
  timeAvailable: "full_day",
  budgetLevel: "medium",
  pace: "balanced",
  walkingPreference: "normal",
  locale: "en",
  confidence: { destination: 0.97, detectedPlace: 0.93, interests: 0.91 },
  sources: ["image", "voice"],
  social: null,
  transcript: null,
  createdAt: "2026-01-01T08:00:00.000Z",
};

const SCHEDULE = [
  { arrivalTime: "09:30", durationMinutes: 75 },
  { arrivalTime: "11:30", durationMinutes: 75 },
  { arrivalTime: "14:00", durationMinutes: 60 },
  { arrivalTime: "15:40", durationMinutes: 90 },
] as const;

export const GOLDEN_STOPS: TripStop[] = GOLDEN_POIS.map((poi, index) => ({
  id: `stop-${index + 1}`,
  order: index + 1,
  poiId: poi.id,
  poi,
  arrivalTime: SCHEDULE[index].arrivalTime,
  durationMinutes: SCHEDULE[index].durationMinutes,
  visitState: "upcoming",
}));

/** All walking — this is the "before" the Less Walking adaptation improves on. */
export const GOLDEN_SEGMENTS: RouteSegment[] = [
  {
    id: "segment-1",
    fromStopId: "stop-1",
    toStopId: "stop-2",
    mode: "walking",
    distanceMeters: 2400,
    durationMinutes: 30,
    geometry: null,
    source: "fallback",
  },
  {
    id: "segment-2",
    fromStopId: "stop-2",
    toStopId: "stop-3",
    mode: "walking",
    distanceMeters: 1500,
    durationMinutes: 19,
    geometry: null,
    source: "fallback",
  },
  {
    id: "segment-3",
    fromStopId: "stop-3",
    toStopId: "stop-4",
    mode: "walking",
    distanceMeters: 2500,
    durationMinutes: 33,
    geometry: null,
    source: "fallback",
  },
];

export const GOLDEN_TRIP: Trip = {
  id: "trip-golden-casablanca",
  createdAt: "2026-01-01T08:00:00.000Z",
  destination: "Casablanca",
  locale: "en",
  profile: GOLDEN_PROFILE,
  stops: GOLDEN_STOPS,
  segments: GOLDEN_SEGMENTS,
  metrics: calculateMetrics(GOLDEN_STOPS, GOLDEN_SEGMENTS),
  vibe: ["culture", "food"],
  baseRouteId: null,
  isFallback: true,
  weather: {
    city: "Casablanca",
    temperatureC: 24,
    condition: "sunny",
    label: { en: "Sunny", fr: "Ensoleillé", ar: "مشمس" },
  },
};

/** Deep clone, so callers can mutate a trip without poisoning the fixture. */
export function cloneGoldenTrip(): Trip {
  return structuredClone(GOLDEN_TRIP);
}
