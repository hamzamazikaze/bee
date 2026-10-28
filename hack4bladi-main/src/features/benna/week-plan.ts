/**
 * Planificateur de la semaine: one lunch per chosen weekday for the whole group, from each
 * day's real rotation in the workplace's city. Plain code: no model picks a dish or a price.
 */
import { DISHES, kitchenById, menuIdsFor, type City, type Dish } from "./data";
import { CONCEPT_LABEL, declares, dietConflicts, type Concept, type Diet } from "./m3ak";

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;

export type PlanDay = {
  weekday: number;
  label: string;
  dish: Dish | null;
  /** Every compatible dish served that day, the pick first — what "Changer" cycles through. */
  options: Dish[];
};

export type PlanInput = {
  /** MAD per person per lunch. */
  perDay: number;
  people: number;
  /** ISO weekdays 1–5 to plan. */
  days: number[];
  diet: Diet;
  /** Foods they like: ranked first, never required. */
  wants: Concept[];
  city: City;
};

/** The dishes served that day in that city that the profile allows, cheapest first. */
function compatible(weekday: number, city: City, diet: Diet): Dish[] {
  const ids = new Set(menuIdsFor(weekday));
  return DISHES.filter(
    (dish) => ids.has(dish.id) && kitchenById(dish.kitchenId)?.city === city && dietConflicts(dish, diet).length === 0,
  ).sort((a, b) => a.groupPrice - b.groupPrice);
}

export function planWeek({ perDay, days, diet, wants, city }: PlanInput): PlanDay[] {
  const weekdays = [...days].sort();
  const byDay = weekdays.map((weekday) => compatible(weekday, city, diet));
  const light = diet.preferences.includes("leger");
  const hits = (dish: Dish) => wants.filter((concept) => declares(dish, concept)).length;
  const budget = perDay * weekdays.length;
  const used = new Set<string>();
  let spent = 0;

  return weekdays.map((weekday, index) => {
    const label = WEEKDAYS[weekday - 1];
    const choices = byDay[index];
    // Keep the rest of the week affordable: leave room for the cheapest dish of every later day.
    const reserve = byDay.slice(index + 1).reduce((sum, later) => sum + (later[0]?.groupPrice ?? 0), 0);
    const room = budget - spent - reserve;
    const target = (budget - spent) / Math.max(1, byDay.slice(index).filter((later) => later.length).length);
    const affordable = choices.filter((dish) => dish.groupPrice <= room);

    // Variety first, then what they like, then "léger" when asked, then the price that best spends the budget.
    const ranked = (affordable.length ? affordable : choices).sort(
      (a, b) =>
        Number(used.has(a.id)) - Number(used.has(b.id)) ||
        hits(b) - hits(a) ||
        Number(light && b.tag === "healthy") - Number(light && a.tag === "healthy") ||
        Math.abs(a.groupPrice - target) - Math.abs(b.groupPrice - target),
    );
    const dish = ranked[0] ?? null;
    if (dish) {
      used.add(dish.id);
      spent += dish.groupPrice;
    }
    return { weekday, label, dish, options: dish ? [dish, ...choices.filter((other) => other.id !== dish.id)] : [] };
  });
}

/** Why this dish, from the data only — at most three short reasons. */
export function reasonsFor(dish: Dish, { perDay, diet, wants }: Pick<PlanInput, "perDay" | "diet" | "wants">): string[] {
  return [
    ...wants.filter((concept) => declares(dish, concept)).map((concept) => `Avec ${CONCEPT_LABEL[concept]}`),
    ...(diet.preferences.includes("leger") && dish.tag === "healthy" ? ["Léger"] : []),
    ...(dish.groupPrice <= perDay ? [`Dans votre budget de ${perDay} DH`] : []),
    ...diet.excludes.slice(0, 1).map((concept) => `Sans ${CONCEPT_LABEL[concept]}, selon la cuisine`),
  ].slice(0, 3);
}

export function planTotals(days: PlanDay[], people: number) {
  const group = days.reduce((sum, day) => sum + (day.dish?.groupPrice ?? 0), 0) * people;
  const solo = days.reduce((sum, day) => sum + (day.dish?.soloPrice ?? 0), 0) * people;
  return { total: group, saved: solo - group };
}
