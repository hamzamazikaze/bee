"use client";

/**
 * BENNA M3AK en direct — the browser half: mic → Gemini Live → voice, with barge-in.
 *
 * Plain WebSocket, no SDK (same choice as @/lib/ai/gemini-client). The session is opened
 * with a one-use token from /api/benna/m3ak/live-token; everything the model may do is
 * sealed in it. Its one tool, `chercher_plats`, is answered here by the same matcher as
 * the text M3AK (/api/benna/m3ak), so dishes and prices on screen and in its mouth both
 * come from today's menu rows.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { LIVE_TOOL, requestFromToolArgs } from "./m3ak-live-setup";
import type { Diet, M3akAnswer } from "./m3ak";

const WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

/** Mic capture: browser rate → 16 kHz PCM16 mono, ~100 ms chunks. */
const WORKLET = `
class M3akMic extends AudioWorkletProcessor {
  constructor() { super(); this.ratio = sampleRate / 16000; this.acc = []; this.pos = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (; this.pos < ch.length; this.pos += this.ratio) this.acc.push(ch[Math.floor(this.pos)]);
    this.pos -= ch.length;
    if (this.acc.length >= 1600) {
      const out = new Int16Array(this.acc.length);
      for (let i = 0; i < out.length; i++) out[i] = Math.max(-1, Math.min(1, this.acc[i])) * 0x7fff;
      this.port.postMessage(out.buffer, [out.buffer]);
      this.acc = [];
    }
    return true;
  }
}
registerProcessor("m3ak-mic", M3akMic);`;

export type LiveStatus = "idle" | "connecting" | "listening" | "speaking" | "error";
export type LiveLine = { who: "user" | "bot"; text: string };

/** Loudness of a PCM16 chunk, 0–1. */
const rms = (buffer: ArrayBuffer) => {
  const pcm = new Int16Array(buffer);
  let sum = 0;
  for (let i = 0; i < pcm.length; i++) sum += (pcm[i] / 0x8000) ** 2;
  return Math.sqrt(sum / Math.max(1, pcm.length));
};

const toBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

type ServerMessage = {
  setupComplete?: object;
  serverContent?: {
    modelTurn?: { parts?: { inlineData?: { data: string } }[] };
    interrupted?: boolean;
    turnComplete?: boolean;
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
  };
  toolCall?: { functionCalls?: { id: string; name: string; args?: unknown }[] };
};

