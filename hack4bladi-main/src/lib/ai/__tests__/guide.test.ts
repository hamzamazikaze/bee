/**
 * The guide decides the day, so this is where "decides" stops.
 *
 * Every test here is the same question asked differently: can anything the model wrote
 * reach the app unchecked? An id we do not stock, an enum it translated, a fifth stop, a
 * day of one — none of them may survive `parseGuideAnswer`.
 */
import { describe, expect, it } from "vitest";
import { POIS } from "@/data/pois";
import { parseGuideAnswer } from "@/lib/ai/guide";
import { TRIP_STOP_COUNT } from "@/types/trip";

const REAL = POIS.slice(0, 5).map((poi) => poi.id);

function answer(overrides: Record<string, unknown> = {}) {
  return parseGuideAnswer({ reply: "Here is what I would do.", ...overrides }, POIS);
}

describe("parseGuideAnswer", () => {
  it("keeps the reply on its own — an answer with no day is a complete answer", () => {
    const result = answer({ picks: [] });
    expect(result?.reply).toBe("Here is what I would do.");
    expect(result?.picks).toEqual([]);
    expect(result?.headline).toBe("");
  });

  it("drops ids the dataset does not have", () => {
    const result = answer({
      picks: [
        { id: REAL[0], reason: "you start here" },
        { id: "jemaa-el-fna", reason: "a real place, in another city, that we do not stock" },
        { id: REAL[1], reason: "then this" },
      ],
    });
    expect(result?.picks.map((pick) => pick.poiId)).toEqual([REAL[0], REAL[1]]);
  });

  it("never returns more than a day, and never the same stop twice", () => {
    const result = answer({
      picks: [...REAL, ...REAL].map((id) => ({ id, reason: "why" })),
    });
    expect(result?.picks).toHaveLength(TRIP_STOP_COUNT);
    expect(new Set(result?.picks.map((p) => p.poiId)).size).toBe(TRIP_STOP_COUNT);
  });

  it("treats a single surviving id as no day at all", () => {
    const result = answer({
      picks: [
        { id: REAL[0], reason: "the only one we own" },
        { id: "invented-1", reason: "no" },
        { id: "invented-2", reason: "no" },
      ],
      headline: "A day",
    });
    expect(result?.picks).toEqual([]);
    expect(result?.headline).toBe("");
  });

  it("keeps only enum values the app already speaks", () => {
    const result = answer({
      profile: {
        destination: "Casablanca",
        interests: ["food", "not_an_interest", "culture"],
        timeAvailable: "une demi-journée",
        budgetLevel: "low",
        pace: "sprint",
        walkingPreference: "minimal",
      },
    });
    expect(result?.profile.interests).toEqual(["food", "culture"]);
    expect(result?.profile.timeAvailable).toBeNull();
    expect(result?.profile.pace).toBeNull();
    expect(result?.profile.budgetLevel).toBe("low");
    expect(result?.profile.walkingPreference).toBe("minimal");
    expect(result?.profile.destination).toBe("Casablanca");
  });

  it("returns null when there is nothing to say", () => {
    expect(parseGuideAnswer({ reply: "   " }, POIS)).toBeNull();
    expect(parseGuideAnswer({ picks: [{ id: REAL[0] }] }, POIS)).toBeNull();
    expect(parseGuideAnswer(null, POIS)).toBeNull();
    expect(parseGuideAnswer("not json", POIS)).toBeNull();
  });
});
