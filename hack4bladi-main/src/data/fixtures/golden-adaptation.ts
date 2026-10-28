/**
 * The Less Walking result for the golden day — the jury's wow moment, precomputed.
 *
 * Same four stops, same narrative order, same arrival times (the 16:00 Hassan II guided
 * visit is an anchor we do not move). Two long walking segments become car; the saving
 * is 40 minutes of movement, not 40 minutes off the end of the day.
 *
 * Segments 1 and 3 are the "changed" ones the map animates.
 */
import { calculateMetrics } from "@/lib/routing/metrics";
import type { AdaptationResult } from "@/types/adaptation";
import type { RouteSegment, Trip } from "@/types/trip";
import { GOLDEN_STOPS, GOLDEN_TRIP } from "./golden-trip";

export const GOLDEN_LESS_WALKING_SEGMENTS: RouteSegment[] = [
  {
    id: "segment-1",
    fromStopId: "stop-1",
    toStopId: "stop-2",
    mode: "car",
    distanceMeters: 3000,
    durationMinutes: 11,
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
    mode: "car",
    distanceMeters: 3000,
    durationMinutes: 12,
    geometry: null,
    source: "fallback",
  },
];

const adaptedTrip: Trip = {
  ...GOLDEN_TRIP,
  segments: GOLDEN_LESS_WALKING_SEGMENTS,
  metrics: calculateMetrics(GOLDEN_STOPS, GOLDEN_LESS_WALKING_SEGMENTS),
};

const before = GOLDEN_TRIP.metrics;
const after = adaptedTrip.metrics;

export const GOLDEN_LESS_WALKING: AdaptationResult = {
  type: "less_walking",
  applied: true,
  trip: adaptedTrip,
  delta: {
    walkingMetersBefore: before.walkingMeters,
    walkingMetersAfter: after.walkingMeters,
    carMetersBefore: before.carMeters,
    carMetersAfter: after.carMeters,
    movementMinutesBefore: before.movementMinutes,
    movementMinutesAfter: after.movementMinutes,
    walkingReductionPercent: Math.round(
      ((before.walkingMeters - after.walkingMeters) / before.walkingMeters) * 100,
    ),
    minutesSaved: before.movementMinutes - after.movementMinutes,
  },
  headline: {
    en: "77% less walking · ~40 min saved",
    fr: "77 % de marche en moins · ~40 min gagnées",
    ar: "مشي أقل بنسبة 77٪ · توفير ~40 دقيقة",
  },
  changedSegmentIds: ["segment-1", "segment-3"],
};

export function cloneGoldenLessWalking(): AdaptationResult {
  return structuredClone(GOLDEN_LESS_WALKING);
}
