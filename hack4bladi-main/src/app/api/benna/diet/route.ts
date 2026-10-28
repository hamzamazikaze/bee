import { askModel } from "@/lib/ai/benna-model";
import { dietPrompt, localDiet, parseDiet } from "@/features/benna/m3ak";

/**
 * POST /api/benna/diet — { text } → { diet, source }.
 *
 * "Ma kanklch l7out, w 7assas l gluten" becomes a closed profile (exclusions, allergens,
 * preferences). The model only fills that schema; without a model, the local reader does.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 400) : "";
  if (!text) return Response.json({ error: "Dites ce que vous ne mangez pas." }, { status: 400 });

  const fromModel = await askModel(dietPrompt(text), parseDiet, request.signal);
  return Response.json({ diet: fromModel ?? localDiet(text), source: fromModel ? "ai" : "local" });
}
