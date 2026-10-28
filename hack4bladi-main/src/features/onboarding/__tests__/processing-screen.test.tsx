/**
 * The generation screen must reach the trip, and must show real work on the way.
 *
 * These are the claims a screenshot cannot check: that the stages the traveller watches
 * are made of their own preferences and of places we really did review, that the run
 * always ends by handing a four-stop day to `onReady` — without any network, because
 * `buildTrip()` falls back locally when the API is absent — and that the three defects
 * the browser audit found cannot come back:
 *
 *   1. READY is a phase with time of its own, not a label swapped on the way out.
 *   2. The route is ONE path element, not a set of fragments.
 *   3. A rejected candidate and its reason are on screen in the first painted frame.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessingScreen } from "../processing-screen";
import { CandidateStage } from "../generation-stages";
import { buildTrip } from "../build-trip";
import { candidateFeed, stopMatches, SCAN_WINDOW } from "../generation-candidates";
import { cloneGoldenTrip } from "@/data/fixtures";
import { useAppStore } from "@/lib/store";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import type { TripProfile } from "@/types/profile";

const PROFILE: TripProfile = {
  ...createEmptyProfile(),
  destination: "Casablanca",
  interests: ["culture", "food", "hidden_gems"],
  timeAvailable: "half_day",
  budgetLevel: "medium",
  pace: "relaxed",
  walkingPreference: "minimal",
  locale: "en",
};

beforeEach(() => {
  // `t()` reads the app locale, not the profile's: French is the product default.
  useAppStore.setState({ hydrated: true, locale: "en" });

  /* Reduced motion collapses the choreography to ~2s, so the whole run fits inside a
     test without faking the clock the promises are actually racing. */
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

const phaseOf = () => screen.getByTestId("generation-screen").dataset.phase;

describe("the generation screen", () => {
  it("opens on the traveller's own preferences", () => {
    render(<ProcessingScreen profile={PROFILE} onReady={vi.fn()} />);
    expect(screen.getByText("Understanding your inspiration")).toBeTruthy();
    expect(screen.getByText("Culture & Heritage")).toBeTruthy();
    expect(screen.getByText("Half day")).toBeTruthy();
  });

  it("hands the built day over rather than stalling", async () => {
    const onReady = vi.fn();
    render(<ProcessingScreen profile={PROFILE} onReady={onReady} />);

    await waitFor(() => expect(onReady).toHaveBeenCalled(), { timeout: 8_000 });
    expect(onReady.mock.calls[0][0].stops).toHaveLength(4);
  }, 10_000);
});

/**
 * P0-1. The audit caught "Your route is ready" being painted at ~15% opacity for about
 * 160ms, because the headline change and the exit fade were the same state transition.
 */
describe("the ready beat", () => {
  it("is a phase of its own, reached before anything navigates", async () => {
    const onReady = vi.fn();
    render(<ProcessingScreen profile={PROFILE} onReady={onReady} />);

    await waitFor(() => expect(phaseOf()).toBe("ready"), { timeout: 8_000 });

    // The payoff is readable and the finished route is still on the surface with it.
    expect(screen.getByText("Your route is ready")).toBeTruthy();
    expect(screen.getByTestId("route-path")).toBeTruthy();
    // And the screen has NOT begun to leave.
    expect(onReady).not.toHaveBeenCalled();
    expect(phaseOf()).not.toBe("handoff");
  }, 10_000);

  it("runs ready → handoff → navigation, in that order", async () => {
    const seen: string[] = [];
    const onReady = vi.fn(() => void seen.push("navigate"));
    render(<ProcessingScreen profile={PROFILE} onReady={onReady} />);

    /* Sampled rather than awaited per phase: the point is the ORDER of the states, and a
       poll fast enough to catch a 160ms phase is fast enough to catch a 650ms one. */
    const poll = setInterval(() => {
      const phase = phaseOf();
      if (phase && seen[seen.length - 1] !== phase) seen.push(phase);
    }, 20);
    await waitFor(() => expect(onReady).toHaveBeenCalled(), { timeout: 8_000 });
    clearInterval(poll);

    expect(seen).toContain("ready");
    expect(seen.indexOf("route")).toBeLessThan(seen.indexOf("ready"));
    expect(seen.indexOf("ready")).toBeLessThan(seen.indexOf("handoff"));
    expect(seen.indexOf("handoff")).toBeLessThan(seen.indexOf("navigate"));
  }, 10_000);

  it("says the day is done in the status bar too", async () => {
    render(<ProcessingScreen profile={PROFILE} onReady={vi.fn()} />);
    await waitFor(() => expect(phaseOf()).toBe("ready"), { timeout: 8_000 });

    // The one restrained confirmation detail, and the completed mark beside it.
    expect(screen.getByTestId("generation-summary").textContent).toContain("4 experiences");
    expect(screen.getByTestId("generation-status-mark").className).toContain("bg-primary");
  }, 10_000);
});

