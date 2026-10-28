import { describe, expect, it } from "vitest";
import { localRequest, matchMeals, parseRequest, type MenuRow, localDiet, dietConflicts } from "../m3ak";

/** The seed's lunch rows (supabase/seed.sql), as todays_menu returns them. */
const row = (id: string, name: string, price: number, solo: number, ingredients: string[], tag: string | null = null, slot: MenuRow["slot"] = "lunch"): MenuRow => ({
  id, name, description: "", slot, group_price_mad: price, solo_price_mad: solo, ingredients, tag, image: `/images/benna/${id}.webp`, kitchen_name: "Cuisine test", allergens: [],
});

const MENU: MenuRow[] = [
  row("tajine-poulet-citron", "Tajine poulet, citron & olives", 34, 50, ["poulet", "citron confit", "olives", "pain"], "populaire"),
  row("tajine-kefta", "Tajine kefta aux œufs", 32, 45, ["kefta", "sauce tomate", "oeufs", "pain"]),
  row("adass", "Adass, lentilles mijotées", 22, 32, ["lentilles", "cumin", "huile d'olive", "pain complet"]),
  row("couscous-7-legumes", "Couscous aux sept légumes", 35, 50, ["semoule", "légumes de saison", "bouillon"], "fait-maison"),
  row("rfissa", "Rfissa au poulet", 38, 55, ["poulet", "msemen", "lentilles", "fenugrec"], "nouveau"),
  row("harira-dattes", "Harira & dattes", 18, 26, ["harira", "dattes"]),
  row("zaalouk-taktouka", "Assiette zaalouk & taktouka", 28, 40, ["aubergines", "poivrons", "pois chiches", "pain complet"], "healthy"),
  row("bowl-poulet-chermoula", "Bowl poulet chermoula", 32, 45, ["poulet", "chermoula", "boulgour", "légumes vapeur"], "healthy"),
  row("msemen-amlou", "Msemen, miel & amlou", 14, 20, ["msemen", "miel", "amlou"], null, "breakfast"),
];

const ids = (text: string) => matchMeals(localRequest(text), MENU).matches.map((match) => match.id);

describe("localRequest (Darija / French)", () => {
  it("reads vegetables, no chicken, 35 DH", () => {
    expect(localRequest("Salam, bghit chi haja b lkhodra, bla djaj, w budget dyali 35 DH")).toEqual({
      budgetMad: 35,
      wants: ["legumes"],
      excludes: ["poulet"],
      meal: null,
      preferences: [],
    });
  });

  it("'bla djaj' is a refusal, never a wish", () => {
    const request = localRequest("bla djaj");
    expect(request.excludes).toEqual(["poulet"]);
    expect(request.wants).toEqual([]);
  });

  it("reads Arabic script and refusing spicy as a preference", () => {
    const request = localRequest("بغيت طاجين بلا لحم و بلا حار");
    expect(request.wants).toContain("tajine");
    expect(request.excludes).toContain("viande");
    expect(request.preferences).toContain("sans-piment");
  });

  it("reads French negation and lunch", () => {
    const request = localRequest("un dejeuner sans fromage à 20 dh");
    expect(request).toMatchObject({ budgetMad: 20, meal: "lunch", excludes: ["laitier"] });
  });

  it("never offers a breakfast row, even when one is asked for (BENNA is lunch only)", () => {
    expect(ids("ftour b 20 DH")).not.toContain("msemen-amlou");
  });
});

describe("matchMeals", () => {
  it("vegetables, no chicken, 35 DH → zaalouk and couscous, no chicken", () => {
    const found = ids("Salam, bghit chi haja b lkhodra, bla djaj, w budget dyali 35 DH");
    expect(found).toEqual(["zaalouk-taktouka", "couscous-7-legumes"]);
    expect(found.some((id) => id.includes("poulet") || id === "rfissa")).toBe(false);
  });

  it("never relaxes a refusal or the budget, even when nothing matches the wish", () => {
    const { matches, partial } = matchMeals(localRequest("bghit hout bla djaj, 25 DH"), MENU);
    expect(partial).toBe(true);
    expect(matches.every((match) => match.groupPrice <= 25)).toBe(true);
    expect(matches.map((match) => match.id)).not.toContain("tajine-poulet-citron");
  });

  it("prices and savings come from the rows", () => {
    const [first] = matchMeals(localRequest("couscous"), MENU).matches;
    expect(first).toMatchObject({ id: "couscous-7-legumes", groupPrice: 35, soloPrice: 50, savings: 15 });
  });
});

describe("parseRequest", () => {
  it("rejects anything outside the closed vocabulary", () => {
    expect(parseRequest({ budgetMad: 30, wants: ["pizza"], excludes: [], meal: null, preferences: [] })).toBeNull();
    expect(parseRequest({ budgetMad: 30, wants: [], excludes: [], meal: null, preferences: [], dishId: "x" })).toBeNull();
  });

  it("lets a refusal beat a wish the model also listed", () => {
    expect(parseRequest({ budgetMad: null, wants: ["poulet", "legumes"], excludes: ["poulet"], meal: null, preferences: [] }))
      .toMatchObject({ wants: ["legumes"], excludes: ["poulet"] });
  });
});

describe("diet profile (no model)", () => {
  it("reads a Darija profile into exclusions, allergens and preferences", () => {
    expect(localDiet("ma kanklch l7out, 7assas l gluten, bla l7arr")).toEqual({
      excludes: ["poisson"],
      allergens: ["gluten", "poisson"],
      preferences: ["sans-piment"],
    });
  });

  it("flags what a dish declares against the profile", () => {
    const kefta = { name: "Tajine kefta aux œufs", ingredients: ["kefta", "sauce tomate", "oeufs"], allergens: ["oeufs", "gluten"] };
    expect(dietConflicts(kefta, { excludes: ["viande"], allergens: ["oeufs"], preferences: [] })).toEqual(["viande", "œufs"]);
    expect(dietConflicts(kefta, { excludes: ["poisson"], allergens: [], preferences: [] })).toEqual([]);
  });
});
