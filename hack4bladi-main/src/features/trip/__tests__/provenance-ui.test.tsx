/**
 * What the screen is allowed to say out loud.
 *
 * `provenance.test.ts` proves the classification; this proves the words. They are separate
 * files because the failure they guard against is a rendering failure: the classification
 * was never wrong, it simply was not read — `POI.verification` had three honest values and
 * zero components looked at any of them, while a filled shield and the words "Verified
 * places" went out over every stop of every day.
 *
 * Every assertion here is phrased as "must not claim" wherever it can be. A missing badge
 * is a cosmetic bug; a wrong badge is the one that ends up in an audit.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { POIS } from "@/data/pois";
import { cloneGoldenTrip } from "@/data/fixtures";
import { syntheticPoi } from "@/lib/ai/curator";
import { translate } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import type { POI } from "@/types/poi";
import type { Trip } from "@/types/trip";
import { ProvenanceBadge, ProvenanceNote } from "../provenance-badge";
import { PlaceSheet } from "../place-sheet";
import { VerifiedLink } from "../trip-summary";

const VERIFIED = translate("en", "trip.provenance.verified");
const CURATED = translate("en", "trip.provenance.curated");
const AI = translate("en", "trip.provenance.ai");

function aiPoi(name = "Hagia Sophia"): POI {
  const poi = syntheticPoi(
    { name, city: "Istanbul", lat: 41.0082, lng: 28.979, categories: ["culture"] },
    0,
  );
  if (!poi) throw new Error("syntheticPoi refused a valid payload");
  return poi;
}

const verifiedPoi = () => POIS.find((poi) => poi.verification === "verified")!;
const needsVerificationPoi = () => POIS.find((poi) => poi.verification === "needs_verification")!;
const curatedExperience = () => POIS.find((poi) => poi.verification === "unverified")!;

/** Swaps a stop's POI without touching anything else the trip carries. */
function tripWith(pois: POI[]): Trip {
  const trip = cloneGoldenTrip();
  return {
    ...trip,
    stops: trip.stops.map((stop, index) => {
      const poi = pois[index] ?? stop.poi;
      return { ...stop, poi, poiId: poi.id };
    }),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  useAppStore.setState({ hydrated: true, locale: "en" });
});

describe("ProvenanceBadge", () => {
  it("names a corroborated dataset place", () => {
    render(<ProvenanceBadge poi={verifiedPoi()} />);
    expect(screen.getByText(VERIFIED)).toBeTruthy();
  });

  it("says curated, not verified, for a stop still awaiting confirmation", () => {
    render(<ProvenanceBadge poi={needsVerificationPoi()} />);
    expect(screen.getByText(CURATED)).toBeTruthy();
    expect(screen.queryByText(VERIFIED)).toBeNull();
  });

  it("does not accuse a curated experience of being AI-generated", () => {
    render(<ProvenanceBadge poi={curatedExperience()} />);
    expect(screen.getByText(CURATED)).toBeTruthy();
    expect(screen.queryByText(AI)).toBeNull();
  });

  it("labels a guide-authored stop, and never as verified", () => {
    render(<ProvenanceBadge poi={aiPoi()} />);
    expect(screen.getByText(AI)).toBeTruthy();
    expect(screen.queryByText(VERIFIED)).toBeNull();
    expect(screen.queryByText(CURATED)).toBeNull();
  });

  /* §11 — partial data must never become a verification state. */
  it("renders nothing at all when provenance cannot be determined", () => {
    for (const poi of [null, undefined, { id: "unknown-id" } as POI]) {
      const { container, unmount } = render(<ProvenanceBadge poi={poi} />);
      expect(container.textContent).toBe("");
      unmount();
    }
  });

  it("does not render `undefined` or a raw enum value anywhere", () => {
    const { container } = render(
      <>
        <ProvenanceBadge poi={verifiedPoi()} />
        <ProvenanceBadge poi={curatedExperience()} />
        <ProvenanceBadge poi={aiPoi()} />
      </>,
    );
    const text = container.textContent ?? "";
    expect(text).not.toContain("undefined");
    for (const raw of ["needs_verification", "unverified", "ai_suggested"]) {
      expect(text).not.toContain(raw);
    }
  });

  it("honours `only`, so the timeline can flag the exception and stay quiet otherwise", () => {
    const { container } = render(<ProvenanceBadge poi={verifiedPoi()} only={["ai_suggested"]} />);
    expect(container.textContent).toBe("");
    render(<ProvenanceBadge poi={aiPoi()} only={["ai_suggested"]} />);
    expect(screen.getByText(AI)).toBeTruthy();
  });
});

