import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import { MAX_INTERESTS, initialStep, inspirationSummary, toggleInterest } from "../steps";

describe("toggleInterest", () => {
  it("adds, removes and never exceeds the cap", () => {
    expect(toggleInterest([], "food")).toEqual(["food"]);
    expect(toggleInterest(["food"], "food")).toEqual([]);

    const full = ["culture", "food", "art_creative"] as const;
    const next = toggleInterest([...full], "coast_nature");
    expect(next).toHaveLength(MAX_INTERESTS);
    expect(next).toEqual(["food", "art_creative", "coast_nature"]);
  });
});

describe("initialStep", () => {
  it("asks for inspiration only when we have none", () => {
    const empty = createEmptyProfile("en");
    expect(initialStep(empty)).toBe(1);
    expect(initialStep({ ...empty, sources: ["image"] })).toBe(2);
  });
});

describe("inspirationSummary", () => {
  it("prefers the detected place, then the link host, then the transcript", () => {
    const empty = createEmptyProfile("en");
    expect(inspirationSummary(empty)).toBeNull();
    expect(inspirationSummary({ ...empty, detectedPlace: "Hassan II Mosque" })).toBe(
      "Hassan II Mosque",
    );
    expect(
      inspirationSummary({
        ...empty,
        social: { platform: "tiktok", url: "https://www.tiktok.com/@x/video/1" },
      }),
    ).toBe("tiktok.com");
    expect(inspirationSummary({ ...empty, transcript: "two days in Casablanca" })).toBe(
      "two days in Casablanca",
    );
  });
});
