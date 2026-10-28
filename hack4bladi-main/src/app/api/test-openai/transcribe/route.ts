/**
 * POST /api/test-openai/transcribe — the same Darija clip through every engine at once.
 *
 * The product route stops at the first engine that answers, which is right for a traveller
 * and useless for a decision: it can never tell you what the *others* would have said.
 * This one runs MoulSot and a matrix of OpenAI speech models on the identical bytes, in
 * parallel, and returns every transcript with its timing and its failures.
 *
 * The matrix exists because "OpenAI cannot do Darija" turned out to be a claim about one
 * model. `whisper-1` is the oldest thing on the key and it hallucinates on dialect — it
 * answered a real Darija recording with "شكرا على المشاهدة" ("thanks for watching"), a
 * YouTube-subtitle artifact from its training data, and then repeated one MSA sentence
 * three times. That is what a speech model does when it cannot parse the audio at all.
 * Whether the gpt-4o-transcribe family does better is a different question, and it needs
 * to be asked in the same breath, on the same clip, or the comparison is worthless.
 *
 * `whisper-1` runs twice on purpose: once with `language: ar` as the product sends it, and
 * once with no hint. Telling Whisper "this is Arabic" pushes it to render Darija as Modern
 * Standard Arabic, so the hint is a suspect in its own right and this isolates it.
 *
 * Always answers 200: an engine that fails is a result, not an error.
 *
 * Request:  multipart/form-data with `file` (or `audio`), optional `locale`
 * Response: { ok, moulsot: Attempt, openai: Attempt[] }
 */
import { serverEnv } from "@/config/env";
import { transcribeDarija } from "@/lib/ai/darija-stt";
import { transcribe } from "@/lib/ai/openai-client";
import { readAudioUpload } from "@/lib/ai/upload";
import { isLocale } from "@/lib/i18n/locales";
import type { Locale } from "@/types/common";

/**
 * Vercel gives a function 10 seconds by default, which is less than this route is allowed
 * to spend. Runs every speech engine on one clip, so it is as slow as the slowest of them.
 * Without this the platform kills the request before the timeout that was designed for it,
 * and the caller sees a failure the fallback logic never gets to handle.
 */
export const maxDuration = 60;

interface Attempt {
  label: string;
  ok: boolean;
  text: string;
  ms: number;
  error?: string;
  skipped?: string;
}

/**
 * The OpenAI speech models worth putting against MoulSot, newest first.
 *
 * `languageHint: false` lets the model detect the language itself, which is the only way
 * to see whether it recognises Darija rather than being told to expect Arabic.
 */
const DARIJA_PROMPT =
  "دارجة مغربية. اكتب النص بالحروف العربية كما يُنطق، بدون ترجمة إلى الفصحى.";

/**
 * The same instruction, plus an explicit demand for the whole recording.
 *
 * Testing a real suspicion rather than padding the matrix. The gpt-4o-transcribe family is
 * a generative model doing transcription, and on a clip that mentioned Casablanca, the old
 * medina *and* Oualidia it returned a tidy short sentence that dropped Oualidia — while
 * gpt-4o-mini-transcribe and whisper-1, given the identical bytes, both heard it. The audio
 * was never the problem. A model that can paraphrase will, and a `prompt` it reads as a
 * task makes that likelier, so this row asks for every word and no summary.
 */
const VERBATIM_PROMPT = `${DARIJA_PROMPT} اكتب كل الكلمات من أول التسجيل إلى آخره، بدون اختصار وبدون تلخيص وبدون حذف أي جزء.`;

const OPENAI_MATRIX: { model: string; languageHint: boolean; prompt?: string; note?: string }[] = [
  { model: "gpt-4o-transcribe", languageHint: true, prompt: VERBATIM_PROMPT, note: "verbatim" },
  { model: "gpt-4o-transcribe", languageHint: true, prompt: DARIJA_PROMPT },
  { model: "gpt-4o-transcribe", languageHint: true },
  { model: "gpt-4o-transcribe", languageHint: false },
  { model: "gpt-4o-mini-transcribe", languageHint: true, prompt: DARIJA_PROMPT },
  { model: "whisper-1", languageHint: true },
];

/** Times an attempt and turns any failure into a readable line. */
async function attempt(label: string, run: () => Promise<string>): Promise<Attempt> {
  const startedAt = Date.now();
  try {
    const text = await run();
    return { label, ok: text.trim().length > 0, text: text.trim(), ms: Date.now() - startedAt };
  } catch (error) {
    return {
      label,
      ok: false,
      text: "",
      ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function POST(request: Request) {
  const upload = await readAudioUpload(request);
  if (!upload.ok) {
    return Response.json({ ok: false, reason: upload.reason, openai: [] });
  }

  /**
   * MoulSot is opt-out because it costs twenty-five seconds and the whole OpenAI matrix
   * costs two. Comparing is the point of this page, but you only need the reference
   * transcript once — after that, iterating on prompts and models against a known answer
   * should not re-run the slow engine every time.
   *
   * Read from the query string rather than the form: `readAudioUpload` is the shared
   * upload boundary the product route uses too, and a lab switch has no business widening
   * it.
   */
  const withMoulsot = new URL(request.url).searchParams.get("moulsot") !== "0";

  const locale: Locale | undefined = isLocale(upload.value.locale) ? upload.value.locale : undefined;
  const { data, mimeType } = upload.value;
  const blob = new Blob([data], { type: mimeType });
  const fileName = `audio.${mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : mimeType.includes("wav") ? "wav" : "webm"}`;
  const key = serverEnv.openai.apiKey;

  /* Everything at once. Run in sequence and the later engines get a warm Space and a
     settled network, and the timings stop being comparable — which is half of what this
     measures. */
  const [moulsot, ...openai] = await Promise.all([
    withMoulsot
      ? attempt("MoulSot v0.3", async () => (await transcribeDarija(blob, { mimeType })).text)
      : Promise.resolve<Attempt | null>(null),
    ...OPENAI_MATRIX.map(({ model, languageHint, prompt, note }) =>
      key
        ? attempt(
            `${model}${languageHint ? ` · language=${locale ?? "ar"}` : " · auto-detect"}${prompt ? ` · ${note ?? "darija prompt"}` : ""}`,
            async () => {
              const payload = await transcribe(
                key,
                model,
                blob,
                fileName,
                languageHint ? (locale ?? "ar") : undefined,
                AbortSignal.timeout(60_000),
                prompt,
              );
              return payload.text ?? "";
            },
          )
        : Promise.resolve<Attempt>({
            label: model,
            ok: false,
            text: "",
            ms: 0,
            skipped: "OPENAI_API_KEY is not set",
          }),
    ),
  ]);

  return Response.json({
    ok: true,
    bytes: data.byteLength,
    mimeType,
    locale: locale ?? null,
    moulsot,
    openai,
  });
}
