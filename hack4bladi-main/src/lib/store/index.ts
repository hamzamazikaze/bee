"use client";

/**
 * Single cross-route store. Owned by Lead — the integration surface all three workers
 * read and write. Add a slice by extending AppState here, not by creating a second store.
 *
 * Deliberately not using zustand/persist: the trip object is large and we control the
 * save points. Hydration happens once, via <StoreHydration /> in the root layout.
 */
import { create } from "zustand";
import type { Locale } from "@/types/common";
import type { AdaptationResult } from "@/types/adaptation";
import type { Passport, ProcessingState } from "@/types/experience";
import type { TripProfile } from "@/types/profile";
import type { Trip } from "@/types/trip";
import type { Wallet } from "@/types/wallet";
import { storage } from "@/lib/storage";
import {
  creditTripBonus,
  creditVisit,
  emptyWallet,
  redeem as redeemOffer,
  type RedeemResult,
} from "@/lib/wallet";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { detectLocale, writeLocaleCookie } from "@/lib/i18n/preference";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import { POIS } from "@/data/pois";

/** Planning = map + timeline + adapt. Experience = the day is running. */
export type AppMode = "planning" | "experience";

export interface AppState {
  hydrated: boolean;
  locale: Locale;

  /** Built up across onboarding, then handed to the trip engine. */
  profile: TripProfile;
  trip: Trip | null;
  processing: ProcessingState | null;

  mode: AppMode;
  activeStopId: string | null;

  adaptation: AdaptationResult | null;
  /** Snapshot taken before an adaptation so Undo is exact, not recomputed. */
  tripBeforeAdaptation: Trip | null;

  passport: Passport;
  /** POI ids the traveller kept from Explore. The producer behind the Saved screen. */
  savedPoiIds: string[];

  /** Khotwa Coins. A loyalty ledger, not money — see @/types/wallet. */
  wallet: Wallet;
  /**
   * The last credit, for the reward moment on screen. Transient: never persisted, and
   * cleared as soon as the UI has shown it.
   */
  lastReward: { amount: number; kind: "stop" | "day" } | null;

  hydrate: () => void;
  setLocale: (locale: Locale) => void;
  patchProfile: (patch: Partial<TripProfile>) => void;
  resetProfile: () => void;
  /** "Reset my data": trip, preferences, stamps and saved places. Locale survives. */
  resetAll: () => void;
  setTrip: (trip: Trip | null) => void;
  setProcessing: (processing: ProcessingState | null) => void;
  setActiveStop: (stopId: string | null) => void;
  startTrip: () => void;
  endTrip: () => void;
  applyAdaptation: (result: AdaptationResult) => void;
  revertAdaptation: () => void;
  markVisited: (stopId: string) => void;
  toggleSaved: (poiId: string) => void;

  /** Spends coins to unlock a partner offer. Returns why it failed, if it did. */
  redeem: (poiId: string) => RedeemResult;
  clearReward: () => void;
}

const emptyPassport: Passport = { stamps: [], updatedAt: new Date(0).toISOString() };