describe("ProvenanceNote", () => {
  it("explains an AI suggestion without scaring anyone", () => {
    render(<ProvenanceNote poi={aiPoi()} />);
    const note = translate("en", "trip.provenance.aiNote");
    expect(screen.getByText(note)).toBeTruthy();
    expect(note.toLowerCase()).not.toContain("hallucinat");
  });

  it("keeps the verified note to the place and its coordinates", () => {
    render(<ProvenanceNote poi={verifiedPoi()} />);
    expect(screen.getByText(translate("en", "trip.provenance.verifiedNote"))).toBeTruthy();
  });

  it("renders nothing for an unplaceable POI", () => {
    const { container } = render(<ProvenanceNote poi={{ id: "unknown-id" } as POI} />);
    expect(container.textContent).toBe("");
  });
});

/*
 * The place detail is the one surface a traveller reaches when they are deciding whether
 * to actually go somewhere, so it is the one that must carry the sentence and not just
 * the label. It is asserted here rather than in a screenshot because the sheet is a vaul
 * drawer, and a headless synthetic click does not open one — see the visual QA note in
 * the report.
 */
describe("PlaceSheet", () => {
  it("shows the badge and the explanation for a verified place", () => {
    render(<PlaceSheet poi={verifiedPoi()} open onClose={() => {}} />);
    expect(screen.getByText(VERIFIED)).toBeTruthy();
    expect(screen.getByText(translate("en", "trip.provenance.verifiedNote"))).toBeTruthy();
  });

  it("does not call a guide-authored stop verified, and tells the traveller to check", () => {
    render(<PlaceSheet poi={aiPoi()} open onClose={() => {}} />);
    expect(screen.getByText(AI)).toBeTruthy();
    expect(screen.getByText(translate("en", "trip.provenance.aiNote"))).toBeTruthy();
    expect(screen.queryByText(VERIFIED)).toBeNull();
  });

  it("mounts and claims nothing when the POI is not one we can place", () => {
    const stranger = { ...verifiedPoi(), id: "not-in-any-dataset" };
    render(<PlaceSheet poi={stranger} open onClose={() => {}} />);
    expect(screen.queryByText(VERIFIED)).toBeNull();
    expect(screen.queryByText(CURATED)).toBeNull();
    expect(screen.queryByText(AI)).toBeNull();
  });
});

describe("VerifiedLink summary", () => {
  it("counts a wholly verified day", () => {
    const verified = verifiedPoi();
    render(<VerifiedLink trip={tripWith([verified, verified, verified, verified])} />);
    expect(
      screen.getByText(translate("en", "trip.provenance.summaryVerified", { n: 4 })),
    ).toBeTruthy();
  });

  it("drops to curated when one stop is not corroborated", () => {
    render(
      <VerifiedLink
        trip={tripWith([verifiedPoi(), verifiedPoi(), verifiedPoi(), needsVerificationPoi()])}
      />,
    );
    expect(
      screen.getByText(translate("en", "trip.provenance.summaryCurated", { n: 4 })),
    ).toBeTruthy();
  });

  it("splits the count on a mixed day and never says verified", () => {
    render(
      <VerifiedLink trip={tripWith([verifiedPoi(), verifiedPoi(), verifiedPoi(), aiPoi()])} />,
    );
    expect(
      screen.getByText(translate("en", "trip.provenance.summaryMixed", { dataset: 3, ai: 1 })),
    ).toBeTruthy();
    expect(
      screen.queryByText(translate("en", "trip.provenance.summaryVerified", { n: 4 })),
    ).toBeNull();
  });

  /*
   * The regression that started all of this. Whatever the day is made of, the interface
   * must not print the old absolute heading over it.
   */
  it("never renders the retired absolute claim", () => {
    const { container } = render(
      <VerifiedLink trip={tripWith([verifiedPoi(), verifiedPoi(), verifiedPoi(), aiPoi()])} />,
    );
    expect(container.textContent).not.toContain("Verified places");
  });
});
