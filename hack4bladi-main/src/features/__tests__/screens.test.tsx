/**
 * The render safety floor.
 *
 * The business suite never touches a component, so before this file a redesign could
 * break every screen with all gates green. These assert the minimum: each screen
 * mounts, and the golden day is actually on the page.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { HomeScreen } from "@/features/home";
import { OnboardingFlow } from "@/features/onboarding";
import { ExploreScreen } from "@/features/explore";
import { SavedScreen } from "@/features/saved";
import { PassportScreen } from "@/features/passport";
import { ExperienceScreen } from "@/features/experience";
import TripPage from "@/app/trip/page";
import { cloneGoldenTrip } from "@/data/fixtures";
import { direction } from "@/lib/i18n/locales";
import { useAppStore } from "@/lib/store";

const GOLDEN = ["Quartier Habous", "Marché Central", "Espace Sacré-Cœur", "Mosquée Hassan II"];

beforeEach(() => {
  /* Node exposes a disabled global `localStorage` that shadows jsdom's, so go through
     `window` — which is also exactly what src/lib/storage does. */
  window.localStorage.clear();
  useAppStore.setState({
    hydrated: true,
    locale: "en",
    trip: null,
    mode: "planning",
    activeStopId: null,
    adaptation: null,
    tripBeforeAdaptation: null,
    passport: { stamps: [], updatedAt: new Date(0).toISOString() },
  });
});

describe("screens render", () => {
  /*
   * The hero used to be a search pill; it is now a "Plan my day" CTA with a quieter
   * second line for the typed sentence. Both are asserted by where they *go* rather than
   * by an aria-label, because the thing that must not regress is that the front door
   * still opens the composer — a CTA that renders and leads nowhere is the failure worth
   * catching.
   */
  it("Home leads with the greeting and opens the composer", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Where are we going today?")).toBeTruthy();

    const cta = screen.getByRole("link", { name: /Plan my day/i });
    expect(cta.getAttribute("href")).toBe("/onboarding?new");

    // The only thing on Home that still advertises describing the day in your own words.
    const inspiration = screen.getByRole("link", { name: /What inspired you\?/i });
    expect(inspiration.getAttribute("href")).toBe("/onboarding?new");
  });

  it("Onboarding starts at step 1 of 3", () => {
    render(<OnboardingFlow />);
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
  });

  it("Explore lists the curated dataset", () => {
    render(<ExploreScreen />);
    expect(screen.getAllByText("Mosquée Hassan II").length).toBeGreaterThan(0);
  });

  it("Saved offers an honest empty state, never a fabricated record", () => {
    render(<SavedScreen />);
    expect(screen.getByText(/Your next favourite place/)).toBeTruthy();
  });

  it("Passport reports zero stamps before anything is visited", () => {
    render(<PassportScreen />);
    expect(screen.getByText(/0 of 4 collected/)).toBeTruthy();
  });

  it("Experience shows the golden route, stop by stop", () => {
    useAppStore.getState().setTrip(cloneGoldenTrip());
    render(<ExperienceScreen />);
    for (const name of GOLDEN) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });
});

describe("localisation", () => {
  it("maps every locale to a direction, and only Arabic to rtl", () => {
    expect(direction("en")).toBe("ltr");
    expect(direction("fr")).toBe("ltr");
    expect(direction("ar")).toBe("rtl");
  });

  it("renders Home in Arabic without falling back to English", () => {
    useAppStore.setState({ locale: "ar" });
    render(<HomeScreen />);
    expect(screen.getByText("إلى أين نذهب اليوم؟")).toBeTruthy();
    expect(screen.queryByText("Where are we going today?")).toBeNull();
  });
});

/**
 * The guide has two front doors and one implementation. These assert the second door
 * exists and opens, because a sheet that typechecks and never renders is exactly the
 * failure this file was written to catch.
 */
describe("the guide inside onboarding", () => {
  it("offers the conversation as a starting point, behind More options", () => {
    render(<OnboardingFlow />);

    /* Deliberately hidden until asked for: the composer's one dominant input is the
       textarea, and a second loud entry point would compete with it. */
    expect(screen.queryByRole("button", { name: /ask a local/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /more options/i }));
    expect(screen.getByRole("button", { name: /ask a local/i })).toBeTruthy();
  });

  it("opens the conversation in a sheet, with its own composer", () => {
    render(<OnboardingFlow />);

    fireEvent.click(screen.getByRole("button", { name: /more options/i }));
    fireEvent.click(screen.getByRole("button", { name: /ask a local/i }));

    /* The sheet carries the whole conversation: the empty state that invites a first
       question, and the input to answer it with. */
    expect(screen.getByText(/Ask me anything about this place/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Ask anything/i)).toBeTruthy();
  });
});

/**
 * A jury looking for mocked data will tap Trip before planning anything. What they find
 * there is the whole answer to "is this real?", so it is worth a test of its own.
 */
describe("the trip screen before anything is planned", () => {
  it("shows no day at all, rather than a fixture that looks like one", () => {
    render(<TripPage />);

    /* The golden day used to be written into the store on arrival. Naming its stops here
       is the point: if any of them ever comes back without a traveller asking, this fails. */
    for (const name of GOLDEN) expect(screen.queryByText(name)).toBeNull();

    expect(screen.getByText(/have not built a day yet/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /plan my day/i })).toBeTruthy();
  });
});
