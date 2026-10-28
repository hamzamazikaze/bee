import { describe, expect, it } from "vitest";
import { POINTS, pointsBalance, pointsEarned, rewardCost, rewardPoints, type Order } from "../cart";
import { DISHES } from "../data";

const order = (total: number, extra: Partial<Order> = {}): Order => ({
  id: `BN-${total}`,
  at: "2026-10-23T11:00:00.000Z",
  workplaceId: "casanearshore-2b",
  lines: [],
  total,
  saved: 0,
  payment: "card",
  step: 0,
  ...extra,
});

describe("loyalty points", () => {
  it("earns one point per MAD paid, rounded down", () => {
    expect(pointsEarned(order(35.9))).toBe(35);
  });

  it("balance is earned minus spent, and a cancelled order neither earns nor spends", () => {
    const orders = [
      order(120),
      order(25, { pointsUsed: POINTS.redeem, discount: POINTS.worth }),
      order(80, { cancelled: true }),
      order(40, { cancelled: true, pointsUsed: POINTS.redeem }),
    ];
    expect(pointsBalance(orders)).toBe(120 + 25 - POINTS.redeem);
  });
});

describe("points exchange", () => {
  it("prices an offered dish at 10 points per MAD of its group price", () => {
    const dish = DISHES[0];
    expect(rewardCost(dish.id)).toBe(dish.groupPrice * 10);
    const line = { key: "k", dishId: dish.id, options: [], note: "", qty: 1 };
    expect(rewardPoints([line, { ...line, key: "r", reward: true }])).toBe(dish.groupPrice * 10);
  });
});