export function useM3akLive({
  workplaceId,
  diet,
  onAnswer,
}: {
  workplaceId: string | null;
  diet: Diet;
  onAnswer: (answer: M3akAnswer) => void;
}) {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<LiveLine[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const mic = useRef<{ stream: MediaStream; ctx: AudioContext } | null>(null);
  const play = useRef<{ ctx: AudioContext; at: number; sources: Set<AudioBufferSourceNode> } | null>(null);
  const answerRef = useRef(onAnswer);
  useEffect(() => {
    answerRef.current = onAnswer;
  }, [onAnswer]);

  /** Appends transcription to the current line of that speaker, or opens a new one. */
  const say = useCallback((who: LiveLine["who"], text: string) => {
    setLines((list) => {
      const last = list.at(-1);
      if (last?.who === who) return [...list.slice(0, -1), { who, text: last.text + text }];
      return [...list, { who, text: text.trimStart() }].slice(-6);
    });
  }, []);

  const stopPlayback = () => {
    const p = play.current;
    if (!p) return;
    p.sources.forEach((source) => source.stop());
    p.sources.clear();
    p.at = p.ctx.currentTime;
  };

  const stop = useCallback(() => {
    ws.current?.close();
    ws.current = null;
    mic.current?.stream.getTracks().forEach((track) => track.stop());
    void mic.current?.ctx.close();
    mic.current = null;
    stopPlayback();
    void play.current?.ctx.close();
    play.current = null;
    setStatus((s) => (s === "error" ? s : "idle"));
  }, []);

  useEffect(() => stop, [stop]);

  const playChunk = (b64: string) => {
    const p = play.current;
    if (!p) return;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const pcm = new Int16Array(bytes.buffer);
    const buffer = p.ctx.createBuffer(1, pcm.length, 24_000);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) data[i] = pcm[i] / 0x8000;
    const source = p.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(p.ctx.destination);
    p.at = Math.max(p.at, p.ctx.currentTime);
    source.start(p.at);
    p.at += buffer.duration;
    p.sources.add(source);
    source.onended = () => {
      p.sources.delete(source);
      if (!p.sources.size) setStatus((s) => (s === "speaking" ? "listening" : s));
    };
    setStatus("speaking");
  };

  /** The model's only tool: today's menu through the same matcher as the text M3AK. */
  const answerTool = async (call: { id: string; name: string; args?: unknown }) => {
    let response: object = { erreur: "Outil inconnu." };
    if (call.name === LIVE_TOOL) {
      try {
        const res = await fetch("/api/benna/m3ak", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ request: requestFromToolArgs(call.args), workplaceId, diet }),
        });
        const data = (await res.json()) as M3akAnswer & { error?: string };
        if (!res.ok || data.error) {
          response = { erreur: data.error ?? "Menu indisponible." };
        } else {
          answerRef.current(data);
          response = {
            partiel: data.partial,
            plats: data.matches.map((m) => ({
              nom: m.name,
              cuisine: m.kitchenName,
              prix_groupe_dh: m.groupPrice,
              prix_seul_dh: m.soloPrice,
              raisons: m.reasons,
              allergenes: m.allergens,
            })),
            commande_groupee: data.group ? { hote: data.group.host, livraison: data.group.delivery } : null,
          };
        }
      } catch {
        response = { erreur: "Menu indisponible pour le moment." };
      }
    }
    ws.current?.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response }] } }));
  };

  const start = useCallback(async () => {
    if (!workplaceId) {
      setError("Choisissez d'abord votre lieu de travail.");
      setStatus("error");
      return;
    }
    setError(null);
    setLines([]);
    // The mic needs a secure page: on a phone over plain http the API is simply absent.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Le micro demande une connexion sécurisée (https). Écrivez votre demande en attendant.");
      setStatus("error");
      return;
    }
    setStatus("connecting");
    // Both audio contexts are created and resumed inside the tap, before any await: browsers
    // (iOS always, desktop Chrome sometimes) keep a context created later suspended, which
    // silences the mic going out and the voice coming back.
    const ctx = new AudioContext();
    const out = new AudioContext({ sampleRate: 24_000 });
    void ctx.resume();
    void out.resume();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const tokenRes = await fetch("/api/benna/m3ak/live-token", { method: "POST" });
      const { token, model, error: tokenError } = (await tokenRes.json()) as { token?: string; model?: string; error?: string };
      if (!tokenRes.ok || !token) throw new Error(tokenError ?? "La voix en direct est indisponible.");

      const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(ctx, "m3ak-mic");
      ctx.createMediaStreamSource(stream).connect(node);
      mic.current = { stream, ctx };
      play.current = { ctx: out, at: 0, sources: new Set() };

      const socket = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(token)}`);
      ws.current = socket;
      let ready = false;
      node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        // While M3AK talks, laptop speakers leak its voice back into the mic and it would
        // interrupt itself. Then only clearly louder input (someone speaking) goes through.
        if (play.current?.sources.size && rms(event.data) < 0.06) return;
        if (ready && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ realtimeInput: { audio: { data: toBase64(event.data), mimeType: "audio/pcm;rate=16000" } } }));
        }
      };
      socket.onopen = () => socket.send(JSON.stringify({ setup: { model: `models/${model}` } }));
      socket.onmessage = async (event) => {
        const raw = typeof event.data === "string" ? event.data : await (event.data as Blob).text();
        const message = JSON.parse(raw) as ServerMessage;
        if (message.setupComplete) {
          ready = true;
          setStatus("listening");
        }
        const content = message.serverContent;
        if (content?.interrupted) stopPlayback();
        if (content?.inputTranscription?.text) say("user", content.inputTranscription.text);
        if (content?.outputTranscription?.text) say("bot", content.outputTranscription.text);
        for (const part of content?.modelTurn?.parts ?? []) if (part.inlineData) playChunk(part.inlineData.data);
        for (const call of message.toolCall?.functionCalls ?? []) void answerTool(call);
      };
      socket.onclose = () => {
        if (ws.current === socket) stop();
      };
      socket.onerror = () => {
        setError("La connexion vocale a été coupée.");
        setStatus("error");
      };
    } catch (cause) {
      void ctx.close();
      void out.close();
      stop();
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Autorisez le micro pour parler à M3AK."
          : cause instanceof Error && cause.message
            ? cause.message
            : "La voix en direct est indisponible.",
      );
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs; workplace read at call time
  }, [workplaceId, stop, say]);

  return { status, error, lines, start, stop };
}
