import { askModel } from "@/lib/ai/benna-model";
import { m3akAnswer, WORKPLACE_ID } from "@/lib/benna/m3ak-answer";
import { EMPTY_DIET, extractPrompt, localRequest, parseDiet, parseRequest } from "@/features/benna/m3ak";

/**
 * POST /api/benna/m3ak — { text | request, workplaceId, diet? } → what was understood +
 * matching dishes.
 *
 * The model only reads the request into MealRequest; the menu, prices, savings and
 * reasons all come from Supabase rows and code. Extraction and menu load run in parallel.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { text?: unknown; request?: unknown; workplaceId?: unknown; diet?: unknown }
    | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : "";
  // M3AK en direct: the voice model already filled the MealRequest through its tool.
  const given = body?.request === undefined ? null : parseRequest(body.request);
  const workplaceId = typeof body?.workplaceId === "string" ? body.workplaceId : "";
  const diet = parseDiet(body?.diet) ?? EMPTY_DIET;
  if (!text && !given) return Response.json({ error: "Dites ou écrivez ce que vous voulez manger." }, { status: 400 });
  if (!WORKPLACE_ID.test(workplaceId)) {
    return Response.json({ error: "Choisissez d'abord votre lieu de travail." }, { status: 400 });
  }

  const read = given
    ? Promise.resolve({ request: given, source: "ai" as const })
    : askModel(extractPrompt(text), parseRequest, request.signal).then((extracted) =>
        extracted ? { request: extracted, source: "ai" as const } : { request: localRequest(text), source: "local" as const },
      );

  const outcome = await m3akAnswer(read, workplaceId, diet, request.signal);
  return outcome.ok ? Response.json(outcome.answer) : Response.json({ error: outcome.error }, { status: outcome.status });
}
