import "server-only";
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { generateJson } from "@/lib/ai/gemini-client";
import { boundedSignal, orFallback } from "@/lib/ai/http";
import { chatJson } from "@/lib/ai/openai-client";

type Provider = "gemini" | "openai";

/**
 * One JSON answer for a BENNA prompt, trying each configured provider in `order`; null
 * when none answers in time with a usable shape. Callers fall back to local logic on null.
 * Gemini leads by default (fast, good at menu matching); Darija prose reads better from
 * OpenAI, so the invite asks for it first.
 */
export async function askModel<T>(
  prompt: string,
  parse: (raw: unknown) => T | null,
  outer?: AbortSignal,
  order: Provider[] = ["gemini", "openai"],
): Promise<T | null> {
  for (const provider of order) {
    const key = provider === "gemini" ? serverEnv.gemini.apiKey : serverEnv.openai.apiKey;
    if (!key) continue;
    const signal = boundedSignal(TIMEOUTS.bennaAssistantMs, outer);
    const raw = await orFallback(
      () =>
        provider === "gemini"
          ? generateJson(key, serverEnv.gemini.model, [{ text: prompt }], signal)
          : chatJson(key, serverEnv.openai.model, [{ role: "user", content: prompt }], signal),
      null,
    );
    const parsed = parse(raw);
    if (parsed) return parsed;
  }
  return null;
}
