/**
 * POST /api/test-ai/intent — TEST 3. { transcript } → structured travel intent,
 * on gemini-3.5-flash-lite, validated by Zod before it is believed.
 *
 * The contract with the model is "null unless the transcript says so". Nothing here
 * infers a budget from a tone of voice or a city from a language.
 */
import { z } from "zod";
import { MODELS, failure, parseJson, text } from "../_gemini";

const nullableString = z.union([z.string().min(1), z.null()]);

const TripIntent = z.object({
  city: nullableString,
  detectedPlace: nullableString,
  interests: z.array(z.string()),
  timeAvailable: z.enum(["few_hours", "half_day", "full_day"]).nullable(),
  budgetLevel: z.enum(["low", "medium", "premium"]).nullable(),
  pace: z.enum(["relaxed", "balanced", "explorer"]).nullable(),
  avoidLongWalks: z.boolean().nullable(),
  confidence: z.number().min(0).max(1),
});

/** The model may answer "null" as a string, or omit a key entirely. Normalise before Zod. */
function normalise(value: unknown): unknown {
  const raw = (value ?? {}) as Record<string, unknown>;
  const clean = (key: string): unknown => {
    const entry = raw[key];
    if (entry === undefined || entry === "" || entry === "null" || entry === "unknown") return null;
    return entry;
  };
  return {
    city: clean("city"),
    detectedPlace: clean("detectedPlace"),
    interests: Array.isArray(raw.interests)
      ? raw.interests.filter((i): i is string => typeof i === "string" && i.trim().length > 0)
      : [],
    timeAvailable: clean("timeAvailable"),
    budgetLevel: clean("budgetLevel"),
    pace: clean("pace"),
    avoidLongWalks: typeof raw.avoidLongWalks === "boolean" ? raw.avoidLongWalks : null,
    confidence: typeof raw.confidence === "number" ? Math.min(1, Math.max(0, raw.confidence)) : 0,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { transcript?: unknown };
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    if (!transcript) {
      return Response.json({ success: false, error: { message: "`transcript` is required" } });
    }

    const raw = await text(
      `You turn what a traveller said into one structured trip intent.

Return ONLY JSON with exactly these keys:
{"city": string|null, "detectedPlace": string|null, "interests": string[], "timeAvailable": "few_hours"|"half_day"|"full_day"|null, "budgetLevel": "low"|"medium"|"premium"|null, "pace": "relaxed"|"balanced"|"explorer"|null, "avoidLongWalks": boolean|null, "confidence": number}

Rules — these matter more than filling the object:
- Use null for everything the traveller did not say or clearly imply. Never guess.
- No budget mentioned → "budgetLevel": null. No city mentioned → "city": null.
- No pace mentioned → "pace": null. No walking preference mentioned → "avoidLongWalks": null.
- "city" is a town or city name only. "detectedPlace" is a specific named place, monument,
  beach or venue, if one was named.
- "interests" are short lowercase English tags for what they want to do, at most 5, most
  important first (e.g. "history", "food", "beach", "shopping", "nature", "art"). Empty
  array if they said nothing about it.
- "confidence" is 0..1: how well this transcript supports the object you filled in. A
  vague transcript is a low number, not a confident guess.
- The transcript may be in any language; the JSON keys and enum values above stay in English.
- No commentary, no markdown.

Transcript:
${transcript}`,
    );

    const parsed = TripIntent.safeParse(normalise(parseJson(raw)));
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
      intent: parsed.data,
      provider: "gemini",
      model: MODELS.text,
    });
  } catch (error) {
    return failure(error);
  }
}
