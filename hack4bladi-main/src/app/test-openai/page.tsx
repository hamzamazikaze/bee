"use client";

/**
 * /test-openai — does the OpenAI key actually work on Moroccan Darija?
 *
 * Three questions, in the order you need them answered:
 *
 *   1. Is the key live, and are the two models we name on it?
 *   2. Given one recording, what does OpenAI Whisper hear, and what does MoulSot hear?
 *      Both engines get the identical bytes at the same moment, so the two transcripts sit
 *      side by side and the difference is the engine rather than the take.
 *   3. Given a transcript, can OpenAI turn Darija into a day out of our own catalogue?
 *
 * Question 2 exists because the app makes a claim — Whisper is weak on Darija, MoulSot is
 * not — and that claim decides which engine `/api/transcribe` tries first. This is where it
 * is checked against a real voice instead of taken on faith.
 *
 * It drives `/api/chat`, the same route the guide screen uses, so a green run here means
 * the product path works and not that a copy of it does.
 *
 * Writes nothing: no localStorage, no store. The recording lives in memory until reload.
 */
import { useEffect, useRef, useState } from "react";

/** A scripted Darija sentence, for testing understanding with no microphone. */
const DEMO_DARIJA = "بغيت نطيب مع عائلة مغربية ونشوف الصنعة ديال الجلد فكازا، وما عنديش بزاف ديال الفلوس";

const CARD = "rounded-lg border border-white/10 bg-white/[0.03] p-4";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40";
const BTN =
  "rounded-md px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

interface Attempt {
  label: string;
  ok: boolean;
  text: string;
  ms: number;
  error?: string;
  skipped?: string;
}

interface Status {
  connected: boolean;
  keyPresent: boolean;
  status?: number;
  message?: string;
  modelCount?: number;
  chatModel: string;
  transcribeModel: string;
  models: Record<string, boolean>;
}

interface GuideResult {
  degraded: boolean;
  reply: string;
  headline: string;
  picks: { poiId: string; reason: string }[];
  profile: Record<string, unknown>;
  ms: number;
}

