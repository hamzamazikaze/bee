import { cloneGoldenTrip } from "@/data/fixtures";
import { POIS } from "@/data/pois";
import { TIMEOUTS, WALKING_COMFORT_METERS } from "@/config/app";
import { match, schedule } from "@/lib/matching";
import { calculateMetrics, estimateLeg } from "@/lib/routing/metrics";
import type { Coordinates, LocalizedText } from "@/types/common";
import type { POI } from "@/types/poi";
import type { TripProfile } from "@/types/profile";
import { TRIP_STOP_COUNT, type RouteSegment, type Trip, type TripStop } from "@/types/trip";

/** A stop something upstream already chose, with the line it chose it for. */
export interface CuratorPick {
  poiId: string;
  reason: string;
}

/**
 * The real generation path: engine → routing → metrics.
 *
 * Never throws. Anything unexpected falls through to the golden Casablanca day carrying
 * the user's own profile, which is the local fallback branch of docs/FALLBACKS.md. The
 * processing screen enforces PROCESSING_MIN_MS and TIMEOUTS.tripGenerationMs around it.
 */

function localSegments(stops: TripStop[]): RouteSegment[] {
  return stops.slice(0, -1).map((stop, index) => {
    const next = stops[index + 1];
    const leg = estimateLeg(
      stop.poi.coordinates,
      next.poi.coordinates,
      WALKING_COMFORT_METERS,
    );
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
 * Asks the routing provider for GEOMETRY ONLY, and only to replace the straight lines on
 * the map. Its distances and durations are discarded: the public OSRM server answers with
 * driving data for every profile, so trusting them would put a 5-minute label on a
 * half-hour walk. Failure is silent — straight lines are a supported look.
 */
async function withRoutedGeometry(
  segments: RouteSegment[],
  stops: TripStop[],
): Promise<RouteSegment[]> {
  try {
    const response = await fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        segments: segments.map((segment, index) => ({
          from: stops[index].poi.coordinates,
          to: stops[index + 1].poi.coordinates,
          mode: segment.mode,
        })),
      }),
      signal: AbortSignal.timeout(TIMEOUTS.routingSegmentMs * segments.length),
    });
    if (!response.ok) return segments;

    const data: unknown = await response.json();
    const routed = (data as { segments?: { geometry?: Coordinates[] | null }[] }).segments;
    if (!Array.isArray(routed) || routed.length !== segments.length) return segments;

    return segments.map((segment, index) => {
      const geometry = routed[index]?.geometry;
      return Array.isArray(geometry) && geometry.length > 1
        ? { ...segment, geometry, source: "provider" as const }
        : segment;
    });
  } catch {
    return segments;
  }
}

/**
 * Asks the curator which of our stops belong in this person's day.
 *
 * Bounded and silent. No key, a slow model or an answer we cannot honour all return an
 * empty list, and `match()` then produces exactly the day it produced before — the
 * curator is an opinion the engine may have, never a dependency it needs.
 */
interface Curated {
  picks: CuratorPick[];
  headline: string;
  note: string;
  /** Model-authored stops (demo mode). The server built them; here they are just POIs. */
  pois: POI[];
}

const NOT_CURATED: Curated = { picks: [], headline: "", note: "", pois: [] };

/** The one shape check a synthetic POI gets on this side: enough to not crash the engine. */
export function readExtraPois(value: unknown): POI[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (poi): poi is POI =>
      typeof (poi as POI)?.id === "string" &&
      typeof (poi as POI)?.city === "string" &&
      typeof (poi as POI)?.coordinates?.lat === "number" &&
      typeof (poi as POI)?.coordinates?.lng === "number" &&
      Array.isArray((poi as POI)?.categories),
  );
}

