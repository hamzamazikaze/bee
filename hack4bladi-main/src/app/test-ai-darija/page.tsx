"use client";

/**
 * /test-ai-darija — the Darija voice pipeline, one stage at a time.
 *
 * Record → MoulSot transcribes → Gemini understands → the local engine builds the day.
 * Each stage shows what it produced and how long it took, so when something is wrong you
 * can see *which* link broke instead of guessing from a blank screen.
 *
 * It drives the same routes the app does — `/api/transcribe`, `/api/extract` — and the
 * same `buildTrip` the onboarding flow calls. Nothing here is a reimplementation, so a
 * green run on this page means the product path works, not that a copy of it does.
 *
 * Writes nothing: no localStorage, no store, no persistence. Recordings live in memory
 * and are dropped on unload.
 */
import { useEffect, useRef, useState } from "react";
import { buildTrip } from "@/features/onboarding/build-trip";
import { parseTripIntentDraft, draftToProfile } from "@/lib/intent";
import type { TripIntentDraft } from "@/types/intent";
import type { TripProfile } from "@/types/profile";
import type { Trip } from "@/types/trip";

/** The scripted demo sentence, for running the chain without a microphone. */
const DEMO_DARIJA = "أنا فكازا نهار كامل، كيعجبني التراث والماكلة، وما بغيتش نمشي بزاف";

const CARD = "rounded-lg border border-white/10 bg-white/[0.03] p-4";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40";
const BTN =
  "rounded-md px-3.5 py-2 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed";

interface Timed<T> {
  value: T;
  ms: number;
}

type LogLevel = "info" | "ok" | "warn" | "fail";

interface LogLine {
  at: number;
  level: LogLevel;
  message: string;
}

interface TranscribeResult {
  text: string;
  provider: string | null;
  detectedLocale: string | null;
  degraded: boolean;
  reason?: string;
}

