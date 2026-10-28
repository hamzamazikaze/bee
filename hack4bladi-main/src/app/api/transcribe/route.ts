/**
 * POST /api/transcribe — voice to text.
 *
 * Two engines, one flow, and no opinion about the traveller before they have spoken:
 *
 *   1. Whisper transcribes, detecting the language itself. About a second.
 *   2. If what comes back is Arabic — or Latin letters belonging to no European language,
 *      which here means transliterated Darija — MoulSot transcribes it properly.
 *
 * THE INTERFACE LANGUAGE IS NOT CONSULTED, deliberately. It used to be, and it was wrong
 * in the same way every time: the app opens in French and a Moroccan speaks Darija into
 * it, so the menu was never evidence about the audio. It sent exactly that recording to
 * the engine measured as losing the city the whole day gets built around. What someone
 * speaks is knowable from the recording and nowhere else.
 *
 * WHY MOULSOT GETS THE LAST WORD. Measured on /test-openai against real Darija, both
 * engines given the identical bytes:
 *
 *   MoulSot v0.3        20.1s   وبغينا واش غانديرو خويا غانتيستيو الواحد هو اللي صبر شوية…
 *   gpt-4o-transcribe    0.9s   خلاص عنديرو خوة وانت استاو الواحد يولي صبر شوية حبيبنا…   (29% of it)
 *
 * Twenty-two times faster and about a third of the words. A transcript is what the whole
 * day is built from, so accuracy wins that argument — but only for the recordings that
 * need it. A French sentence never pays the twenty seconds.
 *
 * Whisper is asked to auto-detect rather than told a language: telling it "French" is how
 * a Darija sentence came back as "Sulaam, biët nimjiël Casablanca" in the first place.
 *
 * Always answers 200. With no engine reachable the response is `degraded: true` with empty
 * text; the voice button shows one line and every manual preference still works. It never
 * blocks the CTA, and it never spins forever — both engines are bounded.
 *
 * VOICE_ENGINE=darija is the default and skips step 1's verdict entirely: MoulSot answers
 * for everyone. Twenty seconds for a French speaker too, and worth it in a Moroccan
 * product whose visitors mostly speak Darija. `VOICE_ENGINE=auto` restores the detection
 * described above.
 *
 * Request:  multipart/form-data with `file` (or `audio`), optional `locale`
 * Response: { ok, degraded, reason?, text, detectedLocale?, provider? }
 */
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { boundedSignal, createTranscriptionProvider, orFallback } from "@/lib/ai";
import { transcribeDarija } from "@/lib/ai/darija-stt";
import { looksHallucinated, needsDarijaEngine } from "@/lib/ai/transcript-quality";
import { readAudioUpload } from "@/lib/ai/upload";
import type { Locale } from "@/types/common";

/**
 * Vercel gives a function 10 seconds by default, which is less than this route is allowed
 * to spend. MoulSot is a queued public GPU Space: TIMEOUTS.darijaTranscriptionMs allows it 45s,
 * and measured runs land between 14s and 39s.
 * Without this the platform kills the request before the timeout that was designed for it,
 * and the caller sees a failure the fallback logic never gets to handle.
 */
export const maxDuration = 60;

interface Attempt {
  text: string;
  provider: string;
  detectedLocale: Locale | null;
}

export async function POST(request: Request) {
  const upload = await readAudioUpload(request);
  if (!upload.ok) {
    return Response.json({ ok: false, degraded: true, reason: upload.reason, text: "" });
  }

  /* `locale` arrives on the form and is deliberately ignored. What someone speaks is not
     what they set the menu to, and every version of this that consulted it was wrong. */
  const blob = new Blob([upload.value.data], { type: upload.value.mimeType });

  /**
   * A transcript nobody said is worse than no transcript: it is confident, it is fluent,
   * and the whole day gets built on it. Treated exactly like an empty answer.
   */
  const accept = (attempt: Attempt | null): Attempt | null =>
    attempt && attempt.text && !looksHallucinated(attempt.text) ? attempt : null;

  /** MoulSot: no key, so it is always worth a try. */
  const moulsot = async (): Promise<Attempt | null> => {
    const result = await transcribeDarija(blob, {
      mimeType: upload.value.mimeType,
      signal: boundedSignal(TIMEOUTS.darijaTranscriptionMs, request.signal),
    });
    return result.text
      ? { text: result.text, provider: "moulsot", detectedLocale: "ar" }
      : null;
  };

  /** Whisper-shaped — Groq, else OpenAI. Only when one of the two keys is configured. */
  const whisper = async (): Promise<Attempt | null> => {
    const provider = createTranscriptionProvider();
    if (!provider) return null;
    const result = await provider.transcribeAudio(
      /* No `locale`: Whisper detects the language, which is the only party to this that
         has actually heard the audio. */
      { data: upload.value.data, mimeType: upload.value.mimeType },
      boundedSignal(TIMEOUTS.transcriptionMs, request.signal),
    );
    return result.text
      ? { text: result.text, provider: provider.name, detectedLocale: result.detectedLocale ?? null }
      : null;
  };

  const answer = (attempt: Attempt) =>
    Response.json({
      ok: true,
      degraded: false,
      text: attempt.text,
      detectedLocale: attempt.detectedLocale,
      provider: attempt.provider,
    });

  /*
   * The default: both engines run at once and MoulSot's answer wins whenever it has one.
   *
   * The detection below is good — verified routing the same clip to MoulSot from four
   * different interface languages — but it is an inference, and one wrong call in front of
   * a jury costs more than twenty seconds costs everybody else. Whisper still runs in
   * parallel, so a cold or dead Space degrades to its answer in a second rather than to
   * nothing. `VOICE_ENGINE=auto` opts into the faster, inferring path.
   */
  if (serverEnv.voice.darijaFirst) {
    const [darijaFirst, fastToo] = await Promise.all([
      orFallback<Attempt | null>(moulsot, null),
      orFallback<Attempt | null>(whisper, null),
    ]);
    const chosen = accept(darijaFirst) ?? accept(fastToo);
    if (chosen) return answer(chosen);
    return Response.json({ ok: true, degraded: true, reason: "unavailable", text: "" });
  }

  /* Whisper first, always: it answers in about a second, and its answer is also the
     evidence for whether anyone needs to wait for the other engine. */
  const fast = accept(await orFallback<Attempt | null>(whisper, null));
  if (fast && !needsDarijaEngine(fast.text)) return answer(fast);

  /* Arabic, or Latin letters that are no European language. Either way this recording
     deserves the engine that actually reads Darija, and its answer outranks the fast one
     — that is the whole finding this route is built on. */
  const darija = accept(await orFallback<Attempt | null>(moulsot, null));
  const chosen = darija ?? fast;
  if (chosen) return answer(chosen);

  return Response.json({ ok: true, degraded: true, reason: "unavailable", text: "" });
}
