/**
 * Voice → text via Groq's OpenAI-compatible Whisper endpoint. Plain fetch, no SDK.
 *
 * Failure here is small: the voice button shows a short message and every manual
 * preference still works. It must never block the CTA.
 */
import "server-only";
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { boundedSignal } from "@/lib/ai/http";
import { transcribe } from "@/lib/ai/openai-client";
import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
} from "@/lib/ai/types";
import type { Locale } from "@/types/common";

const ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";

function extensionFor(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  return "mp3";
}

export class GroqTranscriptionProvider implements TranscriptionProvider {
  readonly name = "groq";

  constructor(private readonly apiKey: string) {}

  async transcribeAudio(
    input: TranscriptionInput,
    signal?: AbortSignal,
  ): Promise<TranscriptionResult> {
    const blob =
      input.data instanceof Blob ? input.data : new Blob([input.data], { type: input.mimeType });

    const form = new FormData();
    form.append("file", blob, `audio.${extensionFor(input.mimeType)}`);
    form.append("model", serverEnv.groq.model);
    form.append("response_format", "json");
    if (input.locale) form.append("language", input.locale);

    const response = await fetch(ENDPOINT, {
      method: "POST",
      signal: signal ?? boundedSignal(TIMEOUTS.transcriptionMs),
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);

    const payload = (await response.json()) as { text?: string; language?: string };
    return {
      text: typeof payload.text === "string" ? payload.text.trim() : "",
      detectedLocale: (["en", "fr", "ar"] as const).find((l) => l === payload.language) as
        | Locale
        | undefined,
    };
  }
}

/**
 * Speech to text on OpenAI's own host. Same contract, same failure behaviour — it exists so
 * a project with an OpenAI key and no Groq key still has a voice engine, and since the
 * model default moved to `gpt-4o-transcribe` it is a credible one for Darija too.
 */
export class OpenAITranscriptionProvider implements TranscriptionProvider {
  readonly name = "openai";

  constructor(private readonly apiKey: string) {}

  async transcribeAudio(
    input: TranscriptionInput,
    signal?: AbortSignal,
  ): Promise<TranscriptionResult> {
    const blob =
      input.data instanceof Blob ? input.data : new Blob([input.data], { type: input.mimeType });

    const payload = await transcribe(
      this.apiKey,
      serverEnv.openai.transcriptionModel,
      blob,
      `audio.${extensionFor(input.mimeType)}`,
      /* No language and no prompt. Both were an answer to "we know this is Darija", and
         we do not: the route stopped guessing from the interface language, and nothing
         else knows before the audio has been heard. Whisper detects it, and when the
         answer turns out to be Darija the route hands the recording to MoulSot instead. */
      undefined,
      signal ?? boundedSignal(TIMEOUTS.transcriptionMs),
    );

    return {
      text: typeof payload.text === "string" ? payload.text.trim() : "",
      detectedLocale: (["en", "fr", "ar"] as const).find((l) => l === payload.language) as
        | Locale
        | undefined,
    };
  }
}

/**
 * The configured Whisper-shaped engine, Groq first because it is the faster of the two.
 * null when neither key is set: voice simply stays on MoulSot, and nothing else changes.
 */
export function createTranscriptionProvider(): TranscriptionProvider | null {
  if (serverEnv.groq.apiKey) return new GroqTranscriptionProvider(serverEnv.groq.apiKey);
  if (serverEnv.openai.apiKey) return new OpenAITranscriptionProvider(serverEnv.openai.apiKey);
  return null;
}
