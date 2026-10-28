/**
 * The untrusted boundary. Everything here is a shape a language model has actually
 * produced at some point: an enum it invented, a key nobody asked for, a confidence of 7.
 */
import { describe, expect, it } from "vitest";
import {
  bandOf,
  buildDraft,
  createEmptyDraft,
  parseTripIntentDraft,
  pickInterests,
  scoreDraft,
  shouldPreselect,
  uncertainFieldsOf,
  walkingPreferenceOf,
} from "@/lib/intent";
import { resolvePoiCandidates } from "@/lib/ai/resolve-poi";

const base = { source: "text", locale: "en" } as const;

describe("invalid enums from the model", () => {
  it("keeps the valid interests and drops the invented ones", () => {
    expect(pickInterests(["culture", "nightlife", "food", "TELEPORTATION"])).toEqual([
      "culture",
      "food",
    ]);
  });

  it("does not let one bad value cost the whole array", () => {
    const draft = buildDraft({
      ...base,
      model: { interests: ["shopping", "coast_nature", "culture"] },
    });
    expect(draft.interests).toEqual(["coast_nature", "culture"]);
  });

  it("normalises casing and spacing but never guesses a near miss", () => {
    const draft = buildDraft({
      ...base,
      model: { timeAvailable: "Half Day", budgetLevel: "cheap", pace: "RELAXED" },
    });
    expect(draft.timeAvailable).toBe("half_day");
    expect(draft.pace).toBe("relaxed");
    // "cheap" is not one of low|medium|premium, and we do not map it to one.
    expect(draft.budgetLevel).toBeNull();
  });

  it("deduplicates and caps interests at three", () => {
    const draft = buildDraft({
      ...base,
      model: { interests: ["food", "food", "culture", "art_creative", "activities"] },
    });
    expect(draft.interests).toEqual(["food", "culture", "art_creative"]);
  });
});

describe("missing fields and unexpected keys", () => {
  it("treats an empty model answer as an empty draft, not an error", () => {
    const draft = buildDraft({ ...base, model: {} });
    expect(draft.interests).toEqual([]);
    expect(draft.timeAvailable).toBeNull();
    expect(draft.mobility.avoidLongWalks).toBeNull();
    expect(draft.destination.detectedPoiId).toBeNull();
  });

  it("survives a model that answered with nothing at all", () => {
    expect(buildDraft({ ...base, model: undefined }).band).toBe("low");
    expect(buildDraft({ ...base, model: null }).confidence).toBeLessThan(0.5);
    expect(buildDraft({ ...base, model: "not an object" }).interests).toEqual([]);
  });

  it("strips keys the schema never asked for", () => {
    const draft = parseTripIntentDraft({
      ...createEmptyDraft("text", "en"),
      itinerary: [{ stop: "Hassan II", time: "10:00" }],
      apiKey: "leaked",
      coordinates: { lat: 33.6, lng: -7.6 },
    });
    expect(draft).not.toHaveProperty("itinerary");
    expect(draft).not.toHaveProperty("apiKey");
    expect(draft).not.toHaveProperty("coordinates");
  });

  it("never lets the model author a POI id", () => {
    const draft = buildDraft({
      ...base,
      // The prompt does not ask for one; if it arrives anyway it is not a key we read.
      model: { detectedPoiId: "poi-invented", detectedPlace: "somewhere nice" },
    } as never);
    expect(draft.destination.detectedPoiId).toBeNull();
  });
});

