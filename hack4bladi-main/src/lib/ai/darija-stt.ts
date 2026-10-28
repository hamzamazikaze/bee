/**
 * Darija speech → text on the public MoulSot v0.3 Space (Qwen3-ASR fine-tuned on Darija).
 *
 * The protocol below is not written from memory — it is the sequence already proven live
 * in ~/Work/hackthon-checkmate (stt-darija/index.html and src/components/bhar/voice.ts):
 *
 *   POST /gradio_api/upload            → ["/tmp/…/audio.webm"]
 *   POST /gradio_api/call/transcribe   → { event_id }
 *   GET  /gradio_api/call/transcribe/<event_id> → SSE frames
 *
 * No key, no SDK. `parseSSE` is exported and kept free of any transport so it stays
 * testable against real captured frames.
 *
 * This is the primary engine for Moroccan Darija, where Whisper is weak. Groq stays as the
 * fallback in the route, which is also what keeps English and French working.
 */
import { TIMEOUTS } from "@/config/app";
import type { Locale } from "@/types/common";

const SPACE = "https://atlasia-moulsot-v0-3.hf.space";

/** The Space's own language selector value. Auto covers Darija and standard Arabic. */
const LANGUAGE_MODE = "Auto (Darija / Arabic)";

export interface DarijaTranscriptionResult {
  text: string;
  /** The Space returns Arabic script; we do not attempt to tell Darija from MSA. */
  language: "ar";
  durationMs: number;
  provider: "moulsot";
}

/**
 * Gradio streams `event: <name>\ndata: <json>` frames. The last non-heartbeat frame
 * carries the result; an `error` frame carries the reason instead.
 *
 * Ported unchanged in behaviour from the proven Checkmate implementation, with the
 * messages moved to English for this codebase.
 */
export function parseSSE(raw: string): string {
  let result: string | null = null;

  for (const frame of raw.split("\n\n")) {
    const name = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
    const data = frame.match(/^data:\s*(.*)$/m)?.[1];
    if (!name || data === undefined) continue;
    if (name === "error") throw new Error(data || "transcription service failed");
    if (name === "complete" || name === "generating") result = data;
  }

  if (result === null) throw new Error("unexpected response from the transcription service");

  const parsed: unknown = JSON.parse(result);
  return String(Array.isArray(parsed) ? parsed[0] : parsed).trim();
}

function fileNameFor(mimeType: string): string {
  if (mimeType.includes("webm")) return "audio.webm";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "audio.m4a";
  if (mimeType.includes("wav")) return "audio.wav";
  /* Firefox's recorder. The extension is not cosmetic — both engines sniff the container
     from the filename, and an Ogg sent as audio.mp3 comes back as an empty transcript. */
  if (mimeType.includes("ogg")) return "audio.ogg";
  return "audio.mp3";
}

/**
 * Blob → Arabic transcript. Rejects on any failure so the route can fall through to Groq;
 * bounded by TIMEOUTS.darijaTranscriptionMs because a sleeping Space can hang for a minute
 * and the one thing we may never do is freeze the recorder.
 */
export async function transcribeDarija(
  audio: Blob,
  options: { signal?: AbortSignal; mimeType?: string } = {},
): Promise<DarijaTranscriptionResult> {
  const startedAt = Date.now();
  const signal = options.signal ?? AbortSignal.timeout(TIMEOUTS.darijaTranscriptionMs);
  const mimeType = options.mimeType ?? audio.type ?? "audio/webm";

  const form = new FormData();
  form.append("files", audio, fileNameFor(mimeType));

  const upload = await fetch(`${SPACE}/gradio_api/upload`, {
    method: "POST",
    body: form,
    signal,
  });
  if (!upload.ok) throw new Error(`upload failed (${upload.status})`);

  const paths = (await upload.json()) as unknown;
  const path = Array.isArray(paths) ? paths[0] : null;
  if (typeof path !== "string" || !path) throw new Error("upload returned no file path");

  const call = await fetch(`${SPACE}/gradio_api/call/transcribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal,
    body: JSON.stringify({
      data: [{ path, meta: { _type: "gradio.FileData" } }, LANGUAGE_MODE],
    }),
  });
  if (!call.ok) throw new Error(`transcription refused (${call.status})`);

  const { event_id: eventId } = (await call.json()) as { event_id?: string };
  if (!eventId) throw new Error("transcription returned no event id");

  const stream = await fetch(`${SPACE}/gradio_api/call/transcribe/${eventId}`, { signal });
  if (!stream.ok) throw new Error(`transcription stream failed (${stream.status})`);

  const text = parseSSE(await stream.text());
  if (!text) throw new Error("empty transcript");

  return {
    text,
    language: "ar",
    durationMs: Date.now() - startedAt,
    provider: "moulsot",
  };
}

/**
 * Darija is the reason this provider exists, so it leads for Arabic. For English and
 * French the existing Whisper provider is both better and faster, and runs first.
 *
 * Deliberately not language *detection* — just which engine to try first, from the locale
 * the app is already in. Detecting before we have validated the MVP would be guesswork
 * dressed up as a feature.
 */
export function prefersDarija(locale: Locale | undefined): boolean {
  return locale === "ar" || locale === undefined;
}
