import { describe, expect, it } from "vitest";
import { dietConflicts, EMPTY_DIET } from "../m3ak";
import { planTotals, planWeek } from "../week-plan";

describe("planWeek", () => {
  it("fills the chosen days within budget, respects the diet, and varies the dishes", () => {
    const diet = { ...EMPTY_DIET, excludes: ["poisson" as const] };
    const days = planWeek({ perDay: 30, people: 4, days: [1, 2, 3, 4, 5], diet, wants: [], city: "casablanca" });
    const dishes = days.map((day) => day.dish!);
    expect(dishes).toHaveLength(5);
    expect(dishes.every((dish) => dietConflicts(dish, diet).length === 0)).toBe(true);
    expect(new Set(dishes.map((dish) => dish.id)).size).toBe(5);
    expect(planTotals(days, 4).total).toBeLessThanOrEqual(30 * 5 * 4);
  });

  it("puts liked food first and plans only the chosen days", () => {
    const days = planWeek({ perDay: 40, people: 1, days: [3], diet: EMPTY_DIET, wants: ["poulet"], city: "casablanca" });
    expect(days.map((day) => day.label)).toEqual(["Mercredi"]);
    expect(days[0].dish?.ingredients).toContain("poulet");
  });
});
