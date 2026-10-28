/**
 * The generation seam. There is no server in the test environment, so `fetch` rejects —
 * which is precisely the routing-failure path we need to hold up.
 */
import { describe, expect, it } from "vitest";
import { buildTrip } from "../build-trip";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import { calculateMetrics } from "@/lib/routing/metrics";
import { TRIP_SEGMENT_COUNT, TRIP_STOP_COUNT } from "@/types/trip";
import type { TripProfile } from "@/types/profile";

function profile(overrides: Partial<TripProfile> = {}): TripProfile {
  return { ...createEmptyProfile("en"), ...overrides };
}

describe("buildTrip", () => {
  it("builds a complete day from a totally empty profile", async () => {
    const trip = await buildTrip(profile());
    expect(trip.stops).toHaveLength(TRIP_STOP_COUNT);
    expect(trip.segments).toHaveLength(TRIP_SEGMENT_COUNT);
    expect(trip.destination).toBeTruthy();
  });

  it("chains segments stop-to-stop and keeps metrics reproducible", async () => {
    const trip = await buildTrip(profile({ interests: ["culture", "food"] }));
    trip.segments.forEach((segment, index) => {
      expect(segment.fromStopId).toBe(trip.stops[index].id);
      expect(segment.toStopId).toBe(trip.stops[index + 1].id);
    });
    expect(calculateMetrics(trip.stops, trip.segments)).toEqual(trip.metrics);
  });

  it("degrades to straight lines when routing is unreachable", async () => {
    const trip = await buildTrip(profile());
    expect(trip.segments.every((s) => s.geometry === null)).toBe(true);
    expect(trip.segments.every((s) => s.source === "fallback")).toBe(true);
    expect(trip.isFallback).toBe(true);
  });

  it("keeps arrival times consistent with the leg durations beside them", async () => {
    const trip = await buildTrip(profile());
    const toMinutes = (clock: string) => {
      const [h, m] = clock.split(":").map(Number);
      return h * 60 + m;
    };
    trip.stops.slice(0, -1).forEach((stop, index) => {
      const next = trip.stops[index + 1];
      const earliest =
        toMinutes(stop.arrivalTime) + stop.durationMinutes + trip.segments[index].durationMinutes;
      // The engine rounds arrivals up to the next 5 minutes; it must never round down.
      expect(toMinutes(next.arrivalTime)).toBeGreaterThanOrEqual(earliest);
    });
  });

  it("never throws, whatever the profile says", async () => {
    const hostile = profile({
      destination: "Atlantis",
      interests: ["culture", "food", "coast_nature"],
      pace: "explorer",
      budgetLevel: "low",
    });
    await expect(buildTrip(hostile)).resolves.toBeDefined();
  });
});
