"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle, Coins, CookingPot, ThumbsDown, ThumbsUp, LockSimple, MapPin, Moped, type Icon } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { BrandMark, WordmarkArt } from "@/components/brand";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GROUP, ORDER_STEPS, PARTICIPANTS, PAYMENT_LABEL, dishById, formatMad, workplaceById } from "./data";
import { POINTS, pointsBalance, pointsEarned, totals, useCart, useCartHydration } from "./cart";
import { AvatarStack } from "./ui";

/** One icon per ORDER_STEPS entry, same order. */
const STEP_ICONS: Icon[] = [CheckCircle, LockSimple, CookingPot, Moped, MapPin];

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("fr-MA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" }).format(new Date(iso));

function Header({ id }: { id?: string }) {
  return (
    <header className="bg-background sticky top-0 z-20 flex items-start gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
      <Link href="/commandes" aria-label="Mes commandes" className="pressable grid size-10 shrink-0 place-items-center rounded-full">
        <ArrowLeft aria-hidden className="size-5 rtl:-scale-x-100" weight="bold" />
      </Link>
      <div className="min-w-0 pt-1">
        <h1 className="font-display text-[1.375rem] leading-tight font-semibold tracking-[-0.01em]">Commande</h1>
        {id ? <p dir="ltr" className="text-muted-foreground font-mono text-[0.875rem] rtl:text-end">#{id}</p> : null}
      </div>
    </header>
  );
}

/** Orders whose /live relay is in flight: one request at a time, whatever re-renders. */
const relaying = new Set<string>();

export function OrderScreen({ id }: { id: string }) {
  const hydrated = useCartHydration();
  const order = useCart((state) => state.orders.find((entry) => entry.id === id));
  const advance = useCart((state) => state.advance);
  const pickUp = useCart((state) => state.pickUp);
  const cancel = useCart((state) => state.cancel);
  const rate = useCart((state) => state.rate);
  const markRelayed = useCart((state) => state.markRelayed);

  // A QR guest's order goes to the presenter's /live board from here, not from the cart click,
  // so a dropped request is retried the next time this screen shows. Never blocks anything.
  const relayId = order?.customer && !order.cancelled && !order.relayed ? order.id : null;
  useEffect(() => {
    if (!relayId || relaying.has(relayId)) return;
    const pending = useCart.getState().orders.find((entry) => entry.id === relayId);
    const dishes = pending?.lines.filter((line) => !line.reward).map((line) => ({ id: line.dishId, qty: line.qty })) ?? [];
    if (!pending?.customer || !dishes.length) return;
    relaying.add(relayId);
    void fetch("/api/live", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: pending.customer.name, workplaceId: pending.workplaceId, dishes: dishes.slice(0, 3) }),
    })
      .then((response) => response.ok && markRelayed(relayId))
      .catch(() => null)
      .finally(() => relaying.delete(relayId));
  }, [relayId, markRelayed]);
  const balance = pointsBalance(useCart((state) => state.orders));
  const account = useCart((state) => state.account);

  if (!order) {
    return (
      <PageShell nav header={<Header />} className="px-5">
        {hydrated ? (
          <p className="text-muted-foreground mt-8 text-center text-sm">
            Cette commande n&apos;existe pas sur cet appareil.{" "}
            <Link href="/commandes" className="text-primary-ink font-semibold">
              Voir mes commandes
            </Link>
          </p>
        ) : null}
      </PageShell>
    );
  }

  const workplace = workplaceById(order.workplaceId);
  const step = Math.min(order.step, ORDER_STEPS.length - 1);
  const arrived = step === ORDER_STEPS.length - 1;
  const count = totals(order.lines).count;
  const first = dishById(order.lines[0]?.dishId ?? "");
  // Only times we actually know: when it was placed, and the group's delivery time.
  const timeOf = (index: number) => (index === 0 ? hhmm(order.at) : index === ORDER_STEPS.length - 1 ? GROUP.delivery : null);

  const done = Boolean(order.pickedUp) && !order.cancelled;
  const cta = "pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 w-full items-center justify-center rounded-full text-[0.9375rem] font-semibold";

  /* A QR guest's order ends on one screen: the Darija welcome with their name, then the points. Nothing to tap. */
  if (order.customer && !order.cancelled) {
    const fade = (delay: number) => ({
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
    });
    return (
      <PageShell className="px-6">
        <div className="flex min-h-[80vh] flex-col items-center text-center">
          <span className="mt-[max(1.5rem,env(safe-area-inset-top))] flex items-center gap-2">
            <BrandMark className="size-8" />
            <WordmarkArt className="text-brand-red h-5" />
          </span>
          <div className="flex flex-1 flex-col items-center justify-center">
          <p role="status" className="sr-only">
            Merci {order.customer.name}, votre commande est confirmée.
          </p>
          <motion.h1
            lang="ar"
            dir="rtl"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", bounce: 0.45, duration: 0.9 }}
            className="text-primary-ink font-[family-name:var(--font-marhey)] text-[3.25rem] leading-none font-normal"
          >
            مرحبا بيك
          </motion.h1>
          <motion.p {...fade(0.5)} className="font-display mt-3 text-[1.75rem] leading-tight font-semibold tracking-[-0.01em]">
            {order.customer.name}
          </motion.p>
          <motion.p lang="ar" dir="rtl" {...fade(0.9)} className="mt-6 font-[family-name:var(--font-marhey)] text-[2rem] leading-tight">
            أول كليان
          </motion.p>
          <motion.p {...fade(1.2)} className="text-muted-foreground mt-3 text-[0.875rem] text-balance">
            Vous faites partie des premiers clients de BENNA.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, type: "spring", bounce: 0.5 }}
            className="bg-saffron-soft text-saffron-ink mt-6 flex items-center gap-2 rounded-full px-4 py-2 text-[0.9375rem] font-semibold"
          >
            <Coins aria-hidden className="size-5" weight="fill" />
            <span>
              +<span className="tabular-nums">{pointsEarned(order)}</span> points ajoutés
            </span>
          </motion.p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      nav
      header={<Header id={order.id} />}
      footer={
        order.cancelled ? undefined : done ? (
          <Link href="/" className={cta}>
            Voir le menu du jour
          </Link>
        ) : arrived ? (
          <button type="button" onClick={() => pickUp(order.id)} className={cta}>
            J&apos;ai récupéré mon repas
          </button>
        ) : undefined
      }
      className="space-y-4 px-5 pb-8"
    >
      <section>
        <MediaCard
          src={first?.image ?? ""}
          alt=""
          ratio="landscape"
          rounded="xl"
          ornamentSeed={order.id}
          sizes="430px"
          priority
          className={cn(order.cancelled && "opacity-50 grayscale")}
        />
        <p role="status" className={cn("font-display mt-4 text-[1.375rem] leading-tight font-semibold text-balance", order.cancelled ? "text-muted-foreground" : "text-primary-ink")}>
          {order.cancelled
            ? "Commande annulée. Rien ne vous sera facturé."
            : order.pickedUp
              ? "Repas récupéré. Bon appétit avec vos collègues !"
              : arrived
                ? "C'est arrivé. Bssaha !"
                : order.customer
                  ? `Merci ${order.customer.name} ! Votre commande est confirmée.`
                  : "Commande confirmée. Bssaha !"}
        </p>
        <p className="text-muted-foreground mt-1 truncate text-[0.875rem]">
          {count} plat{count > 1 ? "s" : ""} · <span dir="ltr" className="text-foreground font-semibold tabular-nums">{formatMad(order.total)}</span> ·{" "}
          {order.lines.map((line) => dishById(line.dishId)?.name).join(", ")}
        </p>
      </section>

      {order.step === 0 && !order.cancelled ? (
        <button
          type="button"
          onClick={() => window.confirm("Annuler cette commande ?") && cancel(order.id)}
          className="border-border hover:border-primary flex h-11 w-full items-center justify-center rounded-full border text-[0.875rem] font-semibold"
        >
          Annuler la commande
        </button>
      ) : null}
      {done ? (
        <>
          <section aria-label="Points gagnés" className="bg-saffron-soft rounded-2xl p-4">
            <p className="flex items-center gap-2 text-[1.0625rem] font-semibold">
              <Coins aria-hidden className="text-saffron-ink size-6 shrink-0" weight="fill" />
              <span>
                +<span className="tabular-nums">{pointsEarned(order)}</span> points ajoutés
              </span>
            </p>
            <div className="bg-surface/70 mt-3 h-2 overflow-hidden rounded-full" aria-hidden>
              <div
                className="bg-saffron h-full rounded-full"
                style={{ width: `${balance >= POINTS.redeem ? 100 : (balance / POINTS.redeem) * 100}%` }}
              />
            </div>
            <p className="text-saffron-ink mt-2 text-[0.8125rem] font-medium">
              <span className="tabular-nums">{balance}</span> points ·{" "}
              {balance >= POINTS.redeem ? (
                <>
                  <span dir="ltr" className="tabular-nums">
                    −{formatMad(POINTS.worth)}
                  </span>{" "}
                  disponible au panier
                </>
              ) : (
                <>
                  encore <span className="tabular-nums">{POINTS.redeem - balance}</span> pour{" "}
                  <span dir="ltr" className="tabular-nums">
                    −{formatMad(POINTS.worth)}
                  </span>
                </>
              )}
            </p>
          </section>

          <section aria-label="Votre avis" className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-[0.9375rem] font-semibold">{order.rating ? "Merci pour votre avis !" : "Ça vous a plu ?"}</p>
            {(["up", "down"] as const).map((value) => {
              const Thumb = value === "up" ? ThumbsUp : ThumbsDown;
              const on = order.rating === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  aria-label={value === "up" ? "J'ai aimé" : "Je n'ai pas aimé"}
                  onClick={() => rate(order.id, value)}
                  className={cn(
                    "pressable grid size-12 place-items-center rounded-full border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground",
                  )}
                >
                  <Thumb aria-hidden className="size-5" weight={on ? "fill" : "regular"} />
                </button>
              );
            })}
          </section>
        </>
      ) : null}

      <section className={cn("card px-4 pt-4 pb-1", done && "hidden")} aria-label="Suivi de la livraison">
        <ol>
          {ORDER_STEPS.map((entry, index) => {
            const done = index <= step;
            const current = index === step;
            const StepIcon = STEP_ICONS[index] ?? CheckCircle;
            const time = timeOf(index);
            return (
              <li key={entry.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      done ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground",
                      current && !arrived && "ring-primary/20 ring-4",
                    )}
                  >
                    <StepIcon aria-hidden className="size-[1.125rem]" weight={done ? "fill" : "regular"} />
                  </span>
                  {index < ORDER_STEPS.length - 1 ? (
                    <span className={cn("my-1 w-0.5 flex-1", index < step ? "bg-primary" : "bg-border")} />
                  ) : null}
                </div>
                <div className="min-w-0 pt-1.5 pb-5">
                  <p className={cn("text-[0.9375rem] font-semibold", !done && "text-muted-foreground")}>
                    {entry.label}
                    <span className="sr-only">{done ? " (fait)" : " (à venir)"}</span>
                  </p>
                  {time ? <p className="text-muted-foreground text-[0.75rem] tabular-nums">{time}</p> : null}
                  {current ? (
                    <p className="text-muted-foreground mt-0.5 text-[0.8125rem]">
                      {arrived ? `${entry.detail} ${workplace?.pickup}.` : entry.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {!arrived && !order.cancelled ? (
          <button
            type="button"
            onClick={() => advance(order.id)}
            className="border-border hover:border-primary text-muted-foreground mb-3 rounded-full border px-4 py-2 text-[0.75rem] font-medium"
          >
            Démo · étape suivante
          </button>
        ) : null}
      </section>

      <ul className="divide-border divide-y text-[0.875rem]">
        <li className="flex items-center gap-3 py-3">
          <MapPin aria-hidden className="text-accent-red size-5 shrink-0" weight="fill" />
          <span className="min-w-0 truncate font-medium">
            <span className="tabular-nums">{GROUP.delivery}</span> · {workplace?.pickup}
          </span>
        </li>
        <li className="flex items-center gap-3 py-3">
          <AvatarStack people={PARTICIPANTS} max={4} />
          <span className="text-muted-foreground min-w-0">
            Livré avec <span className="tabular-nums">{PARTICIPANTS.filter((person) => person.status !== "invited").length}</span> collègues
          </span>
        </li>
        {order.cancelled || done ? null : (
          <li className="flex items-center gap-3 py-3">
            <Coins aria-hidden className="text-saffron-ink size-5 shrink-0" weight="fill" />
            <span className="min-w-0 flex-1">
              +<span className="tabular-nums">{pointsEarned(order)}</span> points{order.customer && !account ? " en attente" : ""}
              {order.pointsUsed ? (
                <span className="text-muted-foreground">
                  {" "}
                  · <span className="tabular-nums">{order.pointsUsed}</span> utilisés
                  {order.discount ? (
                    <>
                      {" "}
                      (
                      <span dir="ltr" className="tabular-nums">
                        −{formatMad(order.discount)}
                      </span>
                      )
                    </>
                  ) : null}
                </span>
              ) : null}
            </span>
          </li>
        )}
        <li className="flex items-center justify-between gap-3 py-3">
          <span className="text-muted-foreground">{PAYMENT_LABEL[order.payment]}</span>
          <span className="text-primary-ink font-semibold">
            Économie <span dir="ltr" className="tabular-nums">−{formatMad(order.saved)}</span>
          </span>
        </li>
      </ul>

      {done ? null : (
        <Link href="/" className={cn(buttonVariants({ variant: "outline", block: true }), "rounded-full")}>
          Retour au menu du jour
        </Link>
      )}
    </PageShell>
  );
}
