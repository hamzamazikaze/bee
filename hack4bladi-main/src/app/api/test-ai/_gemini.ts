/**
 * Server-only Gemini access for the /test-ai laboratory. Isolated on purpose: nothing
 * here is imported by the production flow, and nothing here is imported by a client
 * component. The key is read from GEMINI_API_KEY and never leaves this module.
 *
 * Two API versions are in play, and the difference is not cosmetic:
 *  - gemini-3.5-transcribe exists ONLY on v1alpha. On v1beta the call returns HTTP 200
 *    with an empty content part, because v1beta cannot represent the `audioTranscription`
 *    part it answers with. Verified against the live API.
 *  - the text models are used on v1beta, which is where JSON response mime types live.
 */
import "server-only";

const HOST = "https://generativelanguage.googleapis.com";

/**
 * Next patches the global `fetch` for caching and instrumentation, and that wrapper makes
 * Google's v1alpha endpoint answer 500 INTERNAL for these inline-audio posts — the same
 * body sent through plain Node fetch returns 200. `_nextOriginalFetch` is the unpatched
 * function Next keeps on the patched one; fall back to the global when it is absent.
 */
export const rawFetch: typeof fetch =
  (globalThis.fetch as typeof fetch & { _nextOriginalFetch?: typeof fetch })
    ._nextOriginalFetch ?? globalThis.fetch;

export const MODELS = {
  transcribe: "gemini-3.5-transcribe",
  text: "gemini-3.5-flash-lite",
} as const;

export function apiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  return key && key.length > 0 ? key : null;
}

/** Belt and braces: a key must never reach the browser, not even inside an error string. */
export function redact(text: string): string {
  const key = apiKey();
  const stripped = key ? text.split(key).join("<redacted>") : text;
  return stripped.replace(/(key=)[^&\s"]+/gi, "$1<redacted>");
}

export class GeminiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly model: string,
  ) {
    super(`Gemini ${model} → HTTP ${status}: ${detail}`);
  }
}

interface Part {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface CandidatePart {
  text?: string;
  audioTranscription?: { text?: string };
}

/**
 * One raw generateContent call. Returns the concatenated text of the answer.
 * `audioTranscription` parts are read too — that is the shape the transcribe model uses.
 */
async function generate(options: {
  model: string;
  version: "v1alpha" | "v1beta";
  parts: Part[];
  json?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  // The free tier answers 500 INTERNAL or times out now and then on an otherwise valid
  // request. One retry turns that noise back into a result; a real rejection (400, 403,
  // 404, 429) is not retried and surfaces as it came.
  try {
    return await attempt(options);
  } catch (error) {
    const transient =
      error instanceof GeminiError && (error.status === 0 || error.status >= 500);
    if (!transient) throw error;
    await new Promise((resolve) => setTimeout(resolve, 700));
    return attempt(options);
  }
}

async function attempt(options: {
  model: string;
  version: "v1alpha" | "v1beta";
  parts: Part[];
  json?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  const key = apiKey();
  if (!key) throw new GeminiError(0, "GEMINI_API_KEY is not set", options.model);

  let response: Response;
  try {
    response = await rawFetch(
      `${HOST}/${options.version}/models/${encodeURIComponent(options.model)}:generateContent`,
      {
        method: "POST",
        signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: options.parts }],
          ...(options.json
            ? { generationConfig: { responseMimeType: "application/json", temperature: 0 } }
            : {}),
        }),
      },
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new GeminiError(0, redact(`network/timeout: ${message}`), options.model);
  }

  const body = await response.text();
  if (!response.ok) throw new GeminiError(response.status, redact(body.slice(0, 1200)), options.model);

  let payload: { candidates?: { content?: { parts?: CandidatePart[] } }[] };
  try {
    payload = JSON.parse(body);
  } catch {
    throw new GeminiError(response.status, redact(`unparseable body: ${body.slice(0, 400)}`), options.model);
  }

  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? part.audioTranscription?.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiError(
      response.status,
      redact(`empty candidate content: ${body.slice(0, 600)}`),
      options.model,
    );
  }
  return text;
}

/** Transcription. v1alpha + the transcribe model; audio-only prompt, language auto-detected. */
export function transcribe(base64: string, mimeType: string): Promise<string> {
  return generate({
    model: MODELS.transcribe,
    version: "v1alpha",
    parts: [{ inline_data: { mime_type: mimeType, data: base64 } }],
    timeoutMs: 60_000,
  });
}

/** Text generation on the lightweight model. `json` asks for an application/json answer. */
export function text(prompt: string, json = true): Promise<string> {
  return generate({ model: MODELS.text, version: "v1beta", parts: [{ text: prompt }], json });
}

/** The model is asked for JSON, but a fenced block still happens; unwrap before parsing. */
export function parseJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error(`no JSON found in model output: ${cleaned.slice(0, 200)}`);
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Uniform failure envelope. Never carries the key; always carries the real upstream status. */
export function failure(error: unknown) {
  if (error instanceof GeminiError) {
    return Response.json(
      {
        success: false,
        error: { provider: "gemini", model: error.model, status: error.status, message: error.detail },
      },
      { status: 200 },
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return Response.json(
    { success: false, error: { provider: "gemini", model: null, status: 0, message: redact(message) } },
    { status: 200 },
  );
}
