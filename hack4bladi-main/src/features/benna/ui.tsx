"use client";

import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { ViewTransition } from "@/components/view-transition";
import { cn } from "@/lib/utils";
import { GROUP, TAG_LABEL, formatMad, type Dish, type Kitchen, type Participant, type Tag } from "./data";
import { useCart } from "./cart";

/* ---------- Back ---------- */

/** True when the previous history entry is inside the app, so "back" will not leave it. */
function canGoBack() {
  const nav = (window as { navigation?: { canGoBack: boolean } }).navigation;
  // ponytail: history.length also counts a page outside the app; the Navigation API does not.
  return nav ? nav.canGoBack : window.history.length > 1;
}

/** Back to where the eater came from (plat opened from Groupe → Groupe), else `fallback`. */
export function useGoBack(fallback = "/") {
  const router = useRouter();
  return () => (canGoBack() ? router.back() : router.push(fallback));
}

export function BackLink({ fallback = "/", label = "Retour", className }: { fallback?: string; label?: string; className?: string }) {
  const goBack = useGoBack(fallback);
  return (
    <Link
      href={fallback}
      aria-label={label}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        goBack();
      }}
    >
      <ArrowLeft aria-hidden className="size-5 rtl:-scale-x-100" weight="bold" />
    </Link>
  );
}

/* ---------- Labels ---------- */

const TAG_TONE: Record<Tag, string> = {
  "fait-maison": "bg-accent-red-soft text-accent-red",
  healthy: "bg-primary-soft text-primary-ink",
  nouveau: "bg-saffron-soft text-saffron-ink",
  populaire: "bg-saffron text-[#3d2700]",
};

/** A small tinted pill: Fait maison, Healthy, −30%… */
export function MonoTag({ tone, children, className }: { tone: Tag; children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[0.75rem] font-medium",
        TAG_TONE[tone],
        className,
      )}
    >
      {children ?? TAG_LABEL[tone]}
    </span>
  );
}

export function StatusBadge({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[0.75rem] font-semibold",
        open ? "bg-saffron text-[#3d2700]" : "bg-accent-red-soft text-accent-red",
      )}
    >
      {open ? "Ouvert" : "Clôturé"}
    </span>
  );
}

/* ---------- Time ---------- */

// ponytail: the cutoff restarts at +47 min on each page load — a live clock for the pitch,
// not a schedule. The real cutoff comes from the group record in Phase 6.
export const CUTOFF = Date.now() + GROUP.cutoffInMinutes * 60_000;

/** Live "CLÔTURE DANS 46M 12S". Renders a placeholder until mounted (no hydration drift). */
export function Countdown({ until, className, prefix = "Clôture dans " }: { until: number; className?: string; prefix?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const left = now === null ? null : Math.max(0, until - now);
  const minutes = left === null ? "--" : String(Math.floor(left / 60000));
  const seconds = left === null ? "--" : String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  const urgent = left !== null && left < 10 * 60000;

  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[0.8125rem] font-semibold whitespace-nowrap tabular-nums",
        urgent ? "bg-accent-red text-white" : "bg-primary text-primary-foreground",
        className,
      )}
      dir="ltr"
      role="timer"
      aria-live="off"
    >
      {left === 0 ? "Commande clôturée" : `${prefix}${minutes} min ${seconds} s`}
    </span>
  );
}

/* ---------- People ---------- */

const AVATAR_TONES = [
  "bg-primary-soft text-primary-ink",
  "bg-saffron-soft text-saffron-ink",
  "bg-accent-red-soft text-accent-red",
  "bg-muted text-foreground",
];

export function Avatar({
  person,
  index = 0,
  size = "sm",
  confirmed = false,
}: {
  person: Pick<Participant, "initials" | "photo">;
  index?: number;
  size?: "sm" | "md";
  confirmed?: boolean;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      {person.photo ? (
        <Image
          src={person.photo}
          alt=""
          aria-hidden
          width={96}
          height={96}
          className={cn("ring-surface rounded-full object-cover ring-2", size === "sm" ? "size-8" : "size-11")}
        />
      ) : (
        <span
          className={cn(
            "ring-surface grid place-items-center rounded-full font-semibold ring-2",
            size === "sm" ? "size-8 text-[0.6875rem]" : "size-11 text-[0.8125rem]",
            AVATAR_TONES[index % AVATAR_TONES.length],
          )}
          aria-hidden
        >
          {person.initials}
        </span>
      )}
      {confirmed ? (
        <span className="bg-primary text-primary-foreground ring-background absolute -end-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full ring-2">
          <Check aria-hidden className="size-2.5" weight="bold" />
        </span>
      ) : null}
    </span>
  );
}

