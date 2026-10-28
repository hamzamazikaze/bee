import { describe, expect, it } from "vitest";
import { GOLDEN_POIS } from "@/data/fixtures/golden-pois";
import { POIS, getPoiById, getPoisByCity } from "@/data/pois";

describe("curated POI dataset", () => {
  /*
   * A hard-coded 25 broke the suite every time the dataset legitimately grew — most
   * recently when the six curated experiences joined POIS. The invariant that actually
   * matters is uniqueness; the floor catches a dataset silently losing entries.
   */
  it("holds the curated POIs with unique ids and slugs", () => {
    expect(POIS.length).toBeGreaterThanOrEqual(25);
    expect(new Set(POIS.map((p) => p.id)).size).toBe(POIS.length);
    expect(new Set(POIS.map((p) => p.slug)).size).toBe(POIS.length);
  });

  it("carries the golden POIs unchanged — same object, so ids and coordinates cannot drift", () => {
    for (const golden of GOLDEN_POIS) {
      expect(POIS).toContain(golden);
    }
  });

  it("keeps every coordinate inside the Casablanca-Settat bounding box", () => {
    for (const poi of POIS) {
      expect(poi.region).toBe("Casablanca-Settat");
      expect(poi.coordinates.lat).toBeGreaterThan(32.5);
      expect(poi.coordinates.lat).toBeLessThan(34.0);
      expect(poi.coordinates.lng).toBeGreaterThan(-9.2);
      expect(poi.coordinates.lng).toBeLessThan(-7.2);
    }
  });

  it("honours the documented data caveats", () => {
    expect(getPoiById("poi-citerne-portugaise")?.availability.status).toBe(
      "temporarily_unavailable",
    );
    const mustVerify = [
      "poi-musee-judaisme-marocain",
      "poi-cinema-rialto",
      "poi-villa-des-arts",
      "poi-bastion-de-lange",
      "poi-phare-sidi-bouafi",
      "poi-kasbah-boulaouane",
    ];
    for (const id of mustVerify) {
      expect(getPoiById(id)?.verification).toBe("needs_verification");
    }
  });

  it("gives every POI 4-6 tags, a full story and a local fallback image", () => {
    for (const poi of POIS) {
      expect(poi.tags.length).toBeGreaterThanOrEqual(4);
      expect(poi.tags.length).toBeLessThanOrEqual(6);
      expect(poi.categories.length).toBeGreaterThan(0);
      for (const locale of ["en", "fr", "ar"] as const) {
        expect(poi.cultural.story[locale].length).toBeGreaterThan(80);
        expect(poi.cultural.tip[locale].length).toBeGreaterThan(20);
      }
      // The fallback is now the POI's category image (or the packaged placeholder).
      // media-assets.test.ts proves each one is a file that actually ships.
      expect(poi.media.fallbackImage.startsWith("/images/")).toBe(true);
      expect(poi.priority).toBeGreaterThanOrEqual(1);
      expect(poi.priority).toBeLessThanOrEqual(5);
    }
  });

  it("covers the six pilot towns", () => {
    for (const city of [
      "Casablanca",
      "El Jadida",
      "Azemmour",
      "Oualidia",
      "Mohammedia",
      "Boulaouane",
    ]) {
      expect(getPoisByCity(city).length).toBeGreaterThan(0);
    }
  });

  it("has at least one bookable signature per demo destination", () => {
    const casablanca = getPoisByCity("Casablanca").filter(
      (p) => p.signature && p.availability.status === "open",
    );
    expect(casablanca.length).toBeGreaterThan(0);
  });
});

describe("base routes", () => {
  it("has the curated templates, whose POI ids all resolve", async () => {
    const { BASE_ROUTES } = await import("@/data/base-routes");
    // Floor, not an exact count: adding a curated day must not fail the suite.
    expect(BASE_ROUTES.length).toBeGreaterThanOrEqual(6);
    for (const route of BASE_ROUTES) {
      expect(route.poiIds.length).toBeGreaterThanOrEqual(4);
      for (const id of route.poiIds) {
        expect(getPoiById(id), `${route.id} references ${id}`).toBeDefined();
      }
    }
  });
});
