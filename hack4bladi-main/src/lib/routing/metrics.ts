/**
 * Pure route arithmetic. Lead-owned on purpose: the trip engine and the adaptation
 * engine must produce identical numbers, or the before/after demo lies.
 */
import { FALLBACK_SPEED } from "@/config/app";
import type { MadRange } from "@/types/common";
import type { POI } from "@/types/poi";
import type { RouteMetrics, RouteSegment, TravelMode, TripStop } from "@/types/trip";

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

/**
 * Streets are not straight lines. Calibrated against the specification's own golden day
 * (Q56): its three legs are 2000 m / 1219 m / 2048 m apart as the crow flies and are
 * quoted at 2.4 km / 1.5 km / 2.5 km on foot — a consistent ~1.22.
 */
export const STREET_DETOUR_FACTOR = 1.22;

/**
 * The single leg estimator. Both the trip engine and trip generation call it, so the
 * arrival times and the distances printed beside them can never disagree.
 */
export function estimateLeg(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  comfortMeters: number,
): { distanceMeters: number; mode: TravelMode; durationMinutes: number } {
  const distanceMeters = Math.round(haversineMeters(from, to) * STREET_DETOUR_FACTOR);
  const mode: TravelMode = distanceMeters > comfortMeters ? "car" : "walking";
  return { distanceMeters, mode, durationMinutes: estimateDurationMinutes(distanceMeters, mode) };
}

/** Straight-line duration estimate, used when no routing provider answers. */
export function estimateDurationMinutes(distanceMeters: number, mode: TravelMode): number {
  const kmh = mode === "walking" ? FALLBACK_SPEED.walkingKmh : FALLBACK_SPEED.carKmh;
  return Math.max(1, Math.round((distanceMeters / 1000 / kmh) * 60));
}

const PRICE_BANDS: Record<POI["priceRange"], MadRange> = {
  free: [0, 0],
  "0_30": [0, 30],
  "30_60": [30, 60],
  "60_150": [60, 150],
  "150_300": [150, 300],
  "300_plus": [300, 500],
  unknown: [0, 0],
};

/**
 * What one stop costs, low and high.
 *
 * Exported because the trip engine now prices a day *before* it commits to it, and it has
 * to price it exactly the way `estimateCostMad` will once the day is on screen — a
 * selector working off a second, rougher table would fit a budget the brief then reports
 * as broken.
 */
export function poiCostRange(poi: POI): MadRange {
  return poi.approxPriceMad ?? PRICE_BANDS[poi.priceRange];
}

export function estimateCostMad(stops: TripStop[]): MadRange {
  return stops.reduce<MadRange>(
    (total, stop) => {
      const band = poiCostRange(stop.poi);
      return [total[0] + band[0], total[1] + band[1]];
    },
    [0, 0],
  );
}

export function calculateMetrics(stops: TripStop[], segments: RouteSegment[]): RouteMetrics {
  let walkingMeters = 0;
  let carMeters = 0;
  let movementMinutes = 0;

  for (const segment of segments) {
    if (segment.mode === "walking") walkingMeters += segment.distanceMeters;
    else carMeters += segment.distanceMeters;
    movementMinutes += segment.durationMinutes;
  }

  const activityMinutes = stops.reduce((sum, stop) => sum + stop.durationMinutes, 0);

  return {
    walkingMeters,
    carMeters,
    movementMinutes,
    activityMinutes,
    totalMinutes: activityMinutes + movementMinutes,
    estimatedCostMad: estimateCostMad(stops),
  };
}