export function AvatarStack({ people, max = 4, size = "sm", className }: { people: Participant[]; max?: number; size?: "sm" | "md"; className?: string }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={cn("flex items-center", className)}>
      {shown.map((person, index) => (
        <span key={person.id} className={index > 0 ? "-ms-1.5" : undefined}>
          <Avatar person={person} index={index} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span dir="ltr" className={cn("bg-foreground text-background ring-surface -ms-1.5 grid place-items-center rounded-full font-mono ring-2", size === "sm" ? "size-8 text-[0.6875rem]" : "size-11 text-[0.8125rem]")}>
          +{rest}
        </span>
      ) : null}
    </span>
  );
}

/* ---------- Controls ---------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  label: string;
}) {
  const pill = useId();
  return (
    <div role="tablist" aria-label={label} className="bg-surface-muted inline-flex rounded-full p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "pressable relative h-8 rounded-full px-4 text-[0.8125rem] font-medium transition-colors",
            value === option.id ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {value === option.id ? (
            <motion.span
              layoutId={pill}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="bg-background absolute inset-0 rounded-full shadow-sm"
            />
          ) : null}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Sharebite's pill: action on the left, the money on the right. Lives in PageShell's footer. */
export function StickyCta({
  href,
  label,
  count,
  amount,
}: {
  href: string;
  label: string;
  count?: number;
  amount: number;
}) {
  return (
    <Link
        href={href}
        className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 items-center gap-3 rounded-full ps-4 pe-5 shadow-[0_10px_24px_-10px_rgba(168,6,15,0.45)]"
      >
        {count ? (
          <span key={count} className="pop bg-primary-foreground text-primary grid size-6 place-items-center rounded-full font-mono text-xs font-medium">
            {count}
          </span>
        ) : null}
        <span className="flex-1 text-[0.9375rem] font-semibold">{label}</span>
        <span dir="ltr" className="font-mono text-[0.9375rem] tabular-nums">{formatMad(amount)}</span>
    </Link>
  );
}

/* ---------- Food ---------- */

export function KitchenCard({ kitchen, eaters, dishCount }: { kitchen: Kitchen; eaters: Participant[]; dishCount: number }) {
  return (
    <article className="w-[16.5rem] shrink-0">
      <div className="relative">
        <MediaCard src={kitchen.cover} alt="" ratio="landscape" rounded="lg" ornamentSeed={kitchen.id} sizes="264px" />
        <span className="bg-background/95 absolute end-2 bottom-2 flex items-center gap-1.5 rounded-full py-0.5 ps-0.5 pe-2 shadow-sm">
          <AvatarStack people={eaters} max={3} />
          <span className="sr-only">{eaters.length} collègues ont commandé ici</span>
        </span>
      </div>
      <h3 className="mt-2.5 text-[0.9375rem] leading-tight font-semibold">{kitchen.name}</h3>
      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[0.8125rem]">{kitchen.blurb}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <MonoTag tone={kitchen.tag} />
        <span className="text-muted-foreground text-xs">
          {kitchen.district} · {dishCount} plats
        </span>
      </div>
    </article>
  );
}