/**
 * P0-2. The route rendered as two detached strokes with stop 3 orphaned, because a
 * `pathLength` dash animation was being stroked with `vector-effect: non-scaling-stroke`
 * inside a viewBox stretched 3.6:1. The structural invariant is one path, one pen.
 */
describe("the route drawing", () => {
  it("is a single continuous path, never fragments", async () => {
    render(<ProcessingScreen profile={PROFILE} onReady={vi.fn()} />);
    await waitFor(() => expect(phaseOf()).toBe("ready"), { timeout: 8_000 });

    const canvas = screen.getByTestId("route-canvas");
    expect(canvas.querySelectorAll("path")).toHaveLength(1);

    const path = screen.getByTestId("route-path");
    // The defect's two ingredients, asserted absent rather than described in a comment.
    expect(path.getAttribute("vector-effect")).toBeNull();

    // A near-uniform viewBox is what keeps dash lengths and path length in one space.
    const [, , w, h] = (canvas.getAttribute("viewBox") ?? "").split(" ").map(Number);
    expect(w / h).toBeGreaterThan(1.6);
    expect(w / h).toBeLessThan(2.4);
  }, 10_000);

  it("places every stop of the day on the route", async () => {
    render(<ProcessingScreen profile={PROFILE} onReady={vi.fn()} />);
    await waitFor(() => expect(phaseOf()).toBe("ready"), { timeout: 8_000 });

    const surface = screen.getByTestId("stage-surface");
    for (const order of ["1", "2", "3", "4"]) {
      expect(within(surface).getByText(order)).toBeTruthy();
    }
  }, 10_000);
});

/**
 * P0-3. Five browser samples across two runs and two locales showed only green ticks:
 * the rules could not fire on this dataset at all, so there was nothing to schedule.
 */
describe("candidate rejection", () => {
  it("rejects real candidates for this profile", () => {
    const feed = candidateFeed(PROFILE);
    const rejected = feed.filter((candidate) => candidate.reject !== null);
    expect(rejected.length).toBeGreaterThan(0);
    for (const candidate of rejected) expect(candidate.rejectKey).toBeTruthy();
  });

  /* The opening window is the frame every screenshot is guaranteed to catch, because the
     stream starts pre-filled. A rejection has to be in it. */
  it("puts a rejection inside the opening window", () => {
    const feed = candidateFeed(PROFILE);
    const opening = feed.slice(0, SCAN_WINDOW);
    expect(opening.some((candidate) => candidate.reject !== null)).toBe(true);
  });

  it("shows a rejected candidate and its reason on the first painted frame", () => {
    /* Rendered directly rather than waited for through the run: the scan phase can be as
       short as 260ms under reduced motion, and this asserts what the stage paints on
       mount, which is the thing the acceptance screenshot has to contain. */
    render(<CandidateStage profile={PROFILE} />);

    const first = candidateFeed(PROFILE)
      .slice(0, SCAN_WINDOW)
      .find((candidate) => candidate.reject !== null)!;

    expect(screen.getByText(first.poi.name)).toBeTruthy();
    // The reason, in words, next to it — not just a grey icon.
    expect(screen.getByText("Above your budget")).toBeTruthy();
  });

  /**
   * The one thing worse than rejecting nothing: rejecting a place the trip then contains.
   * The scan runs before the day exists, so this is the guard that keeps the two honest.
   */
  it("never rejects a candidate the engine actually selects", async () => {
    const trip = await buildTrip(PROFILE);
    const rejected = new Set(
      candidateFeed(PROFILE)
        .filter((candidate) => candidate.reject !== null)
        .map((candidate) => candidate.poi.id),
    );
    for (const stop of trip.stops) expect(rejected.has(stop.poiId)).toBe(false);
  }, 10_000);
});

describe("what the screen is allowed to claim", () => {
  it("reviews only real places, and rejects them for real reasons", () => {
    const feed = candidateFeed(PROFILE);
    expect(feed.length).toBeGreaterThan(6);
    for (const candidate of feed) {
      expect(candidate.poi.name).toBeTruthy();
      expect(candidate.reject === null).toBe(candidate.rejectKey === null);
    }
  });

  it("scores every stop of the real day, inside a band it can defend", () => {
    const matches = stopMatches(cloneGoldenTrip());
    expect(matches).toHaveLength(4);
    for (const match of matches) {
      expect(match.score).toBeGreaterThanOrEqual(80);
      expect(match.score).toBeLessThanOrEqual(98);
      expect(match.tags.length).toBeLessThanOrEqual(3);
    }
  });
});