describe("confidence bounds", () => {
  it("bands on the documented thresholds", () => {
    expect(bandOf(0.8)).toBe("high");
    expect(bandOf(0.79)).toBe("medium");
    expect(bandOf(0.5)).toBe("medium");
    expect(bandOf(0.49)).toBe("low");
    expect(bandOf(0)).toBe("low");
  });

  it("clamps whatever the model reports about itself", () => {
    const wild = buildDraft({ ...base, model: { confidence: 7 } });
    const negative = buildDraft({ ...base, model: { confidence: -3 } });
    const notANumber = buildDraft({ ...base, model: { confidence: "very sure" } });
    for (const draft of [wild, negative, notANumber]) {
      expect(draft.confidence).toBeGreaterThanOrEqual(0);
      expect(draft.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("rejects a confidence smuggled in through the schema", () => {
    const draft = parseTripIntentDraft({ ...createEmptyDraft(), confidence: 42 });
    expect(draft.confidence).toBe(0);
  });

  it("derives the band from the number rather than trusting the caller", () => {
    const draft = parseTripIntentDraft({
      ...createEmptyDraft(),
      confidence: 0.2,
      band: "high",
    });
    expect(draft.band).toBe("low");
    expect(shouldPreselect(draft)).toBe(false);
  });

  it("caps a degraded draft below the HIGH band however complete it looks", () => {
    const complete = {
      interests: ["culture", "food"],
      timeAvailable: "half_day",
      budgetLevel: "medium",
      pace: "relaxed",
      avoidLongWalks: true,
      city: "Casablanca",
      confidence: 1,
    };
    const withModel = buildDraft({ ...base, model: complete });
    const degraded = buildDraft({ ...base, model: complete, degraded: true });

    expect(withModel.band).toBe("high");
    expect(degraded.confidence).toBeLessThan(0.5);
    expect(degraded.band).toBe("low");
  });
});

describe("scoring is grounded, not self-reported", () => {
  it("does not let a confident model carry an empty draft", () => {
    const draft = buildDraft({ ...base, model: { confidence: 1 } });
    expect(draft.band).not.toBe("high");
  });

  it("rewards a place that grounded against the curated dataset", () => {
    const grounded = buildDraft({
      source: "image",
      locale: "en",
      model: { detectedPlace: "Hassan II Mosque", city: "Casablanca" },
      placeConfidence: 0.9,
    });
    const ungrounded = buildDraft({
      source: "image",
      locale: "en",
      model: { detectedPlace: "a nice building somewhere", city: null },
      placeConfidence: 0.9,
    });
    expect(grounded.destination.detectedPoiId).toBe("poi-hassan-ii");
    expect(grounded.confidence).toBeGreaterThan(ungrounded.confidence);
  });

  it("is a pure function of the draft plus the self-report", () => {
    const draft = createEmptyDraft("text", "en");
    expect(scoreDraft(draft, 0)).toBeLessThan(scoreDraft(draft, 1));
  });
});

describe("what the draft admits it does not know", () => {
  it("lists every unfilled field", () => {
    const draft = buildDraft({ ...base, model: { interests: ["food"] } });
    expect(draft.uncertainFields).toContain("timeAvailable");
    expect(draft.uncertainFields).toContain("budgetLevel");
    expect(draft.uncertainFields).toContain("mobility");
    expect(draft.uncertainFields).not.toContain("interests");
  });

  it("flags a named place that did not ground", () => {
    const draft = buildDraft({ ...base, model: { detectedPlace: "some rooftop bar" } });
    expect(draft.uncertainFields).toContain("detectedPoiId");
  });

  it("is recomputed, not remembered", () => {
    const filled = buildDraft({
      ...base,
      model: {
        city: "Casablanca",
        interests: ["food"],
        timeAvailable: "half_day",
        budgetLevel: "low",
        pace: "relaxed",
        avoidLongWalks: false,
      },
    });
    expect(uncertainFieldsOf(filled)).toEqual([]);
  });
});

describe("mobility speaks the engine's vocabulary", () => {
  it("maps to the walking preference the matching engine already weights", () => {
    expect(walkingPreferenceOf(true)).toBe("minimal");
    expect(walkingPreferenceOf(false)).toBe("normal");
    expect(walkingPreferenceOf(null)).toBeNull();
  });
});

describe("local POI candidates", () => {
  it("ranks the curated matches and says why", () => {
    const candidates = resolvePoiCandidates("Mosquée Hassan II, Casablanca");
    expect(candidates[0].poiId).toBe("poi-hassan-ii");
    expect(candidates[0].score).toBeGreaterThan(0.5);
    expect(candidates[0].reason).toContain("name:");
  });

  it("returns nothing rather than the nearest famous thing", () => {
    expect(resolvePoiCandidates("a beach somewhere")).toEqual([]);
    expect(resolvePoiCandidates("Jemaa el-Fna, Marrakech")).toEqual([]);
    expect(resolvePoiCandidates(null)).toEqual([]);
    expect(resolvePoiCandidates("")).toEqual([]);
  });

  it("is deterministic and bounded", () => {
    const once = resolvePoiCandidates("cite portugaise mazagan", { limit: 3 });
    const twice = resolvePoiCandidates("cite portugaise mazagan", { limit: 3 });
    expect(once).toEqual(twice);
    expect(once.length).toBeLessThanOrEqual(3);
  });
});
