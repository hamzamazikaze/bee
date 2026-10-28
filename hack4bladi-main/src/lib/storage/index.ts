/**
 * The only place in the app that touches localStorage.
 *
 * Every read is guarded: a corrupt or stale value is dropped, never thrown. Bumping
 * STORAGE_VERSION invalidates everything written by an older build.
 */
import type { Locale } from "@/types/common";
import type { Passport } from "@/types/experience";
import type { TripProfile } from "@/types/profile";
import type { Trip } from "@/types/trip";
import type { Wallet } from "@/types/wallet";
import { TRIP_STOP_COUNT } from "@/types/trip";
import { isLocale } from "@/lib/i18n/locales";

const STORAGE_VERSION = "v1";
const PREFIX = `siyaha:${STORAGE_VERSION}:`;

const KEYS = {
  trip: `${PREFIX}trip`,
  passport: `${PREFIX}passport`,
  profile: `${PREFIX}profile`,
  locale: `${PREFIX}locale`,
  saved: `${PREFIX}saved`,
  wallet: `${PREFIX}wallet`,
} as const;

function available(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function read<T>(key: string, guard: (value: unknown) => value is T): T | null {
  if (!available()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (!available()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private mode. Persistence is a convenience, never a requirement.
  }
}

function remove(key: string): void {
  if (!available()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Shape guards, not full schemas — this is our own data, only corruption matters. */
function isTrip(value: unknown): value is Trip {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    Array.isArray(value.stops) &&
    value.stops.length === TRIP_STOP_COUNT &&
    Array.isArray(value.segments) &&
    isRecord(value.metrics)
  );
}

function isPassport(value: unknown): value is Passport {
  return isRecord(value) && Array.isArray(value.stamps);
}

function isProfile(value: unknown): value is TripProfile {
  return isRecord(value) && Array.isArray(value.interests);
}

export const storage = {
  saveTrip: (trip: Trip) => write(KEYS.trip, trip),
  loadTrip: () => read(KEYS.trip, isTrip),
  clearTrip: () => remove(KEYS.trip),

  savePassport: (passport: Passport) => write(KEYS.passport, passport),
  loadPassport: () => read(KEYS.passport, isPassport),

  saveProfile: (profile: TripProfile) => write(KEYS.profile, profile),
  loadProfile: () => read(KEYS.profile, isProfile),

  saveSaved: (poiIds: string[]) => write(KEYS.saved, poiIds),
  loadSaved: () =>
    read(KEYS.saved, (value): value is string[] =>
      Array.isArray(value) && value.every((item) => typeof item === "string"),
    ),

  /* The ledger is our own data, so the guard only has to survive corruption, not attack:
     a hand-edited balance is still bounded by the wallet's own arithmetic on write. */
  saveWallet: (wallet: Wallet) => write(KEYS.wallet, wallet),
  loadWallet: () =>
    read(
      KEYS.wallet,
      (value): value is Wallet =>
        isRecord(value) &&
        typeof value.balance === "number" &&
        Number.isFinite(value.balance) &&
        value.balance >= 0 &&
        typeof value.lifetimeEarned === "number" &&
        Array.isArray(value.transactions) &&
        Array.isArray(value.redeemed),
    ),

  saveLocale: (locale: Locale) => write(KEYS.locale, locale),
  loadLocale: () => read(KEYS.locale, (value): value is Locale => isLocale(value)),

  clearAll: () => Object.values(KEYS).forEach(remove),
};
