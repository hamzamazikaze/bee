/**
 * The generic adapter, fed the golden day, must reproduce docs/DEMO_PATH.md exactly —
 * these are the numbers the presenter says out loud while the map redraws.
 */
import { describe, expect, it } from "vitest";
import { adapt } from "@/lib/adaptation";
import { lessWalkingAdapter } from "@/lib/adaptation/less-walking";
import { GOLDEN_LESS_WALKING, cloneGoldenTrip } from "@/data/fixtures";
import { WALKING_COMFORT_METERS } from "@/config/app";
import type { Trip } from "@/types/trip";

const run = (trip: Trip) => lessWalkingAdapter.apply({ type: "less_walking", trip });

describe("less walking · the golden day", () => {
  it("reproduces the demo numbers exactly", async () => {
    const result = await run(cloneGoldenTrip());

    expect(result.applied).toBe(true);
    expect(result.trip.metrics.walkingMeters).toBe(1500);
    expect(result.trip.metrics.carMeters).toBe(6000);
    expect(result.trip.metrics.movementMinutes).toBe(42);
    expect(result.delta.walkingMetersBefore).toBe(6400);
    expect(result.delta.movementMinutesBefore).toBe(82);
    expect(result.delta.walkingReductionPercent).toBe(77);
    expect(result.delta.minutesSaved).toBe(40);
  });

  it("flips exactly segments 1 and 3 to car, per segment numbers", async () => {
    const { trip, changedSegmentIds } = await run(cloneGoldenTrip());

    expect(changedSegmentIds).toEqual(["segment-1", "segment-3"]);
    expect(trip.segments.map((s) => s.mode)).toEqual(["car", "walking", "car"]);
    expect(trip.segments.map((s) => [s.distanceMeters, s.durationMinutes])).toEqual([
      [3000, 11],
      [1500, 19],
      [3000, 12],
    ]);
  });

  it("agrees with the precomputed GOLDEN_LESS_WALKING fixture", async () => {
    const result = await run(cloneGoldenTrip());

    expect(result.trip.metrics).toEqual(GOLDEN_LESS_WALKING.trip.metrics);
    expect(result.changedSegmentIds).toEqual(GOLDEN_LESS_WALKING.changedSegmentIds);
    expect(result.headline.en).toBe(GOLDEN_LESS_WALKING.headline.en);
    expect(result.headline.fr).toBe(GOLDEN_LESS_WALKING.headline.fr);
    expect(result.headline.ar).toBe(GOLDEN_LESS_WALKING.headline.ar);
  });

  it("keeps the same stops, the same order and the 16:00 Hassan II anchor", async () => {
    const before = cloneGoldenTrip();
    const { trip } = await run(before);

    expect(trip.stops.map((s) => s.poiId)).toEqual(before.stops.map((s) => s.poiId));
    expect(trip.stops.map((s) => s.arrivalTime)).toEqual(["09:30", "11:30", "14:00", "15:40"]);
    expect(trip.metrics.activityMinutes).toBe(before.metrics.activityMinutes);
  });

  it("does not mutate the trip it was given — Undo restores an exact snapshot", async () => {
    const original = cloneGoldenTrip();
    await run(original);

    expect(original.segments.map((s) => s.mode)).toEqual(["walking", "walking", "walking"]);
    expect(original.metrics.walkingMeters).toBe(6400);
  });
});

describe("less walking · the unhappy paths", () => {
  it("leaves short walks alone and reports applied:false with a reason", async () => {
    const trip = cloneGoldenTrip();
    trip.segments = trip.segments.map((segment) => ({
      ...segment,
      distanceMeters: WALKING_COMFORT_METERS - 100,
      durationMinutes: 12,
    }));

    const result = await run(trip);
    expect(result.applied).toBe(false);
    expect(result.reason?.en).toBeTruthy();
    expect(result.changedSegmentIds).toEqual([]);
    expect(result.trip).toBe(trip);
  });

  it("never throws, whatever it is handed", async () => {
    const wrecked = { ...cloneGoldenTrip(), segments: undefined } as unknown as Trip;
    const result = await adapt({ type: "less_walking", trip: wrecked });
    expect(result.applied).toBe(false);
  });

  /*
   * These three used to be placeholders that answered "not available for this day yet"
   * for every trip, which made three of the four buttons in the sheet look broken. They
   * are real adapters now: on the golden day each one changes something, and whatever
   * they return is internally consistent.
   */
  it("changes the golden day with all four adaptations", async () => {
    for (const type of ["less_time", "spend_less", "rainy_day"] as const) {
      const before = cloneGoldenTrip();
      const result = await adapt({ type, trip: before });

      expect(result.type).toBe(type);
      expect(result.applied).toBe(true);
      expect(result.headline.en).toBeTruthy();
      // Same contract as less_walking: never fewer stops, always a costed, timed day.
      expect(result.trip.stops).toHaveLength(before.stops.length);
      expect(result.trip.segments).toHaveLength(before.stops.length - 1);
      expect(result.trip.metrics.totalMinutes).toBeGreaterThan(0);
    }
  });

  it("says why, rather than pretending, when it cannot improve a day", async () => {
    // Applied twice, each adapter runs out of room and must answer honestly.
    for (const type of ["less_walking", "less_time"] as const) {
      const once = await adapt({ type, trip: cloneGoldenTrip() });
      const twice = await adapt({ type, trip: once.trip });
      expect(twice.applied).toBe(false);
      expect(twice.reason?.en).toBeTruthy();
      expect(twice.trip).toBe(once.trip);
    }
  });
});
