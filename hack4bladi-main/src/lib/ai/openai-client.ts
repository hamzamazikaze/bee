/**
 * The one place this app talks to OpenAI. Plain fetch, no vendor SDK, no version risk —
 * the same shape as @/lib/ai/gemini-client, so a second brain costs one module and not a
 * second architecture.
 *
 * Neither temperature nor max_tokens is sent: those two parameters are exactly what
 * differs between model families, and omitting them means OPENAI_MODEL can be pointed at
 * anything with JSON mode without touching this file.
 */
import { parseJsonLoosely } from "@/lib/ai/http";

const BASE_URL = "https://api.openai.com/v1";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/**
 * Returns whatever JSON the model produced, or null when it produced nothing usable.
 * Rejects on transport failure — every caller wraps this in `orFallback`.
 */
export async function chatJson(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) throw new Error(`upstream ${response.status}`);

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return parseJsonLoosely(payload.choices?.[0]?.message?.content ?? "");
}

/** Whisper. Same multipart contract as Groq's endpoint, different host. */
export async function transcribe(
  apiKey: string,
  model: string,
  file: Blob,
  fileName: string,
  language: string | undefined,
  signal: AbortSignal,
  /**
   * Steers the output without changing the audio. The gpt-4o-transcribe family reads
   * Moroccan Darija well but will answer in Latin transliteration unless told which script
   * to write, and a transliterated transcript is one our Arabic-script pipeline cannot use.
   */
  prompt?: string,
): Promise<{ text: string; language?: string }> {
  const form = new FormData();
  form.append("file", file, fileName);
  form.append("model", model);
  if (language) form.append("language", language);
  if (prompt) form.append("prompt", prompt);

  const response = await fetch(`${BASE_URL}/audio/transcriptions`, {
    method: "POST",
    signal,
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) throw new Error(`upstream ${response.status}`);
  return (await response.json()) as { text: string; language?: string };
}
