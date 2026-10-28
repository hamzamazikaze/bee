/**
 * The Khotwa Wallet — a loyalty ledger, deliberately small.
 *
 * Not banking, not payment, not crypto. Coins are earned by completing stops and spent to
 * unlock a partner's discount; the traveller still pays the artisan in cash, in person.
 * It lives in localStorage because that is all an MVP needs.
 */

export type WalletTransactionType =
  | "visit_reward"
  | "activity_reward"
  | "trip_bonus"
  | "discount_redemption";

export interface WalletTransaction {
  /**
   * Deterministic, and that is the whole anti-farming mechanism: the id for finishing a
   * stop is derived from the trip and the POI, so marking it visited a second time
   * produces an id the ledger already holds and the credit is refused.
   */
  id: string;
  type: WalletTransactionType;
  /** Positive when earned, negative when spent. */
  amount: number;
  relatedPoiId?: string;
  /** Epoch milliseconds. */
  timestamp: number;
  /** Already-localised line for the history list. */
  label: string;
}

export interface RedeemedOffer {
  /** `${poiId}` — one offer per experience in the MVP. */
  poiId: string;
  coinsSpent: number;
  timestamp: number;
}

export interface Wallet {
  balance: number;
  lifetimeEarned: number;
  transactions: WalletTransaction[];
  /** Offers already unlocked. Prevents paying twice for the same discount. */
  redeemed: RedeemedOffer[];
}
