"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Camera, Check, CircleNotch, PaperPlaneRight, Plus, Stop, UsersThree, Waveform } from "@phosphor-icons/react";
import { BrandMark } from "@/components/brand";
import { BottomSheet } from "@/components/bottom-sheet";
import { MediaCard } from "@/components/media-card";
import { VoiceCapture } from "@/features/home/voice-capture";
import { cn } from "@/lib/utils";
import { ALLERGEN_LABEL, dishById, formatMad, type Allergen } from "./data";
import { useCart } from "./cart";
import { CONCEPT_LABEL, type M3akAnswer, type MealRequest } from "./m3ak";
import { useM3akLive, type LiveStatus } from "./m3ak-live";
import { toJpegBase64 } from "./photo";
import { MonoTag } from "./ui";

const EXAMPLES = [
  "Salam, bghit chi haja b lkhodra, bla djaj, budget dyali 35 DH",
  "Chi haja khfifa b 30 DH",
  "بغيت طاجين بلا لحم",
];

/** Refinements the parser understands: each is appended to the last request and re-asked. */
const REFINE: { label: string; add: string }[] = [
  { label: "Sans piment", add: "sans piment" },
  { label: "Végétarien", add: "sans viande, sans poulet, sans poisson" },
  { label: "Léger", add: "quelque chose de léger" },
  { label: "≤ 30 DH", add: "budget 30 DH" },
];

const PREFERENCE_LABEL: Record<MealRequest["preferences"][number], string> = {
  leger: "léger",
  copieux: "copieux",
  "sans-piment": "sans piment",
  "grande-portion": "grande portion",
};

type State = { kind: "idle" } | { kind: "loading" } | { kind: "answer"; answer: M3akAnswer } | { kind: "error"; message: string };

const LIVE_LABEL: Record<LiveStatus, string> = {
  idle: "",
  connecting: "Connexion à M3AK…",
  listening: "M3AK vous écoute — parlez, vous pouvez l'interrompre",
  speaking: "M3AK parle…",
  error: "",
};

