/**
 * The parts every adapter needs. Extracted when three placeholder adapters became real
 * ones: the car transform, the delta, and — new — rebuilding segments and re-timing the
 * day after the stops themselves change.
 *
 * All route numbers still come from calculateMetrics(). Nothing here does its own
 * arithmetic on totals.
 */
import { WALKING_COMFORT_METERS } from "@/config/app";
import { visitDurationMinutes } from "@/lib/matching/engine";
import { estimateDurationMinutes, estimateLeg } from "@/lib/routing/metrics";
import type { AdaptationDelta, AdaptationResult, AdaptationType } from "@/types/adaptation";
import type { ClockTime, LocalizedText, MadRange } from "@/types/common";
import type { POI, PriceRange } from "@/types/poi";
import type { TripProfile } from "@/types/profile";
import type { RouteMetrics, RouteSegment, Trip, TripStop } from "@/types/trip";

/** Roads are longer than the walked path; a car covers ~25% more ground door to door. */
const ROAD_DETOUR_FACTOR = 1.25;
/** Hailing, waiting and parking. A 3 km taxi ride is never just the driving time. */
const CAR_READY_MINUTES = 3;
/** Road distance is an estimate — 500 m grain, so we never fake precision we lack. */
const CAR_DISTANCE_GRAIN_M = 500;

export function toCarSegment(segment: RouteSegment): RouteSegment {
  const roadMeters = segment.distanceMeters * ROAD_DETOUR_FACTOR;
  return {
    ...segment,
    mode: "car",
    distanceMeters: Math.round(roadMeters / CAR_DISTANCE_GRAIN_M) * CAR_DISTANCE_GRAIN_M,
    durationMinutes: estimateDurationMinutes(roadMeters, "car") + CAR_READY_MINUTES,
    // The walking path is not the driving path. The map redraws a straight line until
    // /api/route answers with real car geometry.
    geometry: null,
    source: "fallback",
  };
}

export function buildDelta(before: RouteMetrics, after: RouteMetrics): AdaptationDelta {
  return {
    walkingMetersBefore: before.walkingMeters,
    walkingMetersAfter: after.walkingMeters,
    carMetersBefore: before.carMeters,
    carMetersAfter: after.carMeters,
    movementMinutesBefore: before.movementMinutes,
    movementMinutesAfter: after.movementMinutes,
    costBefore: before.estimatedCostMad,
    costAfter: after.estimatedCostMad,
    walkingReductionPercent:
      before.walkingMeters === 0
        ? 0
        : Math.round(((before.walkingMeters - after.walkingMeters) / before.walkingMeters) * 100),
    minutesSaved: before.movementMinutes - after.movementMinutes,
  };
}

export function unchanged(
  type: AdaptationType,
  trip: Trip,
  reason: LocalizedText,
): AdaptationResult {
  return {
    type,
    applied: false,
    trip,
    delta: buildDelta(trip.metrics, trip.metrics),
    headline: reason,
    changedSegmentIds: [],
    reason,
  };
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Clamped, never wrapped — matching the engine, so the two can never disagree. */
export function toClock(minutes: number): ClockTime {
  const clamped = Math.min(Math.max(Math.round(minutes), 0), 23 * 60 + 30);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** When the last visit ends — the honest answer to "what time am I done?". */
export function endMinutes(stops: TripStop[]): number {
  const last = stops[stops.length - 1];
  return toMinutes(last.arrivalTime) + last.durationMinutes;
}

// ---------------------------------------------------------------------------
// Rebuilding a day whose stops changed
// ---------------------------------------------------------------------------

/**
 * Straight-line segments for the current stops. Geometry is dropped on purpose: once a
 * stop is swapped, the old provider path belongs to a leg that no longer exists.
 */
export function segmentsFor(stops: TripStop[]): RouteSegment[] {
  return stops.slice(0, -1).map((stop, index) => {
    const next = stops[index + 1];
    const leg = estimateLeg(stop.poi.coordinates, next.poi.coordinates, WALKING_COMFORT_METERS);
    return {
      id: `segment-${index + 1}`,
      fromStopId: stop.id,
      toStopId: next.id,
      mode: leg.mode,
      distanceMeters: leg.distanceMeters,
      durationMinutes: leg.durationMinutes,
      geometry: null,
      source: "fallback" as const,
    };
  });
}

/**
 * Re-times the day from the start it already had, using the legs it now has.
 * Visit durations are respected; only arrival times move. Same 5-minute rounding as the
 * engine's `schedule()`.
 */
export function reschedule(stops: TripStop[], segments: RouteSegment[]): TripStop[] {
  let cursor = toMinutes(stops[0].arrivalTime);

  return stops.map((stop, index) => {
    if (index > 0) {
      const leg = segments[index - 1];
      cursor = Math.ceil((cursor + (leg?.durationMinutes ?? 0)) / 5) * 5;
    }
    const next = { ...stop, order: index + 1, arrivalTime: toClock(cursor) };
    cursor += stop.durationMinutes;
    return next;
  });
}

/**
 * A visit's length for a POI at the traveller's stated pace — the engine's own rule,
 * called rather than copied. A swapped-in workshop keeps its full booked duration.
 */
export function visitMinutes(poi: POI, profile: TripProfile): number {
  return visitDurationMinutes(poi, profile.pace);
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** Same bands the metrics module prices a day with, so a swap can be compared to it. */
const PRICE_BANDS: Record<PriceRange, MadRange> = {
  free: [0, 0],
  "0_30": [0, 30],
  "30_60": [30, 60],
  "60_150": [60, 150],
  "150_300": [150, 300],
  "300_plus": [300, 500],
  unknown: [0, 0],
};

/** The top of what this POI can cost to enter. */
export function poiCeilingMad(poi: POI): number {
  return (poi.approxPriceMad ?? PRICE_BANDS[poi.priceRange])[1];
}

/**
 * Replacement candidates: same city, not already in the day, still open for business.
 * Ranked by curation priority so a swap never drops the traveller somewhere weak.
 */
export function candidatesFor(trip: Trip, pool: POI[]): POI[] {
  const used = new Set(trip.stops.map((stop) => stop.poi.id));
  const city = trip.stops[0].poi.city.toLowerCase();

  return pool
    .filter(
      (poi) =>
        !used.has(poi.id) &&
        poi.city.toLowerCase() === city &&
        poi.availability.status !== "permanently_closed" &&
        poi.availability.status !== "temporarily_unavailable",
    )
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

/** A swap keeps the day's shape when the newcomer shares a category with what it replaces. */
export function sharesCategory(a: POI, b: POI): boolean {
  return a.categories.some((category) => b.categories.includes(category));
}

/** Rebuild the whole day around a new stop list: fresh segments, then fresh times. */
export function rebuild(stops: TripStop[]): { stops: TripStop[]; segments: RouteSegment[] } {
  const segments = segmentsFor(stops);
  return { stops: reschedule(stops, segments), segments };
}
