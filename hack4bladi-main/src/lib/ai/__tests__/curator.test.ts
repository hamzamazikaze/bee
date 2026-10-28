import { describe, expect, it } from "vitest";
import { POIS } from "@/data/pois";
import { buildCatalog, parseCuration } from "@/lib/ai/curator";
import { match } from "@/lib/matching/engine";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import { TRIP_STOP_COUNT } from "@/types/trip";

const REAL_IDS = POIS.slice(0, 4).map((poi) => poi.id);

describe("parseCuration", () => {
  it("keeps only ids the dataset actually has", () => {
    const curation = parseCuration(
      {
        headline: "A making-and-tasting day",
        picks: [
          { id: REAL_IDS[0], reason: "you start where the city meets the ocean" },
          { id: "poi-that-does-not-exist", reason: "invented" },
          { id: REAL_IDS[1], reason: "then the quarter the artisans still work in" },
        ],
      },
      POIS,
    );

    expect(curation?.picks.map((pick) => pick.poiId)).toEqual([REAL_IDS[0], REAL_IDS[1]]);
  });

  it("drops duplicates and never returns more than a day's worth", () => {
    const curation = parseCuration(
      {
        picks: [...REAL_IDS, ...REAL_IDS].map((id) => ({ id, reason: "why" })),
      },
      POIS,
    );

    expect(curation?.picks).toHaveLength(TRIP_STOP_COUNT);
  });

  it("returns null when the model produced nothing we own", () => {
    expect(parseCuration({ picks: [{ id: "nope", reason: "x" }] }, POIS)).toBeNull();
    expect(parseCuration({ headline: "no picks key" }, POIS)).toBeNull();
    expect(parseCuration(null, POIS)).toBeNull();
  });
});

describe("buildCatalog", () => {
  it("gives the model one line per stop, experiences included", () => {
    const catalog = buildCatalog(POIS);
    expect(catalog.split("\n")).toHaveLength(POIS.length);
    expect(catalog).toContain("food_experience");
    expect(catalog).toContain("workshop");
  });
});

describe("match with curator suggestions", () => {
  const profile = createEmptyProfile("en");

  it("puts the suggested stops in the day", () => {
    const suggested = POIS.filter((poi) => poi.city === "Casablanca")
      .slice(0, 3)
      .map((poi) => poi.id);

    const result = match({
      profile: { ...profile, destination: "Casablanca" },
      pois: POIS,
      suggestedPoiIds: suggested,
    });

    const chosen = result.pois.map((poi) => poi.id);
    expect(result.pois).toHaveLength(TRIP_STOP_COUNT);
    for (const id of suggested) expect(chosen).toContain(id);
  });

  it("ignores an id the dataset cannot honour and still builds a day", () => {
    const result = match({ profile, pois: POIS, suggestedPoiIds: ["not-a-poi"] });
    expect(result.pois).toHaveLength(TRIP_STOP_COUNT);
  });

  it("changes nothing when there are no suggestions", () => {
    const withNone = match({ profile, pois: POIS });
    const withEmpty = match({ profile, pois: POIS, suggestedPoiIds: [] });
    expect(withEmpty.pois.map((p) => p.id)).toEqual(withNone.pois.map((p) => p.id));
  });
});
