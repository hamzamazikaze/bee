import { describe, expect, it } from "vitest";
import { PACE_DURATION_MULTIPLIER } from "@/config/app";
import { BASE_ROUTES } from "@/data/base-routes";
import { POIS } from "@/data/pois";
import { match, schedule, tripEngine } from "@/lib/matching/engine";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import type { TripProfile } from "@/types/profile";
import { TRIP_STOP_COUNT } from "@/types/trip";

function profile(overrides: Partial<TripProfile> = {}): TripProfile {
  return { ...createEmptyProfile("en"), ...overrides };
}

const NOW = new Date(2026, 0, 1, 8, 0, 0);

describe("TripEngine.match", () => {
  it("returns exactly 4 stops for a completely empty profile", () => {
    const result = match({ profile: profile(), pois: POIS, baseRoutes: BASE_ROUTES });
    expect(result.pois).toHaveLength(TRIP_STOP_COUNT);
    expect(new Set(result.pois.map((p) => p.id)).size).toBe(TRIP_STOP_COUNT);
  });

  it("returns exactly 4 stops for every single-interest profile", () => {
    for (const interest of [
      "culture",
      "food",
      "coast_nature",
      "hidden_gems",
      "art_creative",
      "activities",
    ] as const) {
      const result = match({ profile: profile({ interests: [interest] }), pois: POIS });
      expect(result.pois, interest).toHaveLength(TRIP_STOP_COUNT);
    }
  });

  it("returns exactly 4 stops for every destination in the dataset", () => {
    for (const city of new Set(POIS.map((p) => p.city))) {
      const result = match({ profile: profile({ destination: city }), pois: POIS });
      expect(result.pois, city).toHaveLength(TRIP_STOP_COUNT);
    }
  });

  it("never selects a POI that is closed or temporarily unavailable", () => {
    for (const interests of [[], ["culture"], ["art_creative"], ["hidden_gems"]] as const) {
      const result = match({
        profile: profile({ interests: [...interests], destination: "El Jadida" }),
        pois: POIS,
      });
      for (const poi of result.pois) {
        expect(poi.availability.status).not.toBe("temporarily_unavailable");
        expect(poi.availability.status).not.toBe("permanently_closed");
      }
    }
    // The Citerne is a signature POI, so it would be picked if the filter were missing.
    const eljadida = match({ profile: profile({ destination: "El Jadida" }), pois: POIS });
    expect(eljadida.pois.map((p) => p.id)).not.toContain("poi-citerne-portugaise");
  });

  it("honours the requested destination", () => {
    const result = match({ profile: profile({ destination: "Casablanca" }), pois: POIS });
    for (const poi of result.pois) expect(poi.city).toBe("Casablanca");
  });

  it("favours the chosen interest", () => {
    const food = match({
      profile: profile({ interests: ["food"], destination: "Casablanca" }),
      pois: POIS,
    });
    expect(food.pois.some((p) => p.categories.includes("food"))).toBe(true);

    const art = match({
      profile: profile({ interests: ["art_creative"], destination: "Casablanca" }),
      pois: POIS,
    });
    expect(art.pois.some((p) => p.categories.includes("art_creative"))).toBe(true);
  });

  it("shifts the selection when the budget is low", () => {
    const low = match({
      profile: profile({ destination: "Casablanca", budgetLevel: "low" }),
      pois: POIS,
    });
    const premium = match({
      profile: profile({ destination: "Casablanca", budgetLevel: "premium" }),
      pois: POIS,
    });
    const paidIn = (ids: string[]) =>
      ids.filter((id) => {
        const poi = POIS.find((p) => p.id === id);
        return poi ? poi.priceRange !== "free" : false;
      }).length;
    expect(paidIn(low.pois.map((p) => p.id))).toBeLessThanOrEqual(
      paidIn(premium.pois.map((p) => p.id)),
    );
    expect(low.pois).toHaveLength(TRIP_STOP_COUNT);
  });

  it("mixes categories rather than returning four of the same thing", () => {
    const result = match({
      profile: profile({ interests: ["culture"], destination: "Casablanca" }),
      pois: POIS,
    });
    const primary = new Set(result.pois.map((p) => p.categories[0]));
    expect(primary.size).toBeGreaterThan(1);
  });

  it("is deterministic for a fixed input", () => {
    const input = {
      profile: profile({
        destination: "Casablanca",
        interests: ["culture", "food"] as const as TripProfile["interests"],
        budgetLevel: "medium" as const,
        pace: "balanced" as const,
      }),
      pois: POIS,
      baseRoutes: BASE_ROUTES,
      now: NOW,
    };
    const first = match(input).pois.map((p) => p.id);
    for (let i = 0; i < 5; i += 1) {
      expect(match(input).pois.map((p) => p.id)).toEqual(first);
    }
  });

  /*
   * Q52 asks that curated routes be foundations rather than fixed answers. The original
   * form of this test asserted the result never EQUALS a template — which cannot hold
   * alongside non-negotiable #6, where the product must produce exactly the four curated
   * Casablanca stops. So it now asserts the property Q52 is actually protecting: that the
   * engine still reasons, rather than looking a route up.
   */
  it("treats a curated route as a weight, not a lookup table", () => {
    const casablanca = { destination: "Casablanca" };

    // 1. The day responds to the traveller: a different vibe is a different day.
    const cultural = match({
      profile: profile({ ...casablanca, interests: ["culture", "food"] }),
      pois: POIS,
      baseRoutes: BASE_ROUTES,
    }).pois.map((p) => p.id);
    const coastal = match({
      profile: profile({ ...casablanca, interests: ["coast_nature"] }),
      pois: POIS,
      baseRoutes: BASE_ROUTES,
    }).pois.map((p) => p.id);
    expect(coastal).not.toEqual(cultural);

    // 2. A curated stop is still only a candidate: close one and the engine substitutes,
    //    which a lookup table could never do.
    const withClosure = match({
      profile: profile({ ...casablanca, interests: ["culture", "food"] }),
      pois: POIS.map((poi) =>
        poi.id === "poi-marche-central"
          ? { ...poi, availability: { status: "temporarily_unavailable" as const } }
          : poi,
      ),
      baseRoutes: BASE_ROUTES,
    }).pois.map((p) => p.id);

    expect(withClosure).toHaveLength(TRIP_STOP_COUNT);
    expect(withClosure).not.toContain("poi-marche-central");
    expect(withClosure).not.toEqual(cultural);
  });

  it("anchors the day on a recognised POI when the image gave us one", () => {
    const result = match({
      profile: profile({ destination: "Casablanca", detectedPoiId: "poi-hassan-ii" }),
      pois: POIS,
    });
    expect(result.pois.map((p) => p.id)).toContain("poi-hassan-ii");
  });
});