async function curatedPicks(profile: TripProfile): Promise<Curated> {
  try {
    const response = await fetch("/api/curate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
      signal: AbortSignal.timeout(TIMEOUTS.curationMs),
    });
    if (!response.ok) return NOT_CURATED;

    const data = (await response.json()) as {
      picks?: unknown;
      headline?: unknown;
      note?: unknown;
      pois?: unknown;
    };
    if (!Array.isArray(data.picks)) return NOT_CURATED;

    return {
      picks: data.picks.filter(
        (pick): pick is CuratorPick =>
          typeof (pick as CuratorPick)?.poiId === "string" &&
          typeof (pick as CuratorPick)?.reason === "string",
      ),
      headline: typeof data.headline === "string" ? data.headline : "",
      note: typeof data.note === "string" ? data.note : "",
      pois: readExtraPois(data.pois),
    };
  } catch {
    return NOT_CURATED;
  }
}

/**
 * The curator's line replaces the engine's template for the stops it spoke about.
 *
 * The reason is authored in the traveller's own language, so every required key of
 * LocalizedText carries the same sentence: this is one traveller's day in one language,
 * not content we translated. A stop the curator did not mention keeps the engine's line.
 */
function withCuratorReasons(stops: TripStop[], picks: CuratorPick[]): TripStop[] {
  if (picks.length === 0) return stops;
  const byPoi = new Map(picks.filter((pick) => pick.reason).map((pick) => [pick.poiId, pick.reason]));

  return stops.map((stop) => {
    const reason = byPoi.get(stop.poiId);
    if (!reason) return stop;
    const localized: LocalizedText = { en: reason, fr: reason, ar: reason };
    return { ...stop, reason: localized };
  });
}

function goldenFallback(profile: TripProfile): Trip {
  const golden = cloneGoldenTrip();
  return {
    ...golden,
    id: `trip-${Date.now()}`,
    createdAt: new Date().toISOString(),
    locale: profile.locale,
    destination: profile.destination ?? golden.destination,
    profile,
    vibe: profile.interests.length > 0 ? profile.interests.slice(0, 2) : golden.vibe,
    isFallback: true,
  };
}

/**
 * @param chosen Stops already decided elsewhere — the guide's day, straight out of the
 * conversation. When present the curator is not asked: the traveller has just spent four
 * turns saying what they want, and going back to a one-shot prompt to re-decide it would
 * throw that away. Absent, this behaves exactly as it always did.
 * @param extraPois Stops the guide authored with those picks (demo mode), in the same shape
 * as the catalogue so the engine does not know the difference.
 */
export async function buildTrip(
  profile: TripProfile,
  chosen?: CuratorPick[],
  extraPois: POI[] = [],
): Promise<Trip> {
  try {
    const curated = chosen?.length
      ? { ...NOT_CURATED, picks: chosen, pois: extraPois }
      : await curatedPicks(profile);
    const picks = curated.picks;
    /* A model-authored day lives where the model put it: the pool must be that city, or
       the engine fills the day from Casablanca around one Marrakech stop. */
    const authored = curated.pois[0]?.city ?? null;
    const destination = authored ?? profile.destination;
    const sameCity = (poi: POI) => poi.city.toLowerCase() === authored?.toLowerCase();
    const { pois, baseRouteId } = match({
      profile: { ...profile, destination },
      pois: authored ? [...POIS.filter(sameCity), ...curated.pois] : POIS,
      suggestedPoiIds: picks.map((pick) => pick.poiId),
    });
    const stops = withCuratorReasons(schedule(pois, profile), picks);

    // The engine guarantees this; assert it anyway rather than render a broken day.
    if (stops.length !== TRIP_STOP_COUNT) return goldenFallback(profile);

    const segments = await withRoutedGeometry(localSegments(stops), stops);

    return {
      id: `trip-${Date.now()}`,
      createdAt: new Date().toISOString(),
      destination: stops[0].poi.city,
      locale: profile.locale,
      profile,
      stops,
      segments,
      metrics: calculateMetrics(stops, segments),
      vibe: profile.interests.slice(0, 2),
      baseRouteId,
      isFallback: segments.every((segment) => segment.source === "fallback"),
      weather: null,
      guide: curated.note || curated.headline ? { headline: curated.headline, note: curated.note } : null,
    };
  } catch {
    return goldenFallback(profile);
  }
}
