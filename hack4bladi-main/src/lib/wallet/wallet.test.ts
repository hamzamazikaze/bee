/**
 * The rewards ledger.
 *
 * The load-bearing test in here is the duplicate one: a traveller tapping Visited four
 * times must not mint coins. Everything else is arithmetic.
 */
import { describe, expect, it } from "vitest";
import { COINS_FULL_DAY_BONUS, COINS_PER_KIND } from "@/config/rewards";
import {
  applyTransaction,
  basePriceMad,
  canRedeem,
  creditTripBonus,
  creditVisit,
  discountLabel,
  discountedPriceMad,
  emptyWallet,
  isExperience,
  isRedeemed,
  kindOf,
  redeem,
  rewardFor,
  rewardTypeFor,
  visitTransactionId,
} from "@/lib/wallet";
import { EXPERIENCES, POIS } from "@/data/pois";
import type { POI } from "@/types/poi";

const byId = (id: string): POI => {
  const poi = POIS.find((entry) => entry.id === id);
  if (!poi) throw new Error(`missing fixture POI ${id}`);
  return poi;
};

const LEATHER = byId("exp-leather-bag");
const COOKING = byId("exp-cooking-mi-naima");
const ARTISANS = byId("exp-habous-artisans");
const HASSAN_II = byId("poi-hassan-ii");
const TEA = byId("exp-tea-ritual");

describe("experience data", () => {
  it("gives every curated experience a kind, a duration and honest provenance", () => {
    expect(EXPERIENCES.length).toBeGreaterThanOrEqual(6);
    for (const poi of EXPERIENCES) {
      expect(poi.kind, poi.id).toBeDefined();
      expect(poi.kind, poi.id).not.toBe("place");
      expect(poi.experience, poi.id).toBeDefined();
      expect(poi.baseDurationMinutes, poi.id).toBeGreaterThan(0);
      // Nothing is presented as a signed partnership until it is one.
      expect(poi.experience!.partnerStatus, poi.id).toBe("demo");
      expect(poi.verification, poi.id).toBe("unverified");
      expect(poi.coordinateType, poi.id).toBe("representative");
      expect(rewardFor(poi), poi.id).toBeGreaterThan(0);
    }
  });

  it("validates a workshop and a food experience specifically", () => {
    expect(kindOf(LEATHER)).toBe("workshop");
    expect(kindOf(COOKING)).toBe("food_experience");
    expect(LEATHER.experience?.host?.name).toBeTruthy();
    expect(LEATHER.experience?.includes?.length).toBeGreaterThan(0);
    expect(basePriceMad(LEATHER)).toBe(180);
    expect(basePriceMad(COOKING)).toBe(250);
  });

  it("leaves every ordinary POI exactly as it was", () => {
    const places = POIS.filter((poi) => !poi.kind || poi.kind === "place");
    expect(places.length).toBeGreaterThan(20);
    for (const poi of places) {
      expect(kindOf(poi), poi.id).toBe("place");
      expect(isExperience(poi), poi.id).toBe(false);
      expect(poi.experience, poi.id).toBeUndefined();
      expect(rewardFor(poi), poi.id).toBe(COINS_PER_KIND.place);
    }
  });

  it("does not invent a person for a partner we have not met", () => {
    // A role, never a fabricated name.
    expect(LEATHER.experience?.host?.name).toBe("Local leather artisan");
    expect(ARTISANS.experience?.host?.name).toBe("Local guide");
  });
});