describe("TripEngine.schedule", () => {
  it("produces one ordered stop per POI with increasing arrival times", () => {
    const { pois } = match({ profile: profile({ destination: "Casablanca" }), pois: POIS });
    const stops = schedule(pois, profile(), NOW);
    expect(stops).toHaveLength(TRIP_STOP_COUNT);
    stops.forEach((stop, index) => {
      expect(stop.order).toBe(index + 1);
      expect(stop.id).toBe(`stop-${index + 1}`);
      expect(stop.poiId).toBe(stop.poi.id);
      expect(stop.visitState).toBe("upcoming");
      expect(stop.arrivalTime).toMatch(/^\d{2}:\d{2}$/);
    });
    const minutes = stops.map((s) => {
      const [h, m] = s.arrivalTime.split(":").map(Number);
      return h * 60 + m;
    });
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
    expect(stops[0].arrivalTime).toBe("09:30");
  });

  it("lets pace change duration but never the stop count", () => {
    const { pois } = match({ profile: profile({ destination: "Casablanca" }), pois: POIS });
    const relaxed = schedule(pois, profile({ pace: "relaxed" }), NOW);
    const balanced = schedule(pois, profile({ pace: "balanced" }), NOW);
    const explorer = schedule(pois, profile({ pace: "explorer" }), NOW);

    expect(relaxed).toHaveLength(TRIP_STOP_COUNT);
    expect(balanced).toHaveLength(TRIP_STOP_COUNT);
    expect(explorer).toHaveLength(TRIP_STOP_COUNT);

    const total = (stops: typeof relaxed) =>
      stops.reduce((sum, stop) => sum + stop.durationMinutes, 0);
    expect(total(relaxed)).toBeGreaterThan(total(balanced));
    expect(total(explorer)).toBeLessThan(total(balanced));
    expect(PACE_DURATION_MULTIPLIER.relaxed).toBeGreaterThan(PACE_DURATION_MULTIPLIER.explorer);
  });

  it("starts later when the day has already begun", () => {
    const { pois } = match({ profile: profile({ destination: "Casablanca" }), pois: POIS });
    const afternoon = schedule(pois, profile(), new Date(2026, 0, 1, 13, 10, 0));
    expect(afternoon[0].arrivalTime).toBe("13:30");
  });

  it("is deterministic for a fixed input", () => {
    const { pois } = match({ profile: profile({ destination: "Casablanca" }), pois: POIS });
    const once = schedule(pois, profile({ pace: "balanced" }), NOW);
    const twice = schedule(pois, profile({ pace: "balanced" }), NOW);
    expect(twice).toEqual(once);
  });
});

describe("tripEngine", () => {
  it("satisfies the TripEngine contract end to end with an empty profile", () => {
    const { pois } = tripEngine.match({ profile: profile(), pois: POIS });
    const stops = tripEngine.schedule(pois, profile(), NOW);
    expect(stops).toHaveLength(TRIP_STOP_COUNT);
    expect(stops.every((s) => s.durationMinutes >= 15)).toBe(true);
  });
});
