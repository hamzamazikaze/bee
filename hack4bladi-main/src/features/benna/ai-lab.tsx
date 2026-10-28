"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CaretDown,
  ChatCircleText,
  Check,
  CircleNotch,
  ForkKnife,
  MapPin,
  PaperPlaneTilt,
  Plus,
  ShieldCheck,
  Sparkle,
  Waveform,
} from "@phosphor-icons/react";
import { PageShell } from "@/components/page-shell";
import { VoiceCapture } from "@/features/home/voice-capture";
import { cn } from "@/lib/utils";
import { ALLERGEN_LABEL, dishById, formatMad, todaysDishes, workplaceById } from "./data";
import { lineList, totals, useCart, useCartHydration } from "./cart";
import { CONCEPT_LABEL, dietConflicts, type Diet, type M3akAnswer } from "./m3ak";
import { M3akSheet } from "./m3ak-sheet";
import { toJpegBase64 } from "./photo";

/* ---------- Plumbing ---------- */

type Meta = { ms: number; source?: "ai" | "local" };

/** Runs one call and times it, so each step can show how fast the model answered. */
function useRun<T>() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const run = async (call: () => Promise<{ data: T; source?: "ai" | "local" }>) => {
    setBusy(true);
    setError(null);
    const started = performance.now();
    try {
      const { data, source } = await call();
      setResult(data);
      setMeta({ ms: Math.round(performance.now() - started), source });
    } catch (cause) {
      setResult(null);
      setMeta(null);
      setError(cause instanceof Error && cause.message ? cause.message : "Pas de réponse. Réessayez.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, result, error, meta, run };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => ({ error: "Pas de réponse. Réessayez." }))) as T & { error?: string };
  if (!response.ok || data.error) throw new Error(data.error ?? "Pas de réponse. Réessayez.");
  return data;
}

async function transcribe(audio: Blob): Promise<string | null> {
  const form = new FormData();
  form.append("audio", audio, "lab");
  const response = await fetch("/api/benna/transcribe", { method: "POST", body: form });
  const data = (await response.json()) as { text?: string };
  return data.text?.trim() || null;
}

/* ---------- Workflow shell: a row that opens into connected steps ---------- */

function Workflow({
  icon,
  photo,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  /** A dish photo leads the row; the icon becomes its badge. */
  photo?: string;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-start">
        <span className="relative shrink-0">
          {photo ? (
            <Image src={photo} alt="" width={112} height={112} className="size-14 rounded-2xl object-cover" />
          ) : null}
          <span
            className={cn(
              "grid place-items-center transition-colors",
              photo ? "ring-surface absolute -end-1.5 -bottom-1.5 size-7 rounded-full ring-2 [&>svg]:size-4" : "size-14 rounded-2xl [&>svg]:size-6",
              open ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary-ink",
            )}
          >
            {icon}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-semibold">{title}</span>
          <span className="text-muted-foreground block truncate text-[0.75rem]">{summary}</span>
        </span>
        <CaretDown aria-hidden className={cn("text-muted-foreground size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? <ol className="px-4 pb-4">{children}</ol> : null}
    </section>
  );
}

/** One step of a workflow: a numbered node on a connecting line; ticks when done. */
function Step({
  n,
  title,
  done,
  last = false,
  meta,
  busy,
  error,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  last?: boolean;
  meta?: Meta | null;
  busy?: boolean;
  error?: string | null;
  children?: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full text-[0.75rem] font-semibold transition-colors",
            done ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground",
          )}
        >
          {done ? <Check aria-hidden className="size-3.5" weight="bold" /> : n}
        </span>
        {!last ? <span className={cn("my-1 w-0.5 flex-1 rounded-full", done ? "bg-primary" : "bg-border")} /> : null}
      </div>
      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-4")}>
        <p className="flex items-center gap-2 pt-1 text-[0.875rem] font-semibold">
          <span className="min-w-0 flex-1">{title}</span>
          {busy ? (
            <CircleNotch aria-hidden className="text-muted-foreground size-4 animate-spin motion-reduce:animate-none" weight="bold" />
          ) : meta ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums",
                meta.source === "local" ? "bg-surface-muted text-muted-foreground" : "bg-saffron-soft text-saffron-ink",
              )}
            >
              {meta.source === "local" ? "hors ligne" : "IA"} · {meta.ms} ms
            </span>
          ) : null}
        </p>
        {children ? <div className="mt-2">{children}</div> : null}
        <p role="status" className="sr-only">
          {busy ? "En cours…" : error ? "" : meta ? "Réponse reçue." : ""}
        </p>
        {error ? (
          <p role="alert" className="text-danger mt-1.5 text-[0.8125rem]">
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Chips({ items, onPick, disabled }: { items: string[]; onPick: (value: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          dir="auto"
          disabled={disabled}
          onClick={() => onPick(item)}
          className="pressable border-border bg-background rounded-full border px-3 py-1.5 text-start text-[0.75rem] disabled:opacity-50"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function Tag({ children, tone = "soft" }: { children: ReactNode; tone?: "soft" | "red" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[0.75rem] font-medium",
        tone === "red" ? "bg-accent-red-soft text-accent-red" : "bg-primary-soft text-primary-ink",
      )}
    >
      {children}
    </span>
  );
}

function Understood({ request }: { request: M3akAnswer["request"] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {request.budgetMad !== null ? <Tag>≤ {request.budgetMad} DH</Tag> : null}
      {request.wants.map((concept) => (
        <Tag key={`w${concept}`}>Envie : {CONCEPT_LABEL[concept]}</Tag>
      ))}
      {request.excludes.map((concept) => (
        <Tag key={`x${concept}`} tone="red">
          Sans {CONCEPT_LABEL[concept]}
        </Tag>
      ))}
    </div>
  );
}

/** Dishes with a real + : this is where the AI hands over to the app (the cart). */
function AddList({ items, added, onAdd }: { items: { id: string; note?: string }[]; added: string[]; onAdd: (id: string) => void }) {
  return (
    <ul className="divide-border divide-y">
      {items.map(({ id, note }) => {
        const dish = dishById(id);
        if (!dish) return null;
        const inCart = added.includes(id);
        return (
          <li key={id} className="flex items-center gap-2.5 py-2">
            <Image src={dish.image} alt="" width={80} height={80} className="size-10 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-semibold">{dish.name}</span>
              <span className="text-muted-foreground block truncate text-[0.6875rem]">
                {note ? `${note} · ` : ""}
                {formatMad(dish.groupPrice)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onAdd(id)}
              aria-label={`Ajouter ${dish.name} au panier`}
              className={cn(
                "pressable grid size-8 shrink-0 place-items-center rounded-full",
                inCart ? "bg-primary-soft text-primary-ink" : "bg-primary text-primary-foreground",
              )}
            >
              {inCart ? <Check aria-hidden className="size-4" weight="bold" /> : <Plus aria-hidden className="size-4" weight="bold" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function GoTo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-10 items-center justify-between gap-2 rounded-full ps-4 pe-3 text-[0.8125rem] font-semibold"
    >
      <span className="min-w-0 truncate">{children}</span>
      <ArrowRight aria-hidden className="size-4 shrink-0 rtl:-scale-x-100" weight="bold" />
    </Link>
  );
}

/* ---------- The page ---------- */

const ORDER_PROMPTS = ["Salam, bghit chi haja b lkhodra, bla djaj, 35 DH", "بغيت طاجين بلا لحم"];
const DIET_PROMPTS = ["ma kanklch l7out, bghit chi haja khfifa", "أنا نباتي وعندي حساسية من الحليب"];
const SAMPLE_PHOTOS = ["tajine-poulet-citron", "couscous-7-legumes", "harira-dattes"];

/**
 * /ai — BENNA's main AI features as the workflows they actually are in the app: each one
 * starts with something said, written or photographed, goes through the model, and ends in
 * a real app action (cart, profile). Built to test and to show a jury.
 */
export function AiLab() {
  useCartHydration();
  const workplaceId = useCart((state) => state.workplaceId);
  const workplace = workplaceById(workplaceId);
  const diet = useCart((state) => state.diet);
  const setDiet = useCart((state) => state.setDiet);
  const orders = useCart((state) => state.orders);
  const quickAdd = useCart((state) => state.quickAdd);
  const cart = totals(lineList(useCart((state) => state.lines)));
  const history = [...orders].reverse().flatMap((order) => order.lines.map((line) => line.dishId)).slice(0, 12);

  const [openId, setOpenId] = useState<string | null>(null);
  const fold = (id: string) => ({ open: openId === id, onToggle: () => setOpenId((current) => (current === id ? null : id)) });
  const [added, setAdded] = useState<string[]>([]);
  const add = (id: string) => {
    quickAdd(id);
    setAdded((list) => [...list, id]);
  };
  const cartLabel = `Voir le panier · ${cart.count} plat${cart.count > 1 ? "s" : ""} · ${formatMad(cart.total)}`;

  /* 1. Order in Darija */
  const [orderText, setOrderText] = useState("");
  const [liveOpen, setLiveOpen] = useState(false);
  const order = useRun<M3akAnswer>();
  const askOrder = (text: string) => {
    setOrderText(text);
    void order.run(async () => {
      const data = await post<M3akAnswer>("/api/benna/m3ak", { text, workplaceId, diet });
      return { data, source: data.source };
    });
  };
  const orderAdded = order.result?.matches.some((match) => added.includes(match.id)) ?? false;

  /* 2. Profile → menu for you */
  const profile = useRun<Diet>();
  const picks = useRun<{ id: string; reason: string }[]>();
  const sayProfile = (text: string) =>
    void profile.run(async () => {
      const data = await post<{ diet: Diet; source: "ai" | "local" }>("/api/benna/diet", { text });
      const next: Diet = {
        excludes: [...new Set([...diet.excludes, ...data.diet.excludes])],
        allergens: [...new Set([...diet.allergens, ...data.diet.allergens])],
        preferences: [...new Set([...diet.preferences, ...data.diet.preferences])],
      };
      setDiet(next);
      // The next step runs on the profile just saved.
      void picks.run(async () => {
        const result = await post<{ picks: { id: string; reason: string }[]; source: "ai" | "local" }>("/api/benna/picks", {
          workplaceId,
          diet: next,
          history,
        });
        return { data: result.picks, source: result.source };
      });
      return { data: data.diet, source: data.source };
    });
  const today = todaysDishes(workplace);
  const ruledOut = today.filter((dish) => dietConflicts(dish, diet).length > 0);

  /* 3. Photo → dish of the day */
  const photo = useRun<M3akAnswer & { seen?: string | null }>();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const sendPhoto = (blob: Blob, preview: string) => {
    setPhotoUrl(preview);
    void photo.run(async () => {
      const base64 = await toJpegBase64(blob);
      const data = await post<M3akAnswer & { seen?: string | null }>("/api/benna/photo", {
        image: { base64, mimeType: "image/jpeg" },
        workplaceId,
        diet,
      });
      return { data, source: "ai" };
    });
  };
  const photoAdded = photo.result?.matches.some((match) => added.includes(match.id)) ?? false;

  return (
    <PageShell nav className="pb-8">
      <section className="bg-primary text-primary-foreground rounded-b-[2rem] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6">
        <h1 className="font-display flex items-center gap-2 text-[1.625rem] leading-tight font-semibold">
          <Sparkle aria-hidden className="size-6 shrink-0" weight="fill" />
          L&apos;IA comprend. L&apos;app agit.
        </h1>
        <p className="mt-1.5 text-[0.8125rem] leading-snug opacity-90">Plats et prix viennent toujours du menu du jour.</p>
      </section>

      <div className="mt-4 space-y-3 px-5">
        <Link href="/bienvenue" className="card flex items-center gap-2 px-4 py-2.5 text-[0.8125rem]">
          <MapPin aria-hidden className="text-accent-red size-4" weight="fill" />
          <span className="text-muted-foreground">Site :</span>
          <span className="min-w-0 flex-1 truncate font-semibold">{workplace?.name ?? "choisir un site"}</span>
        </Link>

        <div className="card divide-border divide-y overflow-hidden">
          <Workflow icon={<ChatCircleText aria-hidden weight="fill" />} title="Commander en darija" summary="Parlez, le panier se remplit" {...fold("order")}>
            <Step n={1} title="Dites ce qui vous fait envie" done={Boolean(orderText)}>
              <Chips items={ORDER_PROMPTS} onPick={askOrder} disabled={order.busy || !workplaceId} />
              <form
                className="border-border bg-background focus-within:ring-ring mt-2 flex items-center gap-1.5 rounded-full border p-1 ps-3 focus-within:ring-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (orderText.trim()) askOrder(orderText.trim());
                }}
              >
                <input
                  dir="auto"
                  name="demande"
                  aria-label="Votre demande"
                  value={orderText}
                  onChange={(event) => setOrderText(event.target.value)}
                  placeholder="Écrivez ou dictez…"
                  className="min-w-0 flex-1 bg-transparent text-[0.875rem] outline-none"
                />
                <VoiceCapture maxMs={15_000} transcribeWith={transcribe} onTranscript={(said) => askOrder(said)} />
                <button type="submit" aria-label="Envoyer" className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-full">
                  <PaperPlaneTilt aria-hidden className="size-4" weight="fill" />
                </button>
              </form>
              <button
                type="button"
                onClick={() => setLiveOpen(true)}
                className="text-primary-ink mt-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold"
              >
                <Waveform aria-hidden className="size-4" weight="bold" />
                Ou parlez en direct avec M3AK
              </button>
            </Step>
            <Step n={2} title="M3AK comprend" done={Boolean(order.result)} busy={order.busy} meta={order.meta} error={order.error}>
              {order.result ? <Understood request={order.result.request} /> : null}
            </Step>
            <Step n={3} title="Choisissez dans le menu du jour" done={orderAdded}>
              {order.result ? (
                order.result.matches.length ? (
                  <AddList items={order.result.matches.map((match) => ({ id: match.id, note: match.reasons[0] }))} added={added} onAdd={add} />
                ) : (
                  <p className="text-muted-foreground text-[0.8125rem]">Rien ne correspond aujourd&apos;hui.</p>
                )
              ) : null}
            </Step>
            <Step n={4} title="Commandez avec le groupe" done={false} last>
              {cart.count ? <GoTo href="/panier">{cartLabel}</GoTo> : null}
            </Step>
          </Workflow>

          <Workflow icon={<ForkKnife aria-hidden weight="fill" />} photo="/images/benna/bowl-lentilles-legumes.webp" title="Mon profil, mon menu" summary="Dites ce que vous évitez" {...fold("profile")}>
            <Step n={1} title="Dites ce que vous ne mangez pas" done={Boolean(profile.result)} busy={profile.busy} meta={profile.meta} error={profile.error}>
              <Chips items={DIET_PROMPTS} onPick={sayProfile} disabled={profile.busy} />
              {profile.result ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.result.excludes.map((value) => (
                    <Tag key={value} tone="red">
                      Sans {CONCEPT_LABEL[value]}
                    </Tag>
                  ))}
                  {profile.result.allergens.map((value) => (
                    <Tag key={value} tone="red">
                      Allergie : {ALLERGEN_LABEL[value]}
                    </Tag>
                  ))}
                </div>
              ) : null}
            </Step>
            <Step n={2} title="Enregistré, le menu s'adapte" done={Boolean(profile.result)}>
              {profile.result ? (
                <p className="text-muted-foreground text-[0.8125rem]">
                  <span className="text-foreground font-semibold tabular-nums">{today.length - ruledOut.length}</span> plats du jour
                  compatibles · <span className="tabular-nums">{ruledOut.length}</span> signalés hors profil
                </p>
              ) : null}
            </Step>
            <Step n={3} title="Vos 3 suggestions" done={Boolean(picks.result)} busy={picks.busy} meta={picks.meta} error={picks.error}>
              {picks.result ? (
                picks.result.length ? (
                  <AddList items={picks.result.map((pick) => ({ id: pick.id, note: pick.reason }))} added={added} onAdd={add} />
                ) : (
                  <p className="text-muted-foreground text-[0.8125rem]">Aucun plat du jour ne correspond à ce profil.</p>
                )
              ) : null}
            </Step>
            <Step n={4} title="Le menu du jour, filtré pour vous" done={false} last>
              {profile.result ? <GoTo href="/">Voir le menu du jour</GoTo> : null}
            </Step>
          </Workflow>

          <Workflow icon={<Camera aria-hidden weight="fill" />} photo="/images/benna/couscous-7-legumes.webp" title="Photo → plat du jour" summary="Montrez un plat, on le trouve" {...fold("photo")}>
            <Step n={1} title="Montrez un plat qui vous tente" done={Boolean(photoUrl)}>
              <div className="flex gap-2">
                {SAMPLE_PHOTOS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    disabled={photo.busy || !workplaceId}
                    aria-label={`Tester avec ${dishById(id)?.name ?? id}`}
                    onClick={async () => {
                      const url = `/images/benna/${id}.webp`;
                      const blob = await fetch(url)
                        .then((response) => response.blob())
                        .catch(() => null);
                      if (blob) sendPhoto(blob, url);
                    }}
                    className="pressable size-14 shrink-0 overflow-hidden rounded-xl disabled:opacity-50"
                  >
                    <Image src={`/images/benna/${id}.webp`} alt="" width={112} height={112} className="size-full object-cover" />
                  </button>
                ))}
                <label className="pressable border-border text-muted-foreground grid size-14 shrink-0 cursor-pointer place-items-center rounded-xl border border-dashed">
                  <Camera aria-hidden className="size-5" />
                  <span className="sr-only">Votre photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) sendPhoto(file, URL.createObjectURL(file));
                    }}
                  />
                </label>
              </div>
            </Step>
            <Step n={2} title="M3AK reconnaît le plat" done={Boolean(photo.result)} busy={photo.busy} meta={photo.meta} error={photo.error}>
              {photo.result ? (
                <div className="flex gap-2.5">
                  {photoUrl ? (
                    <Image src={photoUrl} alt="" width={96} height={96} unoptimized className="size-12 shrink-0 rounded-lg object-cover" />
                  ) : null}
                  <p className="text-[0.8125rem]">
                    On dirait <span className="font-semibold">« {photo.result.seen ?? "un plat"} »</span>
                  </p>
                </div>
              ) : null}
            </Step>
            <Step n={3} title="Le plus proche au menu du jour" done={photoAdded}>
              {photo.result ? (
                <AddList items={photo.result.matches.map((match) => ({ id: match.id, note: match.reasons[0] }))} added={added} onAdd={add} />
              ) : null}
            </Step>
            <Step n={4} title="Commandez avec le groupe" done={false} last>
              {cart.count ? <GoTo href="/panier">{cartLabel}</GoTo> : null}
            </Step>
          </Workflow>

        </div>

        <details className="bg-cream group rounded-2xl px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.875rem] font-semibold [&::-webkit-details-marker]:hidden">
            <ShieldCheck aria-hidden className="text-primary-ink size-5" weight="fill" />
            <span className="flex-1">Les garde-fous</span>
            <CaretDown aria-hidden className="text-muted-foreground size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-2 space-y-1.5 text-[0.8125rem] leading-snug">
            <li>Le modèle ne remplit que des formulaires fermés, vérifiés par le code (zod).</li>
            <li>Prix, économies, ingrédients et allergènes viennent du menu, jamais du modèle.</li>
            <li>Sans IA disponible, chaque parcours a un repli hors ligne.</li>
            <li>Les clés restent sur le serveur ; la voix en direct utilise un jeton à usage unique.</li>
            <li>Chaque route IA est limitée en débit. Données et paiements de démonstration.</li>
          </ul>
        </details>
      </div>

      <M3akSheet open={liveOpen} onClose={() => setLiveOpen(false)} />
    </PageShell>
  );
}