describe("earning coins", () => {
  it("pays the per-kind rate", () => {
    expect(rewardFor(HASSAN_II)).toBe(20);
    expect(rewardFor(ARTISANS)).toBe(50);
    expect(rewardFor(LEATHER)).toBe(100);
    expect(rewardFor(COOKING)).toBe(80);
  });

  it("labels a place visit and an experience differently in history", () => {
    expect(rewardTypeFor(HASSAN_II)).toBe("visit_reward");
    expect(rewardTypeFor(LEATHER)).toBe("activity_reward");
  });

  it("credits a visit once and only once", () => {
    const first = creditVisit(emptyWallet(), { tripId: "t1", poi: LEATHER, label: "Leather" });
    expect(first.balance).toBe(100);
    expect(first.lifetimeEarned).toBe(100);

    const second = creditVisit(first, { tripId: "t1", poi: LEATHER, label: "Leather" });
    expect(second.balance).toBe(100);
    expect(second.transactions).toHaveLength(1);
    // Same object back: nothing changed, so nothing to persist.
    expect(second).toBe(first);
  });

  it("does not confuse the same stop on two different days", () => {
    let wallet = creditVisit(emptyWallet(), { tripId: "t1", poi: LEATHER, label: "L" });
    wallet = creditVisit(wallet, { tripId: "t2", poi: LEATHER, label: "L" });
    expect(wallet.balance).toBe(200);
    expect(wallet.transactions).toHaveLength(2);
  });

  it("pays the day bonus once per trip", () => {
    let wallet = creditTripBonus(emptyWallet(), { tripId: "t1", label: "Casablanca" });
    expect(wallet.balance).toBe(COINS_FULL_DAY_BONUS);
    wallet = creditTripBonus(wallet, { tripId: "t1", label: "Casablanca" });
    expect(wallet.balance).toBe(COINS_FULL_DAY_BONUS);
    expect(wallet.transactions).toHaveLength(1);
  });

  it("cannot be farmed by replaying a whole day", () => {
    const day = [HASSAN_II, ARTISANS, LEATHER, COOKING];
    let wallet = emptyWallet();
    for (let round = 0; round < 5; round += 1) {
      for (const poi of day) wallet = creditVisit(wallet, { tripId: "t1", poi, label: poi.name });
      wallet = creditTripBonus(wallet, { tripId: "t1", label: "Casablanca" });
    }
    expect(wallet.balance).toBe(20 + 50 + 100 + 80 + COINS_FULL_DAY_BONUS);
    expect(wallet.transactions).toHaveLength(5);
  });

  it("builds a stable id from the trip and the POI", () => {
    expect(visitTransactionId("t1", "exp-leather-bag")).toBe("visit:t1:exp-leather-bag");
  });

  it("refuses a transaction that would drive the balance negative", () => {
    const wallet = applyTransaction(emptyWallet(), {
      id: "x",
      type: "discount_redemption",
      amount: -50,
      timestamp: 0,
      label: "nope",
    });
    expect(wallet.balance).toBe(0);
    expect(wallet.transactions).toHaveLength(0);
  });
});

describe("discounts", () => {
  const rich = () => {
    let wallet = emptyWallet();
    for (let i = 0; i < 6; i += 1) {
      wallet = creditVisit(wallet, { tripId: `t${i}`, poi: LEATHER, label: "L" });
    }
    return wallet; // 600 coins
  };

  it("computes a percentage discount", () => {
    expect(LEATHER.experience?.discount?.percent).toBe(10);
    expect(discountedPriceMad(LEATHER)).toBe(162); // 180 − 10%
    expect(discountLabel(LEATHER.experience!.discount!)).toBe("10%");
  });

  it("computes a flat MAD discount", () => {
    expect(TEA.experience?.discount?.amountMAD).toBe(20);
    expect(discountedPriceMad(TEA)).toBe(40); // 60 − 20
    expect(discountLabel(TEA.experience!.discount!)).toBe("20 MAD");
  });

  it("never produces a negative price", () => {
    const generous = { ...TEA, experience: { ...TEA.experience!, discount: { amountMAD: 5000, minimumCoins: 1 } } };
    expect(discountedPriceMad(generous)).toBe(0);
  });

  it("subtracts coins and marks the offer unlocked", () => {
    const wallet = rich();
    const result = redeem(wallet, LEATHER, { label: "Leather" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.wallet.balance).toBe(wallet.balance - 200);
    // Spending does not inflate lifetime earnings.
    expect(result.wallet.lifetimeEarned).toBe(wallet.lifetimeEarned);
    expect(isRedeemed(result.wallet, LEATHER.id)).toBe(true);
  });

  it("refuses a second redemption of the same offer", () => {
    const first = redeem(rich(), LEATHER, { label: "L" });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = redeem(first.wallet, LEATHER, { label: "L" });
    expect(second).toEqual({ ok: false, reason: "already_redeemed" });
  });

  it("refuses when the balance is short, and changes nothing", () => {
    const poor = creditVisit(emptyWallet(), { tripId: "t1", poi: HASSAN_II, label: "H" });
    expect(canRedeem(poor, LEATHER)).toBe("insufficient_balance");

    const result = redeem(poor, LEATHER, { label: "L" });
    expect(result).toEqual({ ok: false, reason: "insufficient_balance" });
    expect(poor.balance).toBe(20);
  });

  it("refuses an experience that carries no offer", () => {
    expect(canRedeem(rich(), ARTISANS)).toBe("no_offer");
  });
});
