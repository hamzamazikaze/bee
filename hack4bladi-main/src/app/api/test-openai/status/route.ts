/**
 * GET /api/test-openai/status — is the key recognised, and are the models we use on it?
 *
 * Answers with availability only. The key never appears in the response, and any upstream
 * message is scrubbed before it is echoed: an OpenAI error body can quote the key it
 * rejected, and this page is the one most likely to be on a projector.
 */
import { serverEnv } from "@/config/env";

/** Anything shaped like a key, gone. Belt and braces around an upstream error body. */
function redact(text: string): string {
  return text.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***");
}

export async function GET() {
  const key = serverEnv.openai.apiKey;
  const chatModel = serverEnv.openai.model;
  const transcribeModel = serverEnv.openai.transcriptionModel;

  if (!key) {
    return Response.json({
      connected: false,
      keyPresent: false,
      message: "OPENAI_API_KEY is not set in .env.local",
      chatModel,
      transcribeModel,
      models: {},
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const body = await response.text();

    if (!response.ok) {
      return Response.json({
        connected: false,
        keyPresent: true,
        status: response.status,
        message: redact(body.slice(0, 600)),
        chatModel,
        transcribeModel,
        models: {},
      });
    }

    const payload = JSON.parse(body) as { data?: { id?: string }[] };
    const names = new Set((payload.data ?? []).map((model) => model.id ?? ""));

    return Response.json({
      connected: true,
      keyPresent: true,
      status: response.status,
      modelCount: names.size,
      chatModel,
      transcribeModel,
      /* The two that matter, named rather than counted: a key with 60 models on it and
         neither of ours is a working key and a broken app. */
      models: {
        [chatModel]: names.has(chatModel),
        [transcribeModel]: names.has(transcribeModel),
      },
      /* Every speech model the key can reach. `whisper-1` failing on Darija is only half
         an answer — the other half is whether anything else here does better, and that
         question cannot be asked without knowing what "else" is. */
      speechModels: [...names].filter((id) => /transcribe|whisper/.test(id)).sort(),
    });
  } catch (error) {
    return Response.json({
      connected: false,
      keyPresent: true,
      status: 0,
      message: redact(error instanceof Error ? error.message : String(error)),
      chatModel,
      transcribeModel,
      models: {},
    });
  }
}
