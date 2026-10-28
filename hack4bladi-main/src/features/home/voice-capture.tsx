"use client";

import { useRef, useState } from "react";
import { CircleNotch, Microphone, Square } from "@phosphor-icons/react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";
import { transcribe } from "./analyze";

type VoiceState = "idle" | "recording" | "working" | "failed" | "unavailable";

/**
 * The container we ask the recorder for, rather than the one it feels like giving us.
 *
 * Left to itself a MediaRecorder picks per browser — Opus in WebM on Chrome, MP4 on
 * Safari, Ogg on Firefox — and the upload boundary in @/config/app has to have been told
 * about whichever it chose. Asking for one we know both transcription engines read turns
 * a browser difference into a no-op. `undefined` when none of them is supported: the
 * browser's own default is still better than refusing to record.
 */
function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Secondary input. It records, posts once, and gets out of the way — a failure here
 * shows one line and never blocks the CTA (docs/FALLBACKS.md).
 *
 * Five states, and until now one visual: the button swapped its icon and a line of text
 * appeared beside it. Recording and transcribing are the two moments where a traveller has
 * no other way to tell whether the app is doing anything, so each one now says so on the
 * button itself — a breathing ring while it listens, a turning notch while it reads.
 *
 * The ring is a scale-and-fade on a sibling span: one composited property, no canvas, no
 * analyser node, and nothing that keeps running once recording stops.
 */
export function VoiceCapture({
  onTranscript,
  transcribeWith,
  maxMs,
}: {
  onTranscript: (text: string) => void;
  /** Another transcription endpoint (BENNA M3AK uses OpenAI only). Defaults to /api/transcribe. */
  transcribeWith?: (audio: Blob) => Promise<string | null>;
  /** Stops recording by itself after this long, so a forgotten mic never uploads minutes of audio. */
  maxMs?: number;
}) {
  const { t, locale } = useTranslation();
  const [state, setState] = useState<VoiceState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const capRef = useRef<number | null>(null);

  async function start() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        /* A recording with no bytes in it is not a transcription problem, and sending it
           costs a round trip to be told so. It happens for real: a tap that starts and
           stops inside one frame, or a device that hands back a muted track. */
        const audio = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (audio.size === 0) {
          setState("failed");
          return;
        }

        setState("working");
        const text = transcribeWith ? await transcribeWith(audio) : await transcribe(audio, locale);
        if (text) {
          setState("idle");
          onTranscript(text);
        } else {
          setState("failed");
        }
      };

      recorderRef.current = recorder;
      /* A timeslice, so `dataavailable` fires while recording rather than only on stop.
         Without it the entire recording rides on one final event, and a tab that is
         backgrounded or a recorder torn down early takes the whole clip with it. */
      recorder.start(1000);
      setState("recording");
      if (maxMs) capRef.current = window.setTimeout(stop, maxMs);
    } catch {
      setState("unavailable");
    }
  }

  function stop() {
    if (capRef.current) window.clearTimeout(capRef.current);
    capRef.current = null;
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  const recording = state === "recording";
  const busy = state === "working";

  return (
    <div className="flex items-center justify-end gap-3">
      {state === "failed" || state === "unavailable" ? (
        <p role="status" className="text-muted-foreground text-xs">
          {t(state === "failed" ? "home.voiceFailed" : "home.voiceUnavailable")}
        </p>
      ) : null}
      {recording ? (
        <p role="status" className="text-primary-ink text-xs font-semibold">
          {t("home.voiceRecording")}
        </p>
      ) : null}

      <span className="relative grid place-items-center">
        {/* Listening. Sits behind the pill and is gone the moment recording stops. */}
        {recording ? (
          <span aria-hidden className="bg-primary/25 voice-listening absolute inset-0 rounded-full" />
        ) : null}
        {/* A compact "Speak" pill in the corner of the text field — an action of the
            field, not a floating AI orb. */}
        <button
          type="button"
          onClick={recording ? stop : start}
          disabled={busy}
          aria-pressed={recording}
          aria-label={recording ? t("home.voiceStop") : busy ? t("common.loading") : t("home.useVoice")}
          className={cn(
            "pressable relative inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-60",
            recording
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary/50 bg-primary-soft/60 text-primary-ink hover:border-primary hover:bg-primary-soft",
          )}
        >
          {busy ? (
            <CircleNotch aria-hidden className="size-4 animate-spin motion-reduce:animate-none" weight="bold" />
          ) : recording ? (
            <Square aria-hidden className="size-3.5" weight="fill" />
          ) : (
            <Microphone aria-hidden className="size-4" weight="fill" />
          )}
          <span>{busy ? t("home.understanding") : recording ? t("home.voiceStop") : t("home.useVoice")}</span>
        </button>
      </span>
    </div>
  );
}
