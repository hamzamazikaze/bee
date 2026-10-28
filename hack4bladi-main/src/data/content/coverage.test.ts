/**
 * The content overlay must cover every place that has narrative, and must never name a
 * place that does not exist.
 *
 * A typo in a POI id here is completely silent — the entry simply never merges, and the
 * traveller reads English on one stop of an otherwise Spanish day. This is the test that
 * makes that loud.
 */
import { describe, expect, it } from "vitest";
import { OVERLAYS } from ".";
import { POIS } from "@/data/pois";
import { HASSAN_II } from "@/data/fixtures/golden-pois";
import type { Locale } from "@/types/common";
import type { POI } from "@/types/poi";

const NARRATIVE_POIS = POIS.filter((poi) => poi.cultural);
const IDS = new Set(POIS.map((poi) => poi.id));

describe("POI content overlay", () => {
  it("the dataset still has its narrative places", () => {
    expect(NARRATIVE_POIS.length).toBeGreaterThan(30);
  });

  for (const [locale, overlay] of Object.entries(OVERLAYS)) {
    it(`${locale} names only real POIs`, () => {
      expect(Object.keys(overlay).filter((id) => !IDS.has(id))).toEqual([]);
    });

    it(`${locale} covers every narrative POI`, () => {
      const missing = NARRATIVE_POIS.filter((poi) => {
        const entry = overlay[poi.id];
        return !entry?.story || !entry?.tip;
      }).map((poi) => poi.id);
      expect(missing).toEqual([]);
    });

    it(`${locale} reaches the POI objects the app reads`, () => {
      for (const poi of NARRATIVE_POIS) {
        expect(poi.cultural?.story[locale as Locale]).toBeTruthy();
        expect(poi.cultural?.tip[locale as Locale]).toBeTruthy();
      }
    });
  }

  it("leaves everything that is not narrative untouched", () => {
    /**
     * Compared against the golden fixture itself rather than a literal: the point is
     * that the merge is a pure widening of `cultural`, so every other field must still
     * be the exact value the fixture declares — whatever that value happens to be.
     */
    const withoutNarrative = (poi: POI) => {
      const copy: Partial<POI> = { ...poi };
      delete copy.cultural;
      return copy;
    };
    const hassan = POIS.find((poi) => poi.id === HASSAN_II.id);
    expect(hassan).toBeDefined();
    expect(withoutNarrative(hassan!)).toEqual(withoutNarrative(HASSAN_II));
  });
});
