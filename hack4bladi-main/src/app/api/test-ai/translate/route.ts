/**
 * POST /api/test-ai/translate — TEST 2. { transcript } → the three target languages,
 * on gemini-3.5-flash-lite. Zod validates the model's answer before it is returned.
 */
import { z } from "zod";
import { MODELS, failure, parseJson, text } from "../_gemini";

const Translation = z.object({
  detectedLanguage: z.string().min(1),
  english: z.string(),
  french: z.string(),
  arabic: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { transcript?: unknown };
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    if (!transcript) {
      return Response.json({ success: false, error: { message: "`transcript` is required" } });
    }

    const raw = await text(
      `Translate the text below.

Return ONLY JSON with exactly these keys:
{"detectedLanguage": string, "english": string, "french": string, "arabic": string}

Rules:
- "detectedLanguage" is the English name of the source language.
- Translate meaning, not word for word.
- Keep proper place names, brand names and people's names as they are. Do not translate
  "Casablanca", "El Jadida", "Oualidia" or any other place name into another language.
- Keep numbers and times as they are.
- If the text is already in one of the target languages, return it unchanged for that key.
- No commentary, no markdown.

Text:
${transcript}`,
    );

    const parsed = Translation.safeParse(parseJson(raw));
    if (!parsed.success) {
      return Response.json({
        success: false,
        error: {
          provider: "gemini",
          model: MODELS.text,
          status: 200,
          message: `model output failed Zod validation: ${JSON.stringify(parsed.error.issues)}`,
          raw: raw.slice(0, 800),
        },
      });
    }

    return Response.json({
      success: true,
      original: transcript,
      ...parsed.data,
      provider: "gemini",
      model: MODELS.text,
    });
  } catch (error) {
    return failure(error);
  }
}
