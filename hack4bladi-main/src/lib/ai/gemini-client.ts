/**
 * The one place this app talks to Gemini. Plain fetch, no vendor SDK, no version risk.
 *
 * Both the image analyser and the intent extractor call through here, so the request
 * shape, the JSON mode and the loose parsing are defined once.
 */
import { parseJsonLoosely } from "@/lib/ai/http";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

/**
 * Returns whatever JSON the model produced, or null when it produced nothing usable.
 * Rejects on transport failure — every caller wraps this in `orFallback`.
 */
export async function generateJson(
  apiKey: string,
  model: string,
  parts: GeminiPart[],
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!response.ok) throw new Error(`upstream ${response.status}`);

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  return parseJsonLoosely(text);
}
