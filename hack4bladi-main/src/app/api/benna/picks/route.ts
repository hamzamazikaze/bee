import { z } from "zod";
import { askModel } from "@/lib/ai/benna-model";
import { WORKPLACE_ID } from "@/lib/benna/m3ak-answer";
import { KITCHENS, dishById, todaysDishes, workplaceById, type Dish } from "@/features/benna/data";
import { EMPTY_DIET, dietConflicts, parseDiet, type Diet } from "@/features/benna/m3ak";

const kitchenOf = (dish: Dish) => KITCHENS.find((kitchen) => kitchen.id === dish.kitchenId);
const kitchenName = (dish: Dish) => kitchenOf(dish)?.name.replace(/^Cuisine /, "") ?? "";

/**
 * Why a pick is shown, from facts the app holds — never from the model, which only ranks.
 */
function reasonFor(dish: Dish, ordered: Set<string>, lovedKitchens: Set<string>): string {
  if (ordered.has(dish.id)) return "Vous l'avez déjà pris";
  if (lovedKitchens.has(dish.kitchenId)) return `Chez ${kitchenName(dish)}, que vous aimez`;
  if (dish.tag === "healthy") return "Léger";
  if (dish.tag === "nouveau") return "Nouveau aujourd'hui";
  if (dish.tag === "populaire") return "Populaire";
  return "À découvrir";
}

/** No model: liked kitchens first, then one discovery, kitchens varied. */
function localRank(candidates: Dish[], ordered: Set<string>, lovedKitchens: Set<string>, diet: Diet): Dish[] {
  const score = (dish: Dish) =>
    (lovedKitchens.has(dish.kitchenId) ? 3 : 0) +
    (ordered.has(dish.id) ? -1 : 1) +
    (dish.tag === "nouveau" ? 1 : 0) +
    (diet.preferences.includes("leger") && dish.tag === "healthy" ? 2 : 0);
  const sorted = [...candidates].sort((a, b) => score(b) - score(a));
  const picked: Dish[] = [];
  for (const dish of sorted) if (!picked.some((entry) => entry.kitchenId === dish.kitchenId)) picked.push(dish);
  for (const dish of sorted) if (!picked.includes(dish)) picked.push(dish);
  return picked.slice(0, 3);
}

function picksPrompt(candidates: Dish[], history: Dish[], diet: Diet): string {
  return [
    "You recommend lunch to a Moroccan office worker from today's menu. Pick the 3 dishes they will most",
    "likely enjoy: lean on what they ordered before, include one discovery, vary the kitchens.",
    `Their past orders: ${history.length ? history.map((dish) => `${dish.name} (${kitchenName(dish)})`).join("; ") : "none yet"}.`,
    `Their diet: ${diet.preferences.length ? diet.preferences.join(", ") : "nothing special"} (excluded dishes are already removed).`,
    "Today's menu (id | dish | kitchen | tag):",
    ...candidates.map((dish) => `${dish.id} | ${dish.name} | ${kitchenName(dish)} | ${dish.tag ?? "-"}`),
    'Answer with JSON only: {"ids":["id1","id2","id3"]} using ids from the list.',
  ].join("\n");
}

const PicksSchema = z.object({ ids: z.array(z.string()).min(1).max(3) });

/**
 * POST /api/benna/picks — { workplaceId, diet?, history? } → { picks: [{ id, reason }], source }.
 *
 * Candidates are today's menu for the workplace minus anything the diet profile rules out.
 * The model only ranks ids from that list; reasons are written by code from the history.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { workplaceId?: unknown; diet?: unknown; history?: unknown } | null;
  const workplaceId = typeof body?.workplaceId === "string" ? body.workplaceId : "";
  if (!WORKPLACE_ID.test(workplaceId) || !workplaceById(workplaceId)) {
    return Response.json({ error: "Choisissez d'abord votre lieu de travail." }, { status: 400 });
  }
  const diet = parseDiet(body?.diet) ?? EMPTY_DIET;
  const history = (Array.isArray(body?.history) ? body.history : [])
    .filter((id): id is string => typeof id === "string")
    .slice(0, 12)
    .map((id) => dishById(id))
    .filter((dish): dish is Dish => Boolean(dish));

  const candidates = todaysDishes(workplaceById(workplaceId)).filter((dish) => dietConflicts(dish, diet).length === 0);
  const ordered = new Set(history.map((dish) => dish.id));
  const lovedKitchens = new Set(history.map((dish) => dish.kitchenId));

  const ids = new Set(candidates.map((dish) => dish.id));
  const ranked =
    candidates.length > 3
      ? await askModel(
          picksPrompt(candidates, history, diet),
          (raw) => {
            const parsed = PicksSchema.safeParse(raw);
            const valid = parsed.success ? [...new Set(parsed.data.ids)].filter((id) => ids.has(id)) : [];
            return valid.length ? valid : null;
          },
          request.signal,
        )
      : null;

  const chosen = ranked
    ? [...ranked.map((id) => candidates.find((dish) => dish.id === id)!), ...localRank(candidates, ordered, lovedKitchens, diet)]
        .filter((dish, index, list) => list.indexOf(dish) === index)
        .slice(0, 3)
    : localRank(candidates, ordered, lovedKitchens, diet);

  return Response.json({
    picks: chosen.map((dish) => ({ id: dish.id, reason: reasonFor(dish, ordered, lovedKitchens) })),
    source: ranked ? "ai" : "local",
  });
}
