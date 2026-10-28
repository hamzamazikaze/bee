import { askModel } from "@/lib/ai/benna-model";
import { invitePrompt, inviteTemplate, type InviteLanguage } from "@/features/benna/assistant";
import { DISHES, workplaceById } from "@/features/benna/data";

const LANGUAGES: InviteLanguage[] = ["fr", "darija", "ar"];

/** POST /api/benna/invite — { language, workplaceId } → a WhatsApp message with a {LINK} slot. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { language?: unknown; workplaceId?: unknown } | null;
  const language = LANGUAGES.find((entry) => entry === body?.language) ?? "fr";
  const workplace = workplaceById(typeof body?.workplaceId === "string" ? body.workplaceId : null);
  if (!workplace) return Response.json({ error: "Choisissez d'abord votre lieu de travail." }, { status: 400 });

  const dishes = DISHES.filter((dish) => dish.tag).slice(0, 2);
  const message = await askModel(
    invitePrompt(language, workplace, dishes),
    (raw) => {
      const value = (raw as { message?: unknown } | null)?.message;
      return typeof value === "string" && value.includes("{LINK}") ? value.trim().slice(0, 600) : null;
    },
    request.signal,
    language === "fr" ? ["gemini", "openai"] : ["openai", "gemini"],
  );
  return Response.json({ message: message ?? inviteTemplate(language, workplace, dishes), source: message ? "ai" : "local" });
}
