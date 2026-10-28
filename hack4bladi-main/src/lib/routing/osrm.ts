/**
 * OSRM routing provider — public demo server, no API key.
 *
 * Every failure here is *expected*, not exceptional: the demo runs on hotel Wi-Fi.
 * The provider therefore never throws and never returns a short array; it degrades to
 * a straight-line estimate with `geometry: null`, which the map draws as a straight line.
 */
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { estimateDurationMinutes, haversineMeters } from "@/lib/routing/metrics";
import type { RoutingProvider, SegmentRequest, SegmentResult } from "@/lib/routing/types";
import type { Coordinates } from "@/types/common";
import type { TravelMode } from "@/types/trip";

const PROFILE: Record<TravelMode, string> = { walking: "foot", car: "driving" };

/** Straight line + average speed. The floor every routing call lands on. */
export function fallbackSegment({ from, to, mode }: SegmentRequest): SegmentResult {
  const distanceMeters = haversineMeters(from, to);
  return {
    mode,
    distanceMeters,
    durationMinutes: estimateDurationMinutes(distanceMeters, mode),
    geometry: null,
    source: "fallback",
  };
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** OSRM answers [lng, lat]; the domain speaks {lat, lng}. */
function decodeGeometry(value: unknown): Coordinates[] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const path: Coordinates[] = [];
  for (const point of value) {
    if (!Array.isArray(point) || !isNumber(point[0]) || !isNumber(point[1])) return null;
    path.push({ lat: point[1], lng: point[0] });
  }
  return path;
}

function parse(request: SegmentRequest, payload: unknown): SegmentResult | null {
  if (!payload || typeof payload !== "object") return null;
  const routes = (payload as { routes?: unknown }).routes;
  if (!Array.isArray(routes) || routes.length === 0) return null;

  const route = routes[0] as { distance?: unknown; duration?: unknown; geometry?: unknown };
  if (!isNumber(route.distance) || !isNumber(route.duration)) return null;

  const geometry = decodeGeometry(
    (route.geometry as { coordinates?: unknown } | undefined)?.coordinates,
  );

  return {
    mode: request.mode,
    distanceMeters: Math.round(route.distance),
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
    geometry,
    source: "provider",
  };
}

/**
 * Bounds a call by TIMEOUTS.routingSegmentMs while still honouring the caller's signal.
 * A provider that can hang forever is a bug (docs/FALLBACKS.md §1).
 */
function bounded(signal: AbortSignal | undefined, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const forward = () => controller.abort();
  signal?.addEventListener("abort", forward, { once: true });
  return {
    signal: controller.signal,
    release: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forward);
    },
  };
}

async function calculateSegment(
  request: SegmentRequest,
  signal?: AbortSignal,
): Promise<SegmentResult> {
  const { from, to, mode } = request;
  const url =
    `${serverEnv.routing.baseUrl}/route/v1/${PROFILE[mode]}/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

  const bound = bounded(signal, TIMEOUTS.routingSegmentMs);
  try {
    const response = await fetch(url, {
      signal: bound.signal,
      cache: "no-store",
      headers: serverEnv.routing.apiKey
        ? { Authorization: `Bearer ${serverEnv.routing.apiKey}` }
        : undefined,
    });
    if (!response.ok) return fallbackSegment(request);
    return parse(request, await response.json()) ?? fallbackSegment(request);
  } catch {
    // Timeout, DNS, offline, malformed JSON — all the same answer.
    return fallbackSegment(request);
  } finally {
    bound.release();
  }
}

export const osrmProvider: RoutingProvider = {
  name: "osrm",
  calculateSegment,
  /** One result per request, in order. Promise.all preserves order; nothing rejects. */
  calculateRoute: (requests, signal) =>
    Promise.all(requests.map((request) => calculateSegment(request, signal))),
};
