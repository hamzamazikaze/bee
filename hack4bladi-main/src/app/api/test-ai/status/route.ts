/**
 * GET /api/test-ai/status — is the key recognised, and are the two models on it?
 * Answers with model availability only. The key itself never appears in the response.
 */
import { MODELS, apiKey, rawFetch, redact } from "../_gemini";

export async function GET() {
  const key = apiKey();
  if (!key) {
    return Response.json({
      connected: false,
      keyPresent: false,
      message: "GEMINI_API_KEY is not set in .env.local",
      models: {},
    });
  }

  try {
    const response = await rawFetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
      { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(15_000), cache: "no-store" },
    );
    const body = await response.text();
    if (!response.ok) {
      return Response.json({
        connected: false,
        keyPresent: true,
        status: response.status,
        message: redact(body.slice(0, 600)),
        models: {},
      });
    }
    const payload = JSON.parse(body) as { models?: { name?: string }[] };
    const names = new Set((payload.models ?? []).map((m) => (m.name ?? "").replace("models/", "")));
    return Response.json({
      connected: true,
      keyPresent: true,
      status: response.status,
      modelCount: names.size,
      models: {
        [MODELS.transcribe]: names.has(MODELS.transcribe),
        [MODELS.text]: names.has(MODELS.text),
      },
    });
  } catch (error) {
    return Response.json({
      connected: false,
      keyPresent: true,
      status: 0,
      message: redact(error instanceof Error ? error.message : String(error)),
      models: {},
    });
  }
}
