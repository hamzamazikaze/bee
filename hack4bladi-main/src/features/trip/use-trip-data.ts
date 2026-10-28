"use client";

/**
 * Two small client hooks that talk to the route and weather endpoints.
 * Both degrade silently: the day renders identically with the network off.
 */
import { useEffect, useMemo, useState } from "react";
import type { Coordinates } from "@/types/common";
import type { WeatherSummary } from "@/types/experience";
import type { SegmentResult } from "@/lib/routing/types";
import type { Trip } from "@/types/trip";

const geometryKey = (segmentId: string, mode: string) => `${segmentId}:${mode}`;

/**
 * Adds real street geometry to the segments — **for drawing only**.
 *
 * Distances, durations and metrics are never touched: they come from the trip engine and
 * are what the presenter reads out loud. A provider answering with slightly different
 * numbers must not move the before/after on stage. Segments we could not route keep
 * `geometry: null` and the map draws a straight line.
 */
export function useRoutedTrip(trip: Trip | null): Trip | null {
  const [paths, setPaths] = useState<Record<string, Coordinates[]>>({});

  const signature = trip
    ? `${trip.id}|${trip.segments.map((s) => geometryKey(s.id, s.mode)).join(",")}`
    : "";

  useEffect(() => {
    if (!trip) return;
    const controller = new AbortController();

    const points = new Map(trip.stops.map((stop) => [stop.id, stop.poi.coordinates]));
    const requests = trip.segments.map((segment) => ({
      from: points.get(segment.fromStopId),
      to: points.get(segment.toStopId),
      mode: segment.mode,
    }));
    if (requests.some((request) => !request.from || !request.to)) return;

    void (async () => {
      try {
        const response = await fetch("/api/route", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ segments: requests }),
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { segments?: SegmentResult[] };
        const results = payload.segments;
        if (!Array.isArray(results) || results.length !== trip.segments.length) return;

        const next: Record<string, Coordinates[]> = {};
        results.forEach((result, index) => {
          const segment = trip.segments[index];
          if (result.geometry && result.geometry.length > 1) {
            next[geometryKey(segment.id, segment.mode)] = result.geometry;
          }
        });
        if (Object.keys(next).length > 0) setPaths((current) => ({ ...current, ...next }));
      } catch {
        // Offline, timeout, bad payload: straight lines are a valid route drawing.
      }
    })();

    return () => controller.abort();
    // Re-runs when the day itself changes; `trip` is read fresh inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return useMemo(() => {
    if (!trip) return null;
    return {
      ...trip,
      segments: trip.segments.map((segment) => {
        const geometry = paths[geometryKey(segment.id, segment.mode)];
        return geometry ? { ...segment, geometry } : segment;
      }),
    };
  }, [trip, paths]);
}

/** Live weather, falling back to whatever the trip already carries. Never blocks. */
export function useWeather(trip: Trip | null): WeatherSummary | null {
  const [live, setLive] = useState<WeatherSummary | null>(null);
  const first = trip?.stops[0]?.poi.coordinates;
  const city = trip?.destination;

  useEffect(() => {
    if (!first || !city) return;
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(
          `/api/weather?lat=${first.lat}&lng=${first.lng}&city=${encodeURIComponent(city)}`,
          { signal: controller.signal },
        );
        if (response.status === 204 || !response.ok) return;
        setLive((await response.json()) as WeatherSummary);
      } catch {
        // The chip is optional. No placeholder, no error.
      }
    })();

    return () => controller.abort();
  }, [first?.lat, first?.lng, city, first]);

  return live ?? trip?.weather ?? null;
}