function Panel({
  step,
  title,
  ms,
  children,
}: {
  step: number;
  title: string;
  ms?: number;
  children: React.ReactNode;
}) {
  return (
    <section className={CARD}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className={LABEL}>
          {step}. {title}
        </h2>
        {ms !== undefined ? (
          <span className="font-mono text-[11px] text-white/35">{(ms / 1000).toFixed(1)}s</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const Pending = () => <p className="text-sm text-white/25">—</p>;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-0.5 text-sm">
      <span className="w-40 shrink-0 text-white/40">{label}</span>
      <span className="min-w-0 flex-1 break-words text-white/90">{value}</span>
    </div>
  );
}

/** Green when the value is what the demo expects, amber when it is merely present. */
function Verdict({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={ok ? "text-emerald-300" : "text-amber-300"}>
      {ok ? "✓" : "•"} {children}
    </span>
  );
}

export default function TestAiDarijaPage() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<Timed<TranscribeResult> | null>(null);
  const [draft, setDraft] = useState<Timed<TripIntentDraft> | null>(null);
  const [profile, setProfile] = useState<TripProfile | null>(null);
  const [trip, setTrip] = useState<Timed<Trip> | null>(null);

  const [log, setLog] = useState<LogLine[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const clockRef = useRef<number>(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  /**
   * Every stage says what it is doing, with the milliseconds since the run began. A silent
   * page that simply stays empty is the worst thing to debug thirty seconds before a demo,
   * and "did I click the button?" is a real question when the answer is invisible.
   * Mirrored to the console so it survives a page you have already navigated away from.
   */
  function say(level: LogLevel, message: string) {
    const at = clockRef.current ? Date.now() - clockRef.current : 0;
    setLog((lines) => [...lines, { at, level, message }]);
    const tag = level === "fail" ? "error" : level === "warn" ? "warn" : "log";
    console[tag](`[darija +${at}ms] ${message}`);
  }

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

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [log]);

  function reset(startClock = false) {
    setTranscript(null);
    setDraft(null);
    setProfile(null);
    setTrip(null);
    setError(null);
    setLog([]);
    if (startClock) clockRef.current = Date.now();
  }

  /** One place to fail: shows the banner, logs it, stops the run. */
  function fail(stage: string, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    setError(`${stage}: ${message}`);
    say("fail", `${stage} — ${message}`);
  }

  async function startRecording() {
    reset(true);
    setBlob(null);
    say("info", "asking for the microphone");

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      fail("recording", new Error("no MediaRecorder here, or the page is not on a secure origin"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      say("ok", `microphone granted · recording as ${recorder.mimeType || "audio/webm"}`);

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const captured = new Blob(chunks, { type: recorder.mimeType });
        setBlob(captured);
        setRecording(false);
        say("ok", `stopped · ${(captured.size / 1024).toFixed(0)} KB captured`);
        if (captured.size === 0) {
          fail("recording", new Error("captured 0 bytes — the microphone produced no audio"));
          return;
        }
        /* Straight on to the chain. Waiting for a second click is how a recording ends up
           sitting there while every stage below stays blank. */
        void runChain(captured);
      };

      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "NotAllowedError") {
        fail("recording", new Error("microphone permission denied"));
      } else {
        fail("recording", cause);
      }
    }
  }

  function stopRecording() {
    say("info", "stopping the recorder");
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  /** STEP 2 — the audio goes to our own route, which chooses MoulSot for Darija. */
  async function runTranscribe(audio: Blob) {
      setBusy("Transcribing on MoulSot…");
      setError(null);
      const started = Date.now();
      say(
        "info",
        `POST /api/transcribe · ${(audio.size / 1024).toFixed(0)} KB · ${audio.type || "audio/webm"} · locale=ar`,
      );
      say("info", "a cold MoulSot Space can take up to ~40s on the first call");
      try {
        const body = new FormData();
        body.append("audio", audio, "voice.webm");
        body.append("locale", "ar");

        const response = await fetch("/api/transcribe", { method: "POST", body });
        say("info", `/api/transcribe → HTTP ${response.status} in ${Date.now() - started}ms`);

        const data = (await response.json()) as TranscribeResult;
        setTranscript({ value: data, ms: Date.now() - started });

        if (data.degraded || !data.text) {
          say("fail", `transcription degraded (${data.reason ?? "empty text"}) — both engines gave nothing`);
          setError(
            `Transcription returned nothing (${data.reason ?? "empty"}). The Space may be asleep and no Groq key is set.`,
          );
          return null;
        }
        say(
          data.provider === "moulsot" ? "ok" : "warn",
          `provider=${data.provider} · ${data.text.length} chars` +
            (data.provider === "groq" ? " (MoulSot fell through to Whisper)" : ""),
        );
        say("ok", `transcript: ${data.text}`);
        return data.text;
      } catch (cause) {
        fail("transcription", cause);
        return null;
      } finally {
        setBusy(null);
      }
  }

  /** STEP 3 — one Gemini call. The Arabic is sent as-is, never translated first. */
  async function runUnderstand(text: string) {
      setBusy("Understanding with Gemini…");
      const started = Date.now();
      say("info", "POST /api/extract · source=audio · Arabic sent as-is, not translated");
      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source: "audio", transcript: text, locale: "ar" }),
        });
        say("info", `/api/extract → HTTP ${response.status} in ${Date.now() - started}ms`);

        const data = (await response.json()) as { draft?: unknown; degraded?: boolean };
        const parsed = parseTripIntentDraft(data.draft, "audio", "ar");
        setDraft({ value: parsed, ms: Date.now() - started });

        say(
          data.degraded ? "warn" : "ok",
          data.degraded
            ? "no Gemini — fell back to the local keyword pass"
            : `Gemini answered · confidence ${parsed.confidence.toFixed(3)} (${parsed.band})`,
        );
        say(
          "info",
          `understood: city=${parsed.destination.city ?? "—"} · interests=[${parsed.interests.join(", ")}] · ` +
            `time=${parsed.timeAvailable ?? "—"} · avoidLongWalks=${parsed.mobility.avoidLongWalks}`,
        );

        const confirmed = draftToProfile(parsed);
        setProfile(confirmed);
        say("ok", `TripProfile ready · walkingPreference=${confirmed.walkingPreference ?? "—"}`);
        return confirmed;
      } catch (cause) {
        fail("extraction", cause);
        return null;
      } finally {
        setBusy(null);
      }
  }

  /** STEP 4 — no model from here on. Local matching, local ordering, local scheduling. */
  async function runBuild(confirmed: TripProfile) {
      setBusy("Building locally…");
      const started = Date.now();
      say("info", "buildTrip() — local matching, ordering and scheduling · no model from here");
      try {
        const built = await buildTrip(confirmed);
        setTrip({ value: built, ms: Date.now() - started });
        say(
          built.stops.length === 4 ? "ok" : "fail",
          `${built.stops.length} stops in ${Date.now() - started}ms: ${built.stops
            .map((stop) => stop.poi.name)
            .join(" → ")}`,
        );
        say("ok", "done");
      } catch (cause) {
        fail("build", cause);
      } finally {
        setBusy(null);
      }
  }

  /**
   * Record → transcribe → understand → build. `audio` absent means the scripted sentence,
   * which skips stage 2 and exercises everything after it.
   */
  async function runChain(audio: Blob | null) {
      if (!clockRef.current) clockRef.current = Date.now();
      setTranscript(null);
      setDraft(null);
      setProfile(null);
      setTrip(null);
      setError(null);

      let text: string | null;
      if (audio) {
        text = await runTranscribe(audio);
      } else {
        say("info", "demo sentence — skipping MoulSot");
        text = DEMO_DARIJA;
        setTranscript({
          value: { text, provider: "typed", detectedLocale: "ar", degraded: false },
          ms: 0,
        });
      }
      if (!text) {
        say("fail", "chain stopped: no transcript");
        return;
      }

      const confirmed = await runUnderstand(text);
      if (!confirmed) {
        say("fail", "chain stopped: no profile");
        return;
      }
    await runBuild(confirmed);
  }

  function runDemo() {
    reset(true);
    void runChain(null);
  }

  function rerun() {
    if (!blob) return;
    reset(true);
    void runChain(blob);
  }

  const d = draft?.value;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-white">Darija voice → trip</h1>
        <p className="mt-1 text-sm text-white/50">
          MoulSot v0.3 transcribes · Gemini understands · the local engine decides. Four stages,
          each one timed. Nothing on this page is saved.
        </p>
      </header>

      <div className={`${CARD} mb-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={Boolean(busy)}
            className={`${BTN} ${
              recording
                ? "bg-red-500/90 text-white hover:bg-red-500"
                : "bg-emerald-400 text-black hover:bg-emerald-300"
            }`}
          >
            {recording ? `Stop (${seconds}s)` : "Record"}
          </button>

          <button
            type="button"
            onClick={rerun}
            disabled={!blob || Boolean(busy) || recording}
            className={`${BTN} bg-white/10 text-white hover:bg-white/15`}
            title="The chain runs on its own when you stop; this replays it on the same audio"
          >
            Re-run on this audio
          </button>

          <button
            type="button"
            onClick={runDemo}
            disabled={Boolean(busy) || recording}
            className={`${BTN} bg-white/10 text-white hover:bg-white/15`}
            title="Skips the microphone and runs the scripted sentence"
          >
            Demo sentence (no mic)
          </button>

          {blob ? (
            <span className="text-xs text-white/40">
              {(blob.size / 1024).toFixed(0)} KB · {blob.type || "audio/webm"}
            </span>
          ) : null}
          {busy ? <span className="text-xs text-emerald-300/80">{busy}</span> : null}
        </div>

        <p className="mt-3 text-xs text-white/35" dir="rtl">
          {DEMO_DARIJA}
        </p>

        {error ? (
          <p className="mt-3 rounded border border-red-400/30 bg-red-400/10 p-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <Panel step={1} title="Record">
          {blob ? (
            <p className="text-sm text-white/70">
              {(blob.size / 1024).toFixed(0)} KB captured — ready.
            </p>
          ) : (
            <p className="text-sm text-white/25">
              Tap Record, speak Darija, tap Stop. Or run the demo sentence without a mic.
            </p>
          )}
        </Panel>

        <Panel step={2} title="Transcribe — MoulSot v0.3" ms={transcript?.ms}>
          {transcript ? (
            <>
              <p
                dir="rtl"
                className="mb-3 rounded border border-white/10 bg-black/30 p-3 text-lg leading-relaxed text-white"
              >
                {transcript.value.text || "(empty)"}
              </p>
              <Row
                label="provider"
                value={
                  <Verdict ok={transcript.value.provider === "moulsot"}>
                    {transcript.value.provider ?? "none"}
                    {transcript.value.provider === "groq" ? " (MoulSot fell through)" : ""}
                  </Verdict>
                }
              />
              <Row label="degraded" value={String(transcript.value.degraded)} />
              {transcript.value.reason ? (
                <Row label="reason" value={transcript.value.reason} />
              ) : null}
            </>
          ) : (
            <Pending />
          )}
        </Panel>

        <Panel step={3} title="Understand — Gemini, one call" ms={draft?.ms}>
          {d ? (
            <>
              <Row
                label="destination"
                value={<Verdict ok={d.destination.city === "Casablanca"}>{d.destination.city ?? "—"}</Verdict>}
              />
              <Row
                label="interests"
                value={
                  <Verdict ok={d.interests.includes("culture") && d.interests.includes("food")}>
                    {d.interests.join(", ") || "—"}
                  </Verdict>
                }
              />
              <Row
                label="timeAvailable"
                value={<Verdict ok={d.timeAvailable === "full_day"}>{d.timeAvailable ?? "—"}</Verdict>}
              />
              <Row
                label="avoidLongWalks"
                value={
                  <Verdict ok={d.mobility.avoidLongWalks === true}>
                    {String(d.mobility.avoidLongWalks)} → walkingPreference:{" "}
                    {profile?.walkingPreference ?? "—"}
                  </Verdict>
                }
              />
              <Row label="budget / pace" value={`${d.budgetLevel ?? "—"} / ${d.pace ?? "—"}`} />
              <Row
                label="confidence"
                value={`${d.confidence.toFixed(3)} (${d.band})`}
              />
              <Row label="degraded" value={String(d.degraded)} />
              <Row
                label="detectedPoiId"
                value={d.destination.detectedPoiId ?? "— (none named, correct here)"}
              />
              <Row
                label="transcript kept"
                value={
                  <span dir="rtl" className="inline-block">
                    {d.evidence.transcript ?? "—"}
                  </span>
                }
              />
            </>
          ) : (
            <Pending />
          )}
        </Panel>

        <Panel step={4} title="Build — local engine, no model" ms={trip?.ms}>
          {trip ? (
            <>
              <Row
                label="stops"
                value={<Verdict ok={trip.value.stops.length === 4}>{trip.value.stops.length}</Verdict>}
              />
              <ol className="my-2 space-y-1">
                {trip.value.stops.map((stop, index) => (
                  <li key={stop.id} className="text-sm text-white/80">
                    <span className="text-white/35">{index + 1}.</span> {stop.poi.name}
                    <span className="text-white/35">
                      {" "}
                      · {stop.arrivalTime} · {stop.poi.city}
                    </span>
                  </li>
                ))}
              </ol>
              <Row label="segments" value={trip.value.segments.length} />
              <Row
                label="walking"
                value={`${(trip.value.metrics.walkingMeters / 1000).toFixed(2)} km`}
              />
              <Row label="total" value={`${trip.value.metrics.totalMinutes} min`} />
              <Row
                label="profile carried"
                value={`${trip.value.profile.timeAvailable} · ${trip.value.profile.walkingPreference}`}
              />
            </>
          ) : (
            <Pending />
          )}
        </Panel>
      </div>

      <section className={`${CARD} mt-4`}>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className={LABEL}>Log</h2>
          {log.length > 0 ? (
            <button
              type="button"
              onClick={() => setLog([])}
              className="text-[11px] text-white/35 hover:text-white/60"
            >
              clear
            </button>
          ) : null}
        </div>
        {log.length === 0 ? (
          <p className="text-sm text-white/25">
            Nothing yet. Every stage reports here — and to the browser console.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto font-mono text-[12px] leading-relaxed">
            {log.map((line, index) => (
              <div key={index} className="flex gap-2">
                <span className="shrink-0 text-white/25">
                  +{String(line.at).padStart(5, " ")}ms
                </span>
                <span
                  className={
                    line.level === "fail"
                      ? "text-red-300"
                      : line.level === "warn"
                        ? "text-amber-300"
                        : line.level === "ok"
                          ? "text-emerald-300"
                          : "text-white/60"
                  }
                  dir="auto"
                >
                  {line.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-white/30">
        Expected for the scripted sentence: Casablanca · culture + food · full_day · minimal ·
        exactly 4 stops. A cold MoulSot Space can take up to ~40s on the first call — run it once to
        warm it before a demo.
      </p>
    </main>
  );
}