async function transcribeM3ak(audio: Blob): Promise<string | null> {
  const form = new FormData();
  form.append("audio", audio, "request");
  try {
    const response = await fetch("/api/benna/transcribe", { method: "POST", body: form });
    const data = (await response.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}

const time = (iso: string) =>
  new Intl.DateTimeFormat("fr-MA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" }).format(new Date(iso));

/** What M3AK understood, as chips the person can check at a glance. */
function Understood({ request }: { request: MealRequest }) {
  const chips = [
    ...(request.budgetMad !== null ? [{ label: `≤ ${request.budgetMad} DH`, tone: "populaire" as const }] : []),
    ...request.wants.map((concept) => ({ label: `Envie : ${CONCEPT_LABEL[concept]}`, tone: "healthy" as const })),
    ...request.excludes.map((concept) => ({ label: `Sans ${CONCEPT_LABEL[concept]}`, tone: "fait-maison" as const })),
    ...request.preferences.map((preference) => ({ label: PREFERENCE_LABEL[preference], tone: "nouveau" as const })),
  ];
  if (!chips.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Ce que BENNA a compris">
      {chips.map((chip) => (
        <li key={chip.label}>
          <MonoTag tone={chip.tone}>{chip.label}</MonoTag>
        </li>
      ))}
    </ul>
  );
}

/** A message from M3AK: the emblem as avatar, a soft bubble. */
function Bot({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <BrandMark className="mt-0.5 size-8" />
      <div className="bg-surface-muted min-w-0 flex-1 rounded-2xl rounded-ss-md px-3.5 py-2.5 text-[0.875rem]">{children}</div>
    </div>
  );
}

/** BENNA M3AK — "with you": say what you feel like, get dishes from today's real menu. */
export function M3akSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const workplaceId = useCart((state) => state.workplaceId);
  const diet = useCart((state) => state.diet);
  const [photo, setPhoto] = useState<string | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  const quickAdd = useCart((state) => state.quickAdd);
  const [text, setText] = useState("");
  const [asked, setAsked] = useState("");
  const [heard, setHeard] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [added, setAdded] = useState<string[]>([]);
  const field = useRef<HTMLTextAreaElement>(null);
  const live = useM3akLive({
    workplaceId,
    diet,
    onAnswer: (found) => {
      setAsked("");
      setAdded([]);
      setState({ kind: "answer", answer: found });
    },
  });
  const liveOn = live.status === "connecting" || live.status === "listening" || live.status === "speaking";

  async function askPhoto(file: File) {
    setAsked("");
    setText("");
    setHeard(false);
    setAdded([]);
    setSeen(null);
    setPhoto((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
    setState({ kind: "loading" });
    try {
      const base64 = await toJpegBase64(file);
      const response = await fetch("/api/benna/photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: { base64, mimeType: "image/jpeg" }, workplaceId, diet }),
      });
      const data = (await response.json()) as M3akAnswer & { seen?: string | null; error?: string };
      if (!response.ok || data.error) throw new Error(data.error);
      setSeen(data.seen ?? null);
      setState({ kind: "answer", answer: data });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error && error.message ? error.message : "Je n'ai pas pu lire cette photo. Réessayez.",
      });
    }
  }

  async function ask(value: string) {
    const query = value.trim();
    if (!query) return;
    setPhoto(null);
    setSeen(null);
    setAsked(query);
    setText("");
    setHeard(false);
    setAdded([]);
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/benna/m3ak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: query, workplaceId, diet }),
      });
      const data = (await response.json()) as M3akAnswer & { error?: string };
      if (!response.ok || data.error) throw new Error(data.error);
      setState({ kind: "answer", answer: data });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error && error.message ? error.message : "Pas de réponse. Vérifiez la connexion et réessayez.",
      });
    }
  }

  function close() {
    live.stop();
    setState({ kind: "idle" });
    setText("");
    setAsked("");
    setHeard(false);
    onClose();
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(text);
  };

  const answer = state.kind === "answer" ? state.answer : null;

  const liveBar = (
    <div className="mb-2.5 flex items-center gap-2">
      <button
        type="button"
        onClick={() => (liveOn ? live.stop() : void live.start())}
        aria-pressed={liveOn}
        className={cn(
          "pressable flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold",
          liveOn ? "bg-danger text-white" : "bg-primary-soft text-primary-ink",
        )}
      >
        {liveOn ? <Stop aria-hidden className="size-4" weight="fill" /> : <Waveform aria-hidden className="size-4" weight="bold" />}
        {liveOn ? "Arrêter" : "Parler en direct"}
      </button>
      <p role="status" className={cn("min-w-0 flex-1 truncate text-xs", live.error ? "text-danger" : "text-muted-foreground")}>
        {live.error ?? LIVE_LABEL[live.status]}
      </p>
    </div>
  );

  const composer = (
    <form onSubmit={submit}>
      {liveBar}
      {answer ? (
        <div className="mb-2.5 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {REFINE.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => void ask(`${asked}, ${chip.add}`)}
              className="pressable border-border bg-surface shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium"
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      <label htmlFor="m3ak-text" className="sr-only">
        Votre demande
      </label>
      <div className="border-border bg-surface focus-within:border-primary flex items-end gap-1.5 rounded-3xl border p-1.5">
        {/* A photo of a dish you crave: the vision model names it, today's menu answers. */}
        <label className="pressable text-muted-foreground hover:text-foreground grid size-10 shrink-0 cursor-pointer place-items-center rounded-full">
          <Camera aria-hidden className="size-5" />
          <span className="sr-only">Chercher avec une photo</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void askPhoto(file);
            }}
          />
        </label>
        <textarea
          ref={field}
          id="m3ak-text"
          name="m3ak"
          rows={1}
          dir="auto"
          maxLength={500}
          autoComplete="off"
          placeholder="Posez votre question…"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask(text);
            }
          }}
          className="placeholder:text-muted-foreground max-h-24 min-w-0 flex-1 resize-none bg-transparent px-2.5 py-2 text-[0.9375rem] outline-none"
        />
        <VoiceCapture
          maxMs={30_000}
          transcribeWith={transcribeM3ak}
          onTranscript={(said) => {
            // Fill, don't send: the person checks what was heard first.
            setText(said);
            setHeard(true);
            field.current?.focus();
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || state.kind === "loading"}
          aria-label="Envoyer la demande"
          className="pressable bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-full disabled:opacity-40"
        >
          {state.kind === "loading" ? (
            <CircleNotch aria-hidden className="size-5 animate-spin motion-reduce:animate-none" weight="bold" />
          ) : (
            <PaperPlaneRight aria-hidden className="size-5 rtl:-scale-x-100" weight="fill" />
          )}
        </button>
      </div>
      {heard ? (
        <p role="status" className="text-primary-ink mt-1.5 text-xs font-medium">
          Voici ce que nous avons entendu. Corrigez si besoin, puis envoyez.
        </p>
      ) : null}
    </form>
  );

  return (
    <BottomSheet open={open} onClose={close} title="BENNA M3AK" className="h-[88%]" footer={composer}>
      <div aria-live="polite" className="space-y-4 pb-2">
        <Bot>Salam ! Dites-moi ce qui vous fait envie, en darija, en français ou en arabe. Je cherche dans le menu du jour.</Bot>

        {live.lines.map((line, index) =>
          line.who === "user" ? (
            <div key={index} className="flex justify-end">
              <p dir="auto" className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-se-md px-3.5 py-2.5 text-[0.875rem]">
                {line.text}
              </p>
            </div>
          ) : (
            <Bot key={index}>
              <span dir="auto">{line.text}</span>
            </Bot>
          ),
        )}

        {state.kind === "idle" && !live.lines.length ? (
          <div className="flex flex-col items-end gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                dir="auto"
                onClick={() => void ask(example)}
                className="pressable border-border bg-surface max-w-[85%] rounded-2xl rounded-se-md border px-3.5 py-2 text-start text-[0.8125rem]"
              >
                {example}
              </button>
            ))}
          </div>
        ) : null}

        {photo ? (
          <div className="flex justify-end">
            <Image src={photo} alt="Votre photo" width={176} height={176} unoptimized className="size-44 rounded-2xl rounded-se-md object-cover" />
          </div>
        ) : null}

        {asked ? (
          <div className="flex justify-end">
            <p dir="auto" className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-se-md px-3.5 py-2.5 text-[0.875rem]">
              {asked}
            </p>
          </div>
        ) : null}

        {state.kind === "loading" ? (
          <Bot>
            <span className="text-muted-foreground">BENNA regarde le menu du jour…</span>
          </Bot>
        ) : null}
        {state.kind === "error" ? (
          <Bot>
            <span className="text-danger">{state.message}</span>
          </Bot>
        ) : null}

        {answer ? (
          <Bot>
            {seen ? <p className="mb-1">On dirait « {seen} ».</p> : null}
            <p>
              {answer.matches.length
                ? answer.partial
                  ? "Rien ne correspond exactement aujourd'hui. Voici ce qui respecte votre budget et vos exclusions :"
                  : `Voici ${answer.matches.length} option${answer.matches.length > 1 ? "s" : ""} du menu du jour :`
                : "Rien dans le menu du jour ne respecte ces critères. Essayez un budget plus large ou moins d'exclusions."}
            </p>
            <Understood request={answer.request} />
          </Bot>
        ) : null}

        {answer?.matches.length ? (
          <ul className="-me-5 flex snap-x gap-3 overflow-x-auto ps-10 pe-5 pb-1 [scrollbar-width:none]">
            {answer.matches.map((match) => {
              const inCart = added.includes(match.id);
              const canAdd = Boolean(dishById(match.id));
              return (
                <li key={match.id} className="card w-44 shrink-0 snap-start overflow-hidden">
                  <MediaCard src={match.image} alt="" ratio="landscape" rounded="none" ornamentSeed={match.id} sizes="176px" />
                  <div className="p-2.5">
                    <p className="line-clamp-2 text-[0.8125rem] leading-snug font-semibold">{match.name}</p>
                    <p className="text-muted-foreground truncate text-[0.6875rem]">{match.kitchenName}</p>
                    <ul className="mt-1 space-y-0.5">
                      {match.reasons.slice(0, 2).map((reason) => (
                        <li key={reason} className="flex items-center gap-1 text-[0.6875rem]">
                          <Check aria-hidden className="text-primary-ink size-3 shrink-0" weight="bold" />
                          <span className="truncate">{reason}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-muted-foreground mt-1 line-clamp-1 text-[0.625rem]">
                      {match.allergens.length
                        ? `Allergènes : ${match.allergens.map((code) => ALLERGEN_LABEL[code as Allergen] ?? code).join(", ")}`
                        : "Aucun allergène majeur déclaré"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p dir="ltr" className="flex items-baseline gap-1 whitespace-nowrap">
                        <span className="text-[0.875rem] font-semibold tabular-nums">{formatMad(match.groupPrice)}</span>
                        <span className="text-muted-foreground text-[0.6875rem] tabular-nums line-through">{formatMad(match.soloPrice)}</span>
                      </p>
                      {canAdd ? (
                        <button
                          type="button"
                          onClick={() => {
                            quickAdd(match.id);
                            setAdded((list) => [...list, match.id]);
                          }}
                          aria-label={inCart ? `Ajouter un autre ${match.name}` : `Ajouter ${match.name} au panier`}
                          className={cn(
                            "pressable grid size-8 shrink-0 place-items-center rounded-lg",
                            inCart ? "bg-primary-soft text-primary-ink" : "bg-primary text-primary-foreground",
                          )}
                        >
                          {inCart ? <Check aria-hidden className="size-4" weight="bold" /> : <Plus aria-hidden className="size-4" weight="bold" />}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {answer?.group ? (
          <Link href="/groupe" onClick={close} className="bg-cream ms-10 flex items-center gap-3 rounded-2xl px-3.5 py-3">
            <UsersThree aria-hidden className="text-primary-ink size-6 shrink-0" weight="fill" />
            <span className="min-w-0 flex-1 text-[0.8125rem]">
              <span className="block font-semibold">
                Commande de {answer.group.host} ouverte · livraison {answer.group.delivery}
              </span>
              <span className="text-muted-foreground block">
                Clôture à <span className="tabular-nums">{time(answer.group.cutoffAt)}</span> · vos plats partent avec le groupe
              </span>
            </span>
          </Link>
        ) : null}

        {answer ? (
          <p className="text-muted-foreground ms-10 text-[0.6875rem] leading-snug">
            {answer.source === "ai" ? "Compris par l'IA" : "Compris hors ligne"} · ingrédients tels que déclarés par la cuisine. En
            cas d&apos;allergie, vérifiez auprès de la cuisine.
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}
