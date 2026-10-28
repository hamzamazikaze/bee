import "server-only";
import { orFallback } from "@/lib/ai/http";
import { loadOpenGroup, loadTodaysMenu } from "@/lib/benna/menu-source";
import { matchMeals, withDiet, type Diet, type M3akAnswer, type MealRequest } from "@/features/benna/m3ak";

export const WORKPLACE_ID = /^[a-z0-9-]{1,40}$/;

type Outcome = { ok: true; answer: M3akAnswer } | { ok: false; status: number; error: string };

/**
 * Today's menu matched against one request — shared by M3AK text, M3AK voice and the photo
 * search. The request is awaited alongside the menu load so the model and the database run
 * in parallel. The eater's diet profile is folded in: its refusals join the request, and
 * any dish declaring one of its allergens is never offered.
 */
export async function m3akAnswer(
  read: Promise<{ request: MealRequest; source: M3akAnswer["source"] }>,
  workplaceId: string,
  diet: Diet,
  signal: AbortSignal,
): Promise<Outcome> {
  const [{ request, source }, menu, group] = await Promise.all([
    read,
    loadTodaysMenu(workplaceId, signal).catch((error: unknown) => {
      console.error("[benna/m3ak] menu load failed:", error instanceof Error ? error.message : error);
      return null;
    }),
    orFallback(() => loadOpenGroup(workplaceId, signal), null),
  ]);

  if (!menu) {
    return { ok: false, status: 503, error: "Le menu du jour est indisponible pour le moment. Réessayez dans un instant." };
  }
  if (!menu.length) {
    return { ok: false, status: 404, error: "Aucune cuisine ne livre votre lieu de travail aujourd'hui." };
  }

  const merged = withDiet(request, diet);
  const safe = menu.filter((row) => !diet.allergens.some((allergen) => row.allergens.includes(allergen)));
  const { matches, partial } = matchMeals(merged, safe);
  return { ok: true, answer: { request: merged, matches, partial, group, source } };
}
