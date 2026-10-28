/**
 * The trust boundary of the interface.
 *
 * The bug these exist to prevent: the trip screen printed "Verified places" and a filled
 * shield beside every stop of every day, including days the AI guide had authored itself
 * with model-supplied coordinates. The dataset always recorded the difference; nothing in
 * the UI read it.
 *
 * The invariant worth guarding is one-directional. Under-claiming is a cosmetic loss;
 * over-claiming is the thing that cost us the audit. So the assertions below care most
 * about what must NEVER be said.
 */
import { describe, expect, it } from "vitest";
import { GOLDEN_POIS } from "@/data/fixtures";
import { POIS, getPoiById } from "@/data/pois";
import { syntheticPoi } from "@/lib/ai/curator";
import type { POI } from "@/types/poi";
import { cloneGoldenTrip } from "@/data/fixtures";
import {
  countProvenance,
  isAiSuggested,
  poiProvenance,
  provenanceSummary,
  tripProvenance,
} from "../provenance";

/** A stop the guide wrote itself, built by the real code path rather than by hand. */
function aiPoi(name = "Hagia Sophia", city = "Istanbul"): POI {
  const poi = syntheticPoi(
    { name, city, lat: 41.0082, lng: 28.979, categories: ["culture"], story: "…", tip: "…" },
    0,
  );
  if (!poi) throw new Error("syntheticPoi refused a valid payload");
  return poi;
}

const verifiedPoi = () => POIS.find((poi) => poi.verification === "verified")!;
const needsVerificationPoi = () => POIS.find((poi) => poi.verification === "needs_verification")!;
/** The six curated experiences carry `unverified` — ours, but not corroborated. */
const curatedUnverifiedPoi = () => POIS.find((poi) => poi.verification === "unverified")!;

describe("poiProvenance", () => {
  it("calls a corroborated dataset POI verified", () => {
    expect(poiProvenance(verifiedPoi())).toBe("verified");
  });

  it("calls a dataset POI awaiting confirmation curated, not verified", () => {
    expect(poiProvenance(needsVerificationPoi())).toBe("curated");
  });

  /*
   * The trap in the whole feature. `verification: "unverified"` means two different
   * things depending on origin: a curated experience we wrote, and a place a model
   * produced. Folding them together would swap one false claim for its mirror image —
   * telling a traveller that our own cooking workshop came from an AI.
   */
  it("does NOT call a curated experience an AI suggestion, despite `unverified`", () => {
    const poi = curatedUnverifiedPoi();
    expect(poi.verification).toBe("unverified");
    expect(poiProvenance(poi)).toBe("curated");
    expect(isAiSuggested(poi)).toBe(false);
  });

  it("calls a guide-authored stop an AI suggestion", () => {
    const poi = aiPoi();
    expect(getPoiById(poi.id)).toBeUndefined();
    expect(poiProvenance(poi)).toBe("ai_suggested");
    expect(isAiSuggested(poi)).toBe(true);
  });

  it("never reports a guide-authored stop as verified or curated", () => {
    for (const name of ["Grand Bazaar", "Galata Tower", "Jemaa el-Fnaa"]) {
      expect(poiProvenance(aiPoi(name))).toBe("ai_suggested");
    }
  });

  /* Partial data safety (§11): none of these may become a claim. */
  it("says nothing for missing, malformed or unrecognised input", () => {
    expect(poiProvenance(null)).toBe("unknown");
    expect(poiProvenance(undefined)).toBe("unknown");
    expect(poiProvenance({} as unknown as POI)).toBe("unknown");
    expect(poiProvenance({ id: 42 } as unknown as POI)).toBe("unknown");
    expect(poiProvenance({ id: "who-knows", verification: "verified" } as POI)).toBe("unknown");
  });

  it("never trusts a verification claim carried by an object outside the dataset", () => {
    /* A trip restored from localStorage, or a payload from the chat route, can assert
       anything it likes about itself. Only the dataset gets to say "verified". */
    const forged = { ...aiPoi(), verification: "verified" as const };
    expect(poiProvenance(forged)).toBe("ai_suggested");
  });

  it("reads the live dataset rather than a stale serialised copy", () => {
    const poi = verifiedPoi();
    const stale = { ...poi, verification: undefined as unknown as POI["verification"] };
    expect(poiProvenance(stale)).toBe("verified");
  });
});

describe("countProvenance", () => {
  it("counts verified inside fromDataset, and AI outside it", () => {
    const counts = countProvenance([
      verifiedPoi(),
      needsVerificationPoi(),
      curatedUnverifiedPoi(),
      aiPoi(),
    ]);
    expect(counts).toMatchObject({
      verified: 1,
      curated: 2,
      aiSuggested: 1,
      unknown: 0,
      fromDataset: 3,
      total: 4,
    });
  });

  it("keeps unplaceable stops out of every claimable bucket", () => {
    const counts = countProvenance([verifiedPoi(), null, undefined]);
    expect(counts.unknown).toBe(2);
    expect(counts.fromDataset).toBe(1);
  });
});

describe("provenanceSummary", () => {
  const summarise = (pois: Parameters<typeof countProvenance>[0]) =>
    provenanceSummary(countProvenance(pois));

  it("claims verified only when every stop is", () => {
    const all = GOLDEN_POIS.filter((poi) => poi.verification === "verified");
    const summary = summarise(all);
    expect(summary.key).toBe("trip.provenance.summaryVerified");
    expect(summary.params.n).toBe(all.length);
  });

  it("falls back to curated the moment one stop is not corroborated", () => {
    expect(summarise([verifiedPoi(), needsVerificationPoi()]).key).toBe(
      "trip.provenance.summaryCurated",
    );
  });

  it("splits the count when the guide contributed a stop", () => {
    const summary = summarise([verifiedPoi(), verifiedPoi(), verifiedPoi(), aiPoi()]);
    expect(summary.key).toBe("trip.provenance.summaryMixed");
    expect(summary.params).toEqual({ dataset: 3, ai: 1 });
  });

  it("says only AI when nothing came from the dataset", () => {
    const summary = summarise([aiPoi("A"), aiPoi("B")]);
    expect(summary.key).toBe("trip.provenance.summaryAi");
    expect(summary.params.n).toBe(2);
  });

  /* The rule that makes the headline safe: a summary speaks for every stop, so one stop
     we cannot place withdraws the claim for all of them. */
  it("withdraws the claim entirely when one stop cannot be placed", () => {
    const summary = summarise([verifiedPoi(), verifiedPoi(), verifiedPoi(), null]);
    expect(summary.key).toBe("trip.provenance.summaryNeutral");
    expect(summary.params.n).toBe(4);
  });

  it("never claims verified for a day containing an AI stop", () => {
    for (const day of [
      [aiPoi()],
      [verifiedPoi(), aiPoi()],
      [verifiedPoi(), needsVerificationPoi(), curatedUnverifiedPoi(), aiPoi()],
    ]) {
      expect(summarise(day).key).not.toBe("trip.provenance.summaryVerified");
    }
  });
});

describe("tripProvenance", () => {
  it("reads the golden Casablanca day off the real trip object", () => {
    const counts = tripProvenance(cloneGoldenTrip());
    expect(counts.total).toBe(4);
    expect(counts.aiSuggested).toBe(0);
    expect(counts.unknown).toBe(0);
    expect(counts.fromDataset).toBe(4);
  });
});
