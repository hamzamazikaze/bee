"use client";

/**
 * /test-ai — a temporary developer laboratory for the Gemini pipeline.
 *
 * Isolated on purpose: it imports nothing from the app's state, presets or screens, and
 * nothing in the app imports it. Recordings live in memory and are dropped when the page
 * unloads — nothing is saved, persisted or written to localStorage.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Status =
  | { state: "checking" }
  | { state: "ok"; modelCount: number; models: Record<string, boolean> }
  | { state: "down"; message: string };

interface AudioResult {
  transcript: string;
  detectedLanguage: string | null;
  model: string;
  languageModel: string;
  bytes: number;
  receivedMimeType: string | null;
}

interface Translation {
  detectedLanguage: string;
  english: string;
  french: string;
  arabic: string;
}

interface Intent {
  city: string | null;
  detectedPlace: string | null;
  interests: string[];
  timeAvailable: string | null;
  budgetLevel: string | null;
  pace: string | null;
  avoidLongWalks: boolean | null;
  confidence: number;
}

const CARD = "rounded-lg border border-white/10 bg-white/[0.03] p-4";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={CARD}>
      <h2 className={`${LABEL} mb-2`}>{title}</h2>
      {children}
    </section>
  );
}

function Pending() {
  return <p className="text-sm text-white/30">—</p>;
}

export default function TestAiPage() {
  const [status, setStatus] = useState<Status>({ state: "checking" });
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [audio, setAudio] = useState<AudioResult | null>(null);
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/test-ai/status")
      .then((r) => r.json())
      .then((d) =>
        setStatus(
          d.connected
            ? { state: "ok", modelCount: d.modelCount, models: d.models }
            : { state: "down", message: d.message ?? `HTTP ${d.status ?? "?"}` },
        ),
      )
      .catch((e) => setStatus({ state: "down", message: String(e) }));
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setAudio(null);
    setTranslation(null);
    setIntent(null);
    setBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      rec.onstop = () => {
        setBlob(new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError(`getUserMedia failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const stop = useCallback(() => {
    recorder.current?.stop();
    setRecording(false);
    if (timer.current) clearInterval(timer.current);
  }, []);

  const send = useCallback(async () => {
    if (!blob) return;
    setError(null);
    setAudio(null);
    setTranslation(null);
    setIntent(null);

    try {
      setBusy("Transcribing…");
      const form = new FormData();
      form.append("file", blob, "recording.webm");
      const first = await fetch("/api/test-ai/audio", { method: "POST", body: form }).then((r) =>
        r.json(),
      );
      if (!first.success) {
        setError(JSON.stringify(first.error, null, 2));
        return;
      }
      setAudio(first);

      setBusy("Translating…");
      const second = await fetch("/api/test-ai/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript: first.transcript }),
      }).then((r) => r.json());
      if (second.success) setTranslation(second);
      else setError(JSON.stringify(second.error, null, 2));

      setBusy("Extracting intent…");
      const third = await fetch("/api/test-ai/intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript: first.transcript }),
      }).then((r) => r.json());
      if (third.success) setIntent(third.intent);
      else setError((prev) => `${prev ? `${prev}\n\n` : ""}${JSON.stringify(third.error, null, 2)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [blob]);

  const button =
    "rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 font-mono text-sm">
      <header className="mb-6">
        <span className="inline-block rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">
          Test page — not production
        </span>
        <h1 className="mt-3 text-xl font-semibold text-white">Gemini audio pipeline</h1>
        <p className="mt-1 text-xs text-white/40">
          microphone → transcription → translation → structured travel intent
        </p>
      </header>

      <div className="space-y-4">
        <Panel title="1 · Gemini connection">
          {status.state === "checking" && <p className="text-white/40">checking…</p>}
          {status.state === "down" && (
            <p className="whitespace-pre-wrap text-red-300">NOT CONNECTED — {status.message}</p>
          )}
          {status.state === "ok" && (
            <div className="space-y-1">
              <p className="text-emerald-300">
                CONNECTED — key recognised, {status.modelCount} models visible
              </p>
              {Object.entries(status.models).map(([model, available]) => (
                <p key={model} className={available ? "text-emerald-300/80" : "text-red-300"}>
                  {available ? "✓" : "✗"} {model}
                </p>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="2 · Recorder">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={start}
              disabled={recording || busy !== null}
              className={`${button} bg-red-500/20 text-red-200 hover:bg-red-500/30`}
            >
              ● Start recording
            </button>
            <button
              type="button"
              onClick={stop}
              disabled={!recording}
              className={`${button} bg-white/10 text-white hover:bg-white/20`}
            >
              ■ Stop
            </button>
            <button
              type="button"
              onClick={send}
              disabled={!blob || recording || busy !== null}
              className={`${button} bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30`}
            >
              ↑ Send to Gemini
            </button>
          </div>
          <p className="mt-3 text-white/60">
            {recording ? (
              <span className="text-red-300">recording… {seconds}s</span>
            ) : blob ? (
              <>
                ready · {seconds}s · {(blob.size / 1024).toFixed(1)} KB · {blob.type || "audio/webm"}
              </>
            ) : (
              <span className="text-white/30">idle</span>
            )}
          </p>
          {busy && <p className="mt-1 text-amber-300">{busy}</p>}
        </Panel>

        <Panel title="3 · Original transcript">
          {audio ? (
            <p className="whitespace-pre-wrap text-white">{audio.transcript}</p>
          ) : (
            <Pending />
          )}
        </Panel>

        <Panel title="4 · Detected language">
          {audio ? (
            <p className="text-white">
              {audio.detectedLanguage ?? <span className="text-white/30">not returned</span>}
              <span className="ml-2 text-white/30">
                ({audio.model} → {audio.languageModel})
              </span>
            </p>
          ) : (
            <Pending />
          )}
        </Panel>

        <Panel title="5 · English">
          {translation ? <p className="text-white">{translation.english}</p> : <Pending />}
        </Panel>

        <Panel title="6 · French">
          {translation ? <p className="text-white">{translation.french}</p> : <Pending />}
        </Panel>

        <Panel title="7 · Arabic">
          {translation ? (
            <p dir="rtl" className="text-right text-white">
              {translation.arabic}
            </p>
          ) : (
            <Pending />
          )}
        </Panel>

        <Panel title="8 · Extracted trip intent">
          {intent ? (
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-emerald-200">
              {JSON.stringify(intent, null, 2)}
            </pre>
          ) : (
            <Pending />
          )}
        </Panel>

        <Panel title="9 · Raw error">
          {error ? (
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-red-300">{error}</pre>
          ) : (
            <p className="text-sm text-white/30">none</p>
          )}
        </Panel>
      </div>
    </main>
  );
}