export const useAppStore = create<AppState>()((set, get) => ({
  hydrated: false,
  locale: DEFAULT_LOCALE,
  profile: createEmptyProfile(DEFAULT_LOCALE),
  trip: null,
  processing: null,
  mode: "planning",
  activeStopId: null,
  adaptation: null,
  tripBeforeAdaptation: null,
  passport: emptyPassport,
  savedPoiIds: [],
  wallet: emptyWallet(),
  lastReward: null,

  hydrate: () => {
    if (get().hydrated) return;
    /**
     * A stored choice always wins. Only a traveller who has never picked one gets the
     * browser's answer — and it is written straight back, so the cookie the server reads
     * on the next request already matches what this first paint decided.
     */
    const stored = storage.loadLocale();
    const locale = stored ?? detectLocale();
    if (!stored) storage.saveLocale(locale);
    writeLocaleCookie(locale);
    set({
      hydrated: true,
      locale,
      trip: storage.loadTrip(),
      passport: storage.loadPassport() ?? emptyPassport,
      profile: storage.loadProfile() ?? createEmptyProfile(locale),
      savedPoiIds: storage.loadSaved() ?? [],
      wallet: storage.loadWallet() ?? emptyWallet(),
    });
  },

  setLocale: (locale) => {
    if (get().locale === locale) return;
    storage.saveLocale(locale);
    writeLocaleCookie(locale);
    /**
     * Only `locale` changes. The trip, the draft, the wallet, the passport and the map
     * are untouched, which is what makes FR → ES read as the same application in another
     * language rather than a fresh session.
     */
    set({ locale });
  },

  patchProfile: (patch) => {
    const profile = { ...get().profile, ...patch };
    storage.saveProfile(profile);
    set({ profile });
  },

  resetProfile: () => {
    const profile = createEmptyProfile(get().locale);
    storage.saveProfile(profile);
    /* The trip has to leave localStorage too: dropping it from state alone let the old
       day walk back in on the next reload. */
    storage.clearTrip();
    set({ profile, trip: null, adaptation: null, tripBeforeAdaptation: null, activeStopId: null });
  },

  resetAll: () => {
    const profile = createEmptyProfile(get().locale);
    storage.saveProfile(profile);
    storage.clearTrip();
    storage.savePassport(emptyPassport);
    storage.saveSaved([]);
    storage.saveWallet(emptyWallet());
    set({
      profile,
      trip: null,
      adaptation: null,
      tripBeforeAdaptation: null,
      activeStopId: null,
      mode: "planning",
      passport: emptyPassport,
      savedPoiIds: [],
      wallet: emptyWallet(),
      lastReward: null,
    });
  },

  setTrip: (trip) => {
    if (trip) storage.saveTrip(trip);
    else storage.clearTrip();
    set({
      trip,
      adaptation: null,
      tripBeforeAdaptation: null,
      activeStopId: trip?.stops[0]?.id ?? null,
      mode: "planning",
    });
  },

  setProcessing: (processing) => set({ processing }),
  setActiveStop: (activeStopId) => set({ activeStopId }),

  startTrip: () => {
    const { trip } = get();
    if (!trip) return;
    const stops = trip.stops.map((stop, index) => ({
      ...stop,
      visitState: index === 0 ? ("current" as const) : stop.visitState,
    }));
    const next = { ...trip, stops };
    storage.saveTrip(next);
    set({ trip: next, mode: "experience", activeStopId: stops[0]?.id ?? null });
  },

  endTrip: () => set({ mode: "planning" }),

  applyAdaptation: (result) => {
    // `adaptation` means "the adaptation currently in effect". A rejection changes
    // nothing: storing it would wipe the applied headline and hide Undo if the user
    // taps Less Walking a second time. The sheet surfaces the reason locally.
    if (!result.applied) return;
    storage.saveTrip(result.trip);
    set({
      tripBeforeAdaptation: get().trip,
      trip: result.trip,
      adaptation: result,
    });
  },

  revertAdaptation: () => {
    const previous = get().tripBeforeAdaptation;
    if (!previous) return;
    storage.saveTrip(previous);
    set({ trip: previous, tripBeforeAdaptation: null, adaptation: null });
  },

  markVisited: (stopId) => {
    const { trip, passport } = get();
    if (!trip) return;

    const index = trip.stops.findIndex((stop) => stop.id === stopId);
    if (index === -1) return;

    const stops = trip.stops.map((stop, i) => {
      if (i === index) return { ...stop, visitState: "visited" as const };
      if (i === index + 1 && stop.visitState === "upcoming") {
        return { ...stop, visitState: "current" as const };
      }
      return stop;
    });

    const visited = trip.stops[index];
    const alreadyStamped = passport.stamps.some((s) => s.poiId === visited.poiId);
    const nextPassport: Passport = alreadyStamped
      ? passport
      : {
          stamps: [
            ...passport.stamps,
            {
              poiId: visited.poiId,
              poiName: visited.poi.name,
              city: visited.poi.city,
              visitedAt: new Date().toISOString(),
              tripId: trip.id,
              imageUrl: visited.poi.media.fallbackImage,
            },
          ],
          updatedAt: new Date().toISOString(),
        };

    /*
     * Coins for finishing this stop, and the day bonus once every stop is done.
     *
     * Both credits are idempotent by construction: their transaction ids are derived from
     * the trip and the POI, so tapping Visited again produces an id the ledger already
     * holds and `applyTransaction` returns the wallet untouched. There is no counter to
     * get out of step and no flag to reset — the ledger is the record.
     */
    const before = get().wallet;
    let wallet = creditVisit(before, {
      tripId: trip.id,
      poi: visited.poi,
      label: visited.poi.name,
    });
    const stopCredit = wallet.balance - before.balance;

    const dayComplete = stops.every((stop) => stop.visitState === "visited");
    const beforeBonus = wallet.balance;
    if (dayComplete) {
      wallet = creditTripBonus(wallet, { tripId: trip.id, label: trip.destination });
    }
    const dayCredit = wallet.balance - beforeBonus;

    const nextTrip = { ...trip, stops };
    storage.saveTrip(nextTrip);
    if (!alreadyStamped) storage.savePassport(nextPassport);
    if (wallet !== before) storage.saveWallet(wallet);

    set({
      trip: nextTrip,
      passport: nextPassport,
      activeStopId: stops[index + 1]?.id ?? stopId,
      wallet,
      /* The day bonus is the louder moment, so it wins the banner when both land at once. */
      lastReward: dayCredit > 0
        ? { amount: dayCredit, kind: "day" }
        : stopCredit > 0
          ? { amount: stopCredit, kind: "stop" }
          : null,
    });
  },

  /* The heart on a place sheet used to be local component state: it filled in, then the
     sheet closed and the choice was gone, while the Saved screen promised "places you
     keep from Explore land here". One list, persisted, read by that screen. */
  toggleSaved: (poiId) => {
    const current = get().savedPoiIds;
    const next = current.includes(poiId)
      ? current.filter((id) => id !== poiId)
      : [...current, poiId];
    storage.saveSaved(next);
    set({ savedPoiIds: next });
  },

  /**
   * Spends coins to unlock a partner's offer.
   *
   * It unlocks; nobody is charged and nothing is settled — the traveller still pays the
   * artisan directly. A refusal (no offer, already unlocked, not enough coins) changes
   * nothing and is handed back for the sheet to explain.
   */
  redeem: (poiId) => {
    const poi = POIS.find((entry) => entry.id === poiId);
    if (!poi) return { ok: false, reason: "no_offer" };

    const result = redeemOffer(get().wallet, poi, { label: poi.name });
    if (result.ok) {
      storage.saveWallet(result.wallet);
      set({ wallet: result.wallet });
    }
    return result;
  },

  clearReward: () => set({ lastReward: null }),
}));
