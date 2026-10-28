/**
 * Coverage candidates answer one question: "we recognised somewhere real and we do not
 * cover it — here is the closest thing we do."
 *
 * They must not answer any other question. A sentence that names no place has no coverage
 * gap, and offering it a monument reads as the model guessing rather than understanding.
 */
import { describe, expect, it } from "vitest";
import { buildDraft } from "../normalize";

const draftFor = (model: Record<string, unknown>, source: "text" | "image" = "text") =>
  buildDraft({ source, locale: "en", model });

describe("coverage fires only when a place was actually named", () => {
  it("offers nothing for a sentence that names no place", () => {
    const draft = draftFor({ city: "Casablanca", interests: ["culture", "food"] });

    expect(draft.candidates).toEqual([]);
    expect(draft.destination.city).toBe("Casablanca");
    expect(draft.destination.detectedPlace).toBeNull();
    expect(draft.destination.detectedPoiId).toBeNull();
  });

  it("offers nothing for a bare city, however sure the model is", () => {
    expect(draftFor({ city: "Oualidia", confidence: 0.99 }).candidates).toEqual([]);
  });

  it("offers the closest curated stops when a real place is outside our coverage", () => {
    const draft = draftFor({
      city: "El Jadida",
      detectedPlace: "Sidi Bouzid Beach",
      interests: ["coast_nature"],
    });

    expect(draft.candidates.length).toBeGreaterThan(0);
    for (const candidate of draft.candidates) {
      expect(candidate.kind).toBe("coverage");
      expect(candidate.city).toBe("El Jadida");
      // Capped below the HIGH band so a coverage guess can never read as a match.
      expect(candidate.score).toBeLessThanOrEqual(0.5);
    }
    // Still not a recognition: nothing is grounded and nothing is named back.
    expect(draft.destination.detectedPoiId).toBeNull();
    expect(draft.destination.detectedPlace).toBe("Sidi Bouzid Beach");
  });

  it("prefers a real name match over coverage, always", () => {
    const draft = draftFor({ city: "Casablanca", detectedPlace: "Hassan II Mosque" });

    expect(draft.destination.detectedPoiId).toBe("poi-hassan-ii");
    expect(draft.candidates[0].kind).toBe("name");
  });

  it("offers nothing for a town outside the region", () => {
    expect(draftFor({ city: "Marrakech", detectedPlace: "Jemaa el-Fna" }).candidates).toEqual([]);
  });
});