/** Text left, photo right, hairline below — the reference menu row. */
export function DishListItem({ dish }: { dish: Dish }) {
  const lines = useCart((state) => state.lines);
  const quickAdd = useCart((state) => state.quickAdd);
  const qty = Object.values(lines).reduce((sum, line) => (line.dishId === dish.id ? sum + line.qty : sum), 0);
  const saving = Math.round((1 - dish.groupPrice / dish.soloPrice) * 100);

  return (
    <li className="border-border flex gap-4 border-b py-4 last:border-b-0">
      <Link href={`/plat/${dish.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[0.9375rem] leading-snug font-semibold">{dish.name}</h3>
        </div>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-[0.8125rem] leading-snug">{dish.description}</p>
        <p dir="ltr" className="mt-2 flex items-center gap-2 whitespace-nowrap rtl:justify-end">
          <span className="text-[0.875rem] font-semibold tabular-nums">{formatMad(dish.groupPrice)}</span>
          <span className="text-muted-foreground text-xs tabular-nums line-through">{formatMad(dish.soloPrice)}</span>
          <span className="text-accent-red font-mono text-[0.6875rem]">−{saving}%</span>
        </p>
        {dish.tag ? <MonoTag tone={dish.tag} className="mt-2" /> : null}
      </Link>
      <div className="relative w-[6.5rem] shrink-0 self-start">
        <Link href={`/plat/${dish.id}`} tabIndex={-1} aria-hidden>
          <ViewTransition name={`dish-${dish.id}`} share="dish" default="none">
            <MediaCard src={dish.image} alt="" ratio="square" rounded="lg" ornamentSeed={dish.id} sizes="104px" />
          </ViewTransition>
        </Link>
        <button
          type="button"
          onClick={() => quickAdd(dish.id)}
          aria-label={qty ? `Ajouter un autre ${dish.name} (${qty} au panier)` : `Ajouter ${dish.name} au panier`}
          className={cn(
            "pressable absolute end-1.5 bottom-1.5 grid size-9 place-items-center rounded-full",
            qty ? "bg-primary text-primary-foreground font-mono text-xs font-medium" : "bg-background text-foreground shadow-md",
          )}
        >
          <span key={qty} className={qty ? "pop" : undefined}>
            {qty ? qty : <Plus aria-hidden className="size-4" weight="bold" />}
          </span>
        </button>
      </div>
    </li>
  );
}

/* ---------- Today ---------- */

const hhmm = (at: number) =>
  new Intl.DateTimeFormat("fr-MA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" }).format(at);
const noop = () => () => {};

/** "10:47": the group's cutoff, client-only (CUTOFF is relative to page load). */
export function useCutoffTime(): string | null {
  return useSyncExternalStore(noop, () => hhmm(CUTOFF), () => null);
}

/** A menu row: square photo on the left, name, kitchen, description and price on the right, + to add. */
export function DishCard({ dish, kitchenName, warning = [] }: { dish: Dish; kitchenName?: string; warning?: string[] }) {
  const lines = useCart((state) => state.lines);
  const quickAdd = useCart((state) => state.quickAdd);
  const qty = Object.values(lines).reduce((sum, line) => (line.dishId === dish.id ? sum + line.qty : sum), 0);

  return (
    <li className="card flex gap-3 p-2.5">
      {/* Width and height both explicit: the photo column never depends on aspect-ratio maths
          (iOS WebKit collapsed an aspect-only box here before). */}
      <Link href={`/plat/${dish.id}`} className="relative block size-[6.75rem] shrink-0 self-start">
        <ViewTransition name={`dish-${dish.id}`} share="dish" default="none">
          <MediaCard src={dish.image} alt="" ratio="fill" rounded="xl" ornamentSeed={dish.id} sizes="108px" />
        </ViewTransition>
        {dish.tag ? (
          <MonoTag tone={dish.tag} className="absolute start-1.5 top-1.5 h-5 px-2 text-[0.6875rem] shadow-sm" />
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/plat/${dish.id}`} className="min-w-0">
          <h3 className="line-clamp-2 text-[0.9375rem] leading-snug font-semibold">{dish.name}</h3>
          {kitchenName ? <p className="text-muted-foreground truncate text-[0.75rem]">Chez {kitchenName}</p> : null}
          {warning.length ? (
            <p className="text-danger mt-0.5 text-[0.75rem] font-medium">Contient : {warning.join(", ")} · hors profil</p>
          ) : (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug">{dish.description}</p>
          )}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <p dir="ltr" className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[1rem] font-semibold tabular-nums">{formatMad(dish.groupPrice)}</span>
            <span className="text-muted-foreground text-[0.75rem] tabular-nums line-through">{formatMad(dish.soloPrice)}</span>
          </p>
          <button
            type="button"
            onClick={() => quickAdd(dish.id)}
            aria-label={qty ? `Ajouter un autre ${dish.name} (${qty} au panier)` : `Ajouter ${dish.name} au panier`}
            className="pressable bg-primary text-primary-foreground hover:bg-primary-hover grid size-9 shrink-0 place-items-center rounded-full text-[0.875rem] font-semibold"
          >
            <span key={qty} className={qty ? "pop tabular-nums" : undefined}>
              {qty ? qty : <Plus aria-hidden className="size-4" weight="bold" />}
            </span>
          </button>
        </div>
      </div>
    </li>
  );
}