function Panel({
  step,
  title,
  note,
  children,
}: {
  step: number;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={CARD}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className={LABEL}>
          {step}. {title}
        </h2>
        {note ? <span className="font-mono text-[11px] text-white/35">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-0.5 text-sm">
      <span className="w-40 shrink-0 text-white/40">{label}</span>
      <span className="min-w-0 flex-1 break-words text-white/90">{value}</span>
    </div>
  );
}

const Pending = () => <p className="text-sm text-white/25">—</p>;

/**
 * One engine's answer.
 *
 * Arabic script needs `dir="rtl"` or a Darija transcript renders with its punctuation in
 * the wrong place, which reads as a transcription fault and is not one.
 */
function EngineCard({
  attempt,
  reference,
  onUse,
}: {
  attempt: Attempt;
  /** The transcript to judge against — MoulSot's, the one we trust on Darija. */
  reference?: string;
  onUse?: () => void;
}) {
  const tone = attempt.ok
    ? "border-emerald-400/30"
    : attempt.skipped
      ? "border-white/10"
      : "border-rose-400/30";

  return (
    <div className={`rounded-md border p-3 ${tone}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className={LABEL}>{attempt.label}</p>
        <span className="font-mono text-[11px] text-white/35">
          {attempt.ms ? `${(attempt.ms / 1000).toFixed(1)}s` : "—"}
        </span>
      </div>
      {attempt.ok ? (
        <>
          <p dir="rtl" className="mt-2 text-[15px] leading-relaxed text-white/90">
            {attempt.text}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {/* Length, always. A model that drops the end of a recording looks identical to
                one that heard a short recording, until you can see how much it returned
                next to what everything else returned. */}
            <span className="font-mono text-[11px] text-white/35">
              {attempt.text.trim().split(/\s+/).length} words · {attempt.text.length} chars
            </span>
            {reference ? (
              <span className="font-mono text-[11px] text-white/35">
                {agreement(attempt.text, reference)}% of MoulSot&apos;s words
              </span>
            ) : null}
            {onUse ? (
              <button
                type="button"
                onClick={onUse}
                className="text-[11px] text-emerald-300/80 underline underline-offset-2 hover:text-emerald-200"
              >
                use this below
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-white/45">
          {attempt.skipped ?? attempt.error ?? "returned nothing"}
        </p>
      )}
    </div>
  );
}

/**
 * How much of the reference transcript this one actually contains, as a percentage of
 * words.
 *
 * Crude on purpose — it is a smell test, not a WER. A model that hallucinates fluent MSA
 * scores near zero against a correct Darija transcript while reading perfectly well on its
 * own, and that is the failure this page exists to make visible: "شكرا على المشاهدة" is a
 * grammatical Arabic sentence and has nothing to do with what was said.
 */
function agreement(candidate: string, reference: string): number {
  const words = (text: string) =>
    text
      .replace(/[.,!?،؛]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const target = words(reference);
  if (target.length === 0) return 0;
  const bag = new Set(words(candidate));
  return Math.round((target.filter((word) => bag.has(word)).length / target.length) * 100);
}

export default function TestOpenAiPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [moulsot, setMoulsot] = useState<Attempt | null>(null);
  const [openai, setOpenai] = useState<Attempt[]>([]);
  /* Off by default: MoulSot is 25s and the whole OpenAI matrix is 2s, so leaving it on
     taxes every iteration for a reference transcript you already have. */
  const [withMoulsot, setWithMoulsot] = useState(false);
  const [clip, setClip] = useState<{ seconds: number; bytes: number } | null>(null);
  /** The recorded length, captured at stop — `seconds` is reset by the next take. */
  const recordedRef = useRef(0);
  const [transcript, setTranscript] = useState("");
  const [guide, setGuide] = useState<GuideResult | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    void checkKey();
  }, []);

  useEffect(
    () => () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  async function checkKey() {
    setBusy("key");
    try {
      const response = await fetch("/api/test-openai/status", { cache: "no-store" });
      setStatus((await response.json()) as Status);
    } catch (cause) {
      setError(`key check: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusy(null);
    }
  }

  async function startRecording() {
    setError(null);
    setMoulsot(null);
    setOpenai([]);
    setGuide(null);
    setSeconds(0);

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("no MediaRecorder here, or the page is not on a secure origin");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const startedAt = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        /* From the clock, not from `seconds`: this closure was created before the first
           tick and would forever report a zero-length clip. */
        recordedRef.current = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const captured = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (captured.size === 0) {
          setError("captured 0 bytes — the microphone produced no audio");
          return;
        }
        void compare(captured);
      };

      recorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
    } catch (cause) {
      setError(`microphone: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  /** Both engines, one clip. Whichever answers is offered to stage 3. */
  async function compare(blob: Blob) {
    setBusy("transcribe");
    setError(null);
    try {
      const body = new FormData();
      body.append("audio", blob, "voice.webm");
      /* Deliberately "ar": this is the Darija bench, and the locale is what the product
         route uses to decide which engine leads. Here it only reaches Whisper. */
      body.append("locale", "ar");

      const response = await fetch(
        `/api/test-openai/transcribe${withMoulsot ? "" : "?moulsot=0"}`,
        { method: "POST", body },
      );
      const data = (await response.json()) as {
        ok: boolean;
        reason?: string;
        bytes?: number;
        moulsot?: Attempt;
        openai?: Attempt[];
      };

      if (!data.ok) {
        setError(`upload rejected: ${data.reason ?? "unknown"}`);
        return;
      }

      setMoulsot(data.moulsot ?? null);
      setOpenai(data.openai ?? []);
      /* What was actually sent, so "the model dropped the end" can be told apart from
         "the recorder dropped the end" without guessing. */
      setClip({ seconds: recordedRef.current, bytes: data.bytes ?? blob.size });
      /* Stage 3 gets the transcript we trust by default. Any other engine's is one tap
         away, which is the point: you can watch a hallucination build a confident day. */
      const best = data.moulsot?.ok
        ? data.moulsot.text
        : (data.openai?.find((entry) => entry.ok)?.text ?? "");
      setTranscript(best);
    } catch (cause) {
      setError(`transcribe: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusy(null);
    }
  }

  /** Stage 3 — the transcript, understood by OpenAI, against our own catalogue. */
  async function understand(text: string) {
    if (!text.trim()) return;
    setBusy("guide");
    setError(null);
    const startedAt = Date.now();
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns: [{ role: "user", content: text }], locale: "ar" }),
      });
      const data = (await response.json()) as Omit<GuideResult, "ms">;
      setGuide({ ...data, ms: Date.now() - startedAt });
    } catch (cause) {
      setError(`guide: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusy(null);
    }
  }

  const keyOk = status?.connected === true;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-white">OpenAI × Darija</h1>
        <p className="mt-1 text-sm text-white/45">
          Is the key live, what does Whisper hear that MoulSot does not, and can either
          transcript become a day out of the curated catalogue.
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded-md border border-rose-400/30 bg-rose-400/5 p-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Panel step={1} title="The key" note={status?.status ? `HTTP ${status.status}` : undefined}>
          {!status ? (
            <Pending />
          ) : (
            <>
              <Row
                label="OPENAI_API_KEY"
                value={
                  status.keyPresent ? (
                    <span className={keyOk ? "text-emerald-300" : "text-amber-300"}>
                      {keyOk ? "✓ present and accepted" : "• present, not accepted"}
                    </span>
                  ) : (
                    <span className="text-rose-300">✗ not set in .env.local</span>
                  )
                }
              />
              <Row
                label="chat model"
                value={
                  <span className={status.models[status.chatModel] ? "text-emerald-300" : "text-amber-300"}>
                    {status.models[status.chatModel] ? "✓" : "•"} {status.chatModel}
                  </span>
                }
              />
              <Row
                label="transcribe model"
                value={
                  <span
                    className={
                      status.models[status.transcribeModel] ? "text-emerald-300" : "text-amber-300"
                    }
                  >
                    {status.models[status.transcribeModel] ? "✓" : "•"} {status.transcribeModel}
                  </span>
                }
              />
              {status.modelCount ? (
                <Row label="models on the key" value={String(status.modelCount)} />
              ) : null}
              {status.message ? <Row label="upstream said" value={status.message} /> : null}
            </>
          )}
          <button
            type="button"
            onClick={() => void checkKey()}
            disabled={busy !== null}
            className={`${BTN} mt-3 border border-white/15 text-white/80 hover:border-white/30`}
          >
            {busy === "key" ? "checking…" : "check again"}
          </button>
        </Panel>

        <Panel
          step={2}
          title="One clip, both engines"
          note={
            recording
              ? `recording ${seconds}s`
              : clip
                ? `clip: ${clip.seconds}s · ${(clip.bytes / 1024).toFixed(0)} KB`
                : undefined
          }
        >
          <p className="mb-3 text-sm text-white/45">
            Speak Darija. Every engine gets the identical bytes at the same moment.
          </p>
          <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-white/60">
            <input
              type="checkbox"
              checked={withMoulsot}
              onChange={(event) => setWithMoulsot(event.target.checked)}
              disabled={busy !== null || recording}
              className="size-4 accent-emerald-400"
            />
            also run MoulSot as the reference <span className="text-white/35">(+25s)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={recording ? stopRecording : () => void startRecording()}
              disabled={busy !== null}
              className={
                recording
                  ? `${BTN} bg-rose-400/90 text-[#0b0d10] hover:bg-rose-300`
                  : `${BTN} bg-emerald-400/90 text-[#0b0d10] hover:bg-emerald-300`
              }
            >
              {recording ? `stop (${seconds}s)` : "record"}
            </button>
            {busy === "transcribe" ? (
              <span className="self-center text-sm text-white/45">
                {withMoulsot ? "all engines running, MoulSot is the slow one…" : "OpenAI running…"}
              </span>
            ) : null}
          </div>

          {moulsot || openai.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2">
              {moulsot ? (
                <EngineCard attempt={moulsot} onUse={() => setTranscript(moulsot.text)} />
              ) : null}
              {openai.map((entry, index) => (
                <EngineCard
                  key={`${entry.label}-${index}`}
                  attempt={entry}
                  reference={moulsot?.ok ? moulsot.text : undefined}
                  onUse={entry.ok ? () => setTranscript(entry.text) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <Pending />
            </div>
          )}
        </Panel>

        <Panel
          step={3}
          title="OpenAI reads it and builds a day"
          note={guide ? `${(guide.ms / 1000).toFixed(1)}s` : undefined}
        >
          <label htmlFor="transcript" className={LABEL}>
            transcript to understand
          </label>
          <textarea
            id="transcript"
            dir="rtl"
            rows={3}
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="record above, or paste Darija here"
            className="mt-1.5 w-full rounded-md border border-white/10 bg-black/30 p-3 text-[15px] leading-relaxed text-white/90 outline-none focus:border-white/25"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void understand(transcript)}
              disabled={busy !== null || !transcript.trim()}
              className={`${BTN} bg-emerald-400/90 text-[#0b0d10] hover:bg-emerald-300`}
            >
              {busy === "guide" ? "asking…" : "understand this"}
            </button>
            <button
              type="button"
              onClick={() => setTranscript(DEMO_DARIJA)}
              disabled={busy !== null}
              className={`${BTN} border border-white/15 text-white/80 hover:border-white/30`}
            >
              use the scripted sentence
            </button>
          </div>

          {guide ? (
            guide.degraded ? (
              <p className="mt-3 text-sm text-amber-300">
                • the guide was unreachable — no key, a timeout, or nothing usable came back
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <p className={LABEL}>reply</p>
                  <p dir="rtl" className="mt-1 text-[15px] leading-relaxed text-white/90">
                    {guide.reply}
                  </p>
                </div>
                {guide.headline ? (
                  <div>
                    <p className={LABEL}>headline</p>
                    <p dir="rtl" className="mt-1 text-[15px] text-white/90">
                      {guide.headline}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className={LABEL}>
                    picks ({guide.picks.length}) — every id below exists in the dataset, or it
                    would not have survived the parser
                  </p>
                  {guide.picks.length === 0 ? (
                    <p className="mt-1 text-sm text-white/35">
                      none — the guide answered without proposing a day
                    </p>
                  ) : (
                    <ol className="mt-1 flex flex-col gap-1">
                      {guide.picks.map((pick) => (
                        <li key={pick.poiId} className="text-sm">
                          <span className="font-mono text-[12px] text-emerald-300">
                            {pick.poiId}
                          </span>
                          <span dir="rtl" className="ms-2 text-white/70">
                            {pick.reason}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <div>
                  <p className={LABEL}>profile it understood</p>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-black/30 p-3 font-mono text-[12px] text-white/70">
                    {JSON.stringify(guide.profile, null, 2)}
                  </pre>
                </div>
              </div>
            )
          ) : (
            <div className="mt-3">
              <Pending />
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}
