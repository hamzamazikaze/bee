import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DISHES, KITCHENS, WORKPLACES, kitchenById, menuIdsFor, todaysDishes } from "../data";

const seed = readFileSync(new URL("../../../../supabase/seed.sql", import.meta.url), "utf8");

describe("BENNA demo dataset", () => {
  it("every dish belongs to a kitchen, is cheaper in a group, and has a photo", () => {
    for (const dish of DISHES) {
      expect(kitchenById(dish.kitchenId), dish.id).toBeDefined();
      expect(dish.groupPrice, dish.id).toBeLessThan(dish.soloPrice);
      expect(dish.ingredients.length, dish.id).toBeGreaterThan(0);
      expect(existsSync(new URL(`../../../../public${dish.image}`, import.meta.url)), dish.image).toBe(true);
    }
    expect(new Set(DISHES.map((dish) => dish.id)).size).toBe(DISHES.length);
  });

  it("the weekly rotation only names real dishes", () => {
    const ids = new Set(DISHES.map((dish) => dish.id));
    for (const day of [1, 2, 3, 4, 5]) for (const id of menuIdsFor(day)) expect(ids.has(id), `${day}:${id}`).toBe(true);
  });

  it("every workplace has at least 3 lunches every weekday, from its own city", () => {
    for (const workplace of WORKPLACES) {
      for (const day of [1, 2, 3, 4, 5]) {
        // A date that falls on that ISO weekday in Casablanca (2026-10-19 is a Monday).
        const date = new Date(Date.UTC(2026, 9, 18 + day, 11));
        const dishes = todaysDishes(workplace, date);
        expect(dishes.every((dish) => kitchenById(dish.kitchenId)?.city === workplace.city)).toBe(true);
        expect(dishes.length, `${workplace.id} day ${day}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("every city with a workplace has a kitchen", () => {
    for (const workplace of WORKPLACES) expect(KITCHENS.some((kitchen) => kitchen.city === workplace.city)).toBe(true);
  });

  it("supabase/seed.sql was regenerated after the last data change (pnpm benna:seed)", () => {
    for (const dish of DISHES) expect(seed, dish.id).toContain(`'${dish.id}', '${dish.kitchenId}'`);
    for (const workplace of WORKPLACES) expect(seed).toContain(`'${workplace.code}'`);
  });
});
