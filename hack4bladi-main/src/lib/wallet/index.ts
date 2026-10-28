/**
 * Wallet arithmetic. Pure, synchronous, no storage and no React — the store calls these
 * and persists the result.
 *
 * Two rules carry the whole design:
 *
 *  1. **A transaction id is derived, never generated.** `visit:<tripId>:<poiId>` is the
 *     same string every time that stop is completed, so a ledger that already holds it
 *     rejects the duplicate. That is what stops a traveller tapping Visited four times and
 *     minting coins out of nothing — no counters, no flags, no clean-up.
 *  2. **Credit is refused, not thrown.** Applying a duplicate returns the wallet unchanged.
 *     Marking a stop visited must never fail because of the reward system.
 */
import { COINS_FULL_DAY_BONUS, COINS_PER_KIND, MAX_REASONABLE_BALANCE } from "@/config/rewards";
import type { ExperienceDiscount, ExperienceKind, POI } from "@/types/poi";
import type { RedeemedOffer, Wallet, WalletTransaction, WalletTransactionType } from "@/types/wallet";

export function emptyWallet(): Wallet {
  return { balance: 0, lifetimeEarned: 0, transactions: [], redeemed: [] };
}

export function kindOf(poi: Pick<POI, "kind">): ExperienceKind {
  return poi.kind ?? "place";
}

/** True for anything that is not a plain sightseeing stop. */
export function isExperience(poi: Pick<POI, "kind">): boolean {
  return kindOf(poi) !== "place";
}

/** What finishing this stop is worth. A curated override wins over the per-kind default. */
export function rewardFor(poi: Pick<POI, "kind" | "experience">): number {
  const override = poi.experience?.rewardCoins;
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return Math.round(override);
  }
  return COINS_PER_KIND[kindOf(poi)];
}

/** The transaction type that matches the stop, so history reads correctly. */
export function rewardTypeFor(poi: Pick<POI, "kind">): WalletTransactionType {
  return kindOf(poi) === "place" ? "visit_reward" : "activity_reward";
}

// ── Deterministic ids ───────────────────────────────────────────────────────

export const visitTransactionId = (tripId: string, poiId: string) => `visit:${tripId}:${poiId}`;
export const tripBonusTransactionId = (tripId: string) => `bonus:${tripId}`;
export const redemptionTransactionId = (poiId: string) => `redeem:${poiId}`;

// ── Ledger ──────────────────────────────────────────────────────────────────

export function hasTransaction(wallet: Wallet, id: string): boolean {
  return wallet.transactions.some((entry) => entry.id === id);
}

/**
 * Appends a transaction, or returns the wallet untouched when its id is already there or
 * the balance cannot support it. The caller can always use the result; nothing throws.
 */
export function applyTransaction(wallet: Wallet, transaction: WalletTransaction): Wallet {
  if (hasTransaction(wallet, transaction.id)) return wallet;

  const balance = wallet.balance + transaction.amount;
  if (balance < 0 || balance > MAX_REASONABLE_BALANCE) return wallet;

  return {
    balance,
    lifetimeEarned:
      transaction.amount > 0 ? wallet.lifetimeEarned + transaction.amount : wallet.lifetimeEarned,
    transactions: [...wallet.transactions, transaction],
    redeemed: wallet.redeemed,
  };
}

/** Credit for finishing one stop. Idempotent per (trip, POI). */
export function creditVisit(
  wallet: Wallet,
  options: { tripId: string; poi: Pick<POI, "id" | "kind" | "experience">; label: string; now?: number },
): Wallet {
  const amount = rewardFor(options.poi);
  if (amount <= 0) return wallet;

  return applyTransaction(wallet, {
    id: visitTransactionId(options.tripId, options.poi.id),
    type: rewardTypeFor(options.poi),
    amount,
    relatedPoiId: options.poi.id,
    timestamp: options.now ?? Date.now(),
    label: options.label,
  });
}

/** The once-per-day bonus for finishing all four stops. Idempotent per trip. */
export function creditTripBonus(
  wallet: Wallet,
  options: { tripId: string; label: string; now?: number },
): Wallet {
  return applyTransaction(wallet, {
    id: tripBonusTransactionId(options.tripId),
    type: "trip_bonus",
    amount: COINS_FULL_DAY_BONUS,
    timestamp: options.now ?? Date.now(),
    label: options.label,
  });
}

// ── Discounts ───────────────────────────────────────────────────────────────

export function isRedeemed(wallet: Wallet, poiId: string): boolean {
  return wallet.redeemed.some((offer) => offer.poiId === poiId);
}

export type RedeemFailure = "no_offer" | "already_redeemed" | "insufficient_balance";

export type RedeemResult =
  | { ok: true; wallet: Wallet; offer: RedeemedOffer }
  | { ok: false; reason: RedeemFailure };

export function canRedeem(
  wallet: Wallet,
  poi: Pick<POI, "id" | "experience">,
): RedeemFailure | null {
  const discount = poi.experience?.discount;
  if (!discount) return "no_offer";
  if (isRedeemed(wallet, poi.id)) return "already_redeemed";
  if (wallet.balance < discount.minimumCoins) return "insufficient_balance";
  return null;
}

/**
 * Spends coins to unlock a partner's offer.
 *
 * It unlocks; it does not pay. The traveller settles with the artisan directly — this
 * only records that they earned the right to the discount.
 */
export function redeem(
  wallet: Wallet,
  poi: Pick<POI, "id" | "experience">,
  options: { label: string; now?: number },
): RedeemResult {
  const failure = canRedeem(wallet, poi);
  if (failure) return { ok: false, reason: failure };

  const discount = poi.experience!.discount!;
  const now = options.now ?? Date.now();
  const offer: RedeemedOffer = { poiId: poi.id, coinsSpent: discount.minimumCoins, timestamp: now };

  const debited = applyTransaction(wallet, {
    id: redemptionTransactionId(poi.id),
    type: "discount_redemption",
    amount: -discount.minimumCoins,
    relatedPoiId: poi.id,
    timestamp: now,
    label: options.label,
  });
  // applyTransaction refuses a debit it cannot cover; that is the same failure.
  if (debited === wallet) return { ok: false, reason: "insufficient_balance" };

  return { ok: true, wallet: { ...debited, redeemed: [...debited.redeemed, offer] }, offer };
}

// ── Prices ──────────────────────────────────────────────────────────────────

/** The price before any discount, in MAD, or null when the experience is free or unpriced. */
export function basePriceMad(poi: Pick<POI, "experience">): number | null {
  const price = poi.experience?.price;
  if (!price) return null;
  const amount = price.amount ?? price.min;
  return typeof amount === "number" && amount > 0 ? amount : null;
}

/**
 * What the traveller pays once the offer is unlocked. Never negative, never above the
 * original: a partner offering 500 MAD off a 200 MAD workshop gets a free workshop, not a
 * refund.
 */
export function discountedPriceMad(
  poi: Pick<POI, "experience">,
  discount: ExperienceDiscount | undefined = poi.experience?.discount,
): number | null {
  const base = basePriceMad(poi);
  if (base === null || !discount) return base;

  const off =
    typeof discount.percent === "number"
      ? (base * discount.percent) / 100
      : (discount.amountMAD ?? 0);

  return Math.max(0, Math.round(base - off));
}

/** "10%" or "30 MAD", for the offer line. */
export function discountLabel(discount: ExperienceDiscount): string {
  if (typeof discount.percent === "number") return `${discount.percent}%`;
  return `${discount.amountMAD ?? 0} MAD`;
}
