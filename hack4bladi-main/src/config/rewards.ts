/**
 * Khotwa Coins — the loyalty numbers, in one place.
 *
 * A rewards ledger, not a wallet: no money, no payment, no settlement. Coins are earned by
 * finishing what you set out to do that day, and spent to unlock a partner's offer. The
 * partner is paid in cash, in person, as they always were.
 *
 * Every number below is a product constant. They live here rather than in the components
 * that display them so that tuning the economy is one edit, not a search.
 */
import type { ExperienceKind } from "@/types/poi";

/** Earned for finishing one stop, by what kind of stop it was. */
export const COINS_PER_KIND: Record<ExperienceKind, number> = {
  place: 20,
  local_activity: 50,
  workshop: 100,
  food_experience: 80,
};

/** Earned once, for finishing all four stops of a day. */
export const COINS_FULL_DAY_BONUS = 100;

/** Guards the ledger against a corrupt or hand-edited stored value. */
export const MAX_REASONABLE_BALANCE = 1_000_000;

export const CURRENCY = "MAD" as const;
