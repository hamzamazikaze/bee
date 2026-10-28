"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bag, Coins, CreditCard, MapPin, Minus, Money, Plus, Timer, Trash, Truck, type Icon } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GROUP, dishById, formatMad, kitchenById, optionLabels, workplaceById } from "./data";
import { POINTS, lineList, linePrice, pointsBalance, pointsEarned, rewardCost, rewardPoints, totals, useCart, useCartHydration, type Payment } from "./cart";
import { BackLink, useCutoffTime } from "./ui";

const PAYMENTS: { id: Payment; label: string; hint: string; icon: Icon }[] = [
  { id: "card", label: "Carte bancaire", hint: "Simulé pour la démo", icon: CreditCard },
  { id: "cash", label: "Espèces", hint: "Au retrait", icon: Money },
];

function Header({
  title = "Votre panier",
  onBack,
  backLabel = "Retour au panier",
  onClear,
}: {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  onClear?: () => void;
}) {
  return (
    <header className="bg-background sticky top-0 z-20 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
      <div className="flex items-center gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label={backLabel} className="pressable grid size-10 place-items-center rounded-full">
            <ArrowLeft aria-hidden className="size-5 rtl:-scale-x-100" weight="bold" />
          </button>
        ) : (
          <BackLink className="pressable grid size-10 place-items-center rounded-full" />
        )}
        <h1 className="font-display min-w-0 flex-1 text-[1.375rem] leading-tight font-semibold tracking-[-0.01em]">{title}</h1>
        {onClear ? (
          <button type="button" onClick={onClear} aria-label="Vider le panier" className="pressable text-muted-foreground hover:text-foreground grid size-10 place-items-center rounded-full">
            <Trash aria-hidden className="size-5" />
          </button>
        ) : null}
      </div>
      <p className="text-muted-foreground ps-12 text-[0.8125rem]">
        Groupe de {GROUP.host}
      </p>
    </header>
  );
}

/**
 * `onBack`/`onPlaced` let the QR page (/<site>) host the cart in place, so a jury member never
 * leaves that address; without them it is the /panier route.
 */
export function CartScreen({ onBack, onPlaced }: { onBack?: () => void; onPlaced?: (id: string) => void } = {}) {
  useCartHydration();
  const router = useRouter();
  const workplace = workplaceById(useCart((state) => state.workplaceId));
  const lineMap = useCart((state) => state.lines);
  const inc = useCart((state) => state.inc);
  const dec = useCart((state) => state.dec);
  const clear = useCart((state) => state.clear);
  const place = useCart((state) => state.place);
  const customer = useCart((state) => state.customer);
  // Only a QR guest without an account is asked who they are; a regular eater already has one.
  const guest = useCart((state) => state.guest && !state.account);
  const setCustomer = useCart((state) => state.setCustomer);
  const createAccount = useCart((state) => state.createAccount);
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [infoError, setInfoError] = useState<"name" | "phone" | null>(null);
  // Two light screens instead of one long one: what you order, then who you are and how you pay.
  // In-page step on purpose: a ?etape= URL would leave an emptied /panier behind the order in
  // the history, so "back" from the confirmation would land on an empty cart.
  const [checkout, setCheckout] = useState(false);
  // Set as the order is placed: the cart it empties must not flash "Votre panier est vide" on the way out.
  const [leaving, setLeaving] = useState(false);
  const [payment, setPayment] = useState<Payment>("card");
  const [usePoints, setUsePoints] = useState(false);
  const balance = pointsBalance(useCart((state) => state.orders));
  const cutoff = useCutoffTime();
  const lines = lineList(lineMap);
  const sum = totals(lines);
  const offered = rewardPoints(lines);
  const canRedeem = balance - offered >= POINTS.redeem;
  const discount = canRedeem && usePoints ? Math.min(POINTS.worth, sum.total) : 0;
  const toPay = sum.total - discount;
  // The keyboard's "OK" on the last field confirms too, so the button can stay under the keyboard.
  function confirmOrder() {
    const digits = phone.replace(/[\s.-]/g, "");
    if (guest && !name.trim()) return (setInfoError("name"), document.getElementById("prenom")?.focus());
    if (guest && digits && !/^(\+212|0)[5-7]\d{8}$/.test(digits)) return (setInfoError("phone"), document.getElementById("telephone")?.focus());
    setInfoError(null);
    setLeaving(true);
    if (guest) setCustomer({ name: name.trim(), phone: digits });
    const id = place(payment, canRedeem && usePoints);
    // A QR guest's account is created with the order: the points land at once.
    if (id && guest) createAccount();
    // replace: "back" from the order must not reopen the cart it just emptied.
    if (id && onPlaced) onPlaced(id);
    else if (id) router.replace(`/commande/${id}`);
    else setLeaving(false);
  }

  if (!lines.length && leaving) return <PageShell nav header={<Header />}>{null}</PageShell>;
  if (!lines.length) {
    return (
      <PageShell nav header={<Header onBack={onBack} backLabel="Retour aux plats" />} className="px-5">
        <section className="card mt-4 flex flex-col items-center px-6 py-10 text-center">
          <Bag aria-hidden className="text-primary-ink size-10" />
          <p className="mt-3 text-[1.0625rem] font-semibold">Votre panier est vide</p>
          {onBack ? (
            <button type="button" onClick={onBack} className={cn(buttonVariants(), "mt-5 rounded-full")}>
              Voir les plats
            </button>
          ) : (
            <Link href="/" className={cn(buttonVariants(), "mt-5 rounded-full")}>
              Voir le menu du jour
            </Link>
          )}
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell
      nav
      header={
        checkout ? (
          <Header title={guest ? "Vos informations" : "Paiement"} onBack={() => setCheckout(false)} />
        ) : (
          <Header onBack={onBack} backLabel="Retour aux plats" onClear={() => window.confirm("Vider le panier ?") && clear()} />
        )
      }
      className="space-y-4 px-5 pb-6"
      footer={
        checkout ? (
        <button
          type="button"
          onClick={confirmOrder}
          className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 w-full items-center justify-center rounded-full text-[0.9375rem] font-semibold"
        >
          Confirmer la commande
        </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCheckout(true);
              window.scrollTo(0, 0);
            }}
            className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 w-full items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold"
          >
            Continuer ·{" "}
            <span dir="ltr" className="tabular-nums">
              {formatMad(toPay)}
            </span>
          </button>
        )
      }
    >
      {checkout ? null : (
        <>
      <ul className="space-y-3">
        {lines.map((line) => {
          const dish = dishById(line.dishId);
          if (!dish) return null;
          const extras = optionLabels(dish, line.options);
          const price = linePrice(line);
          return (
            <li key={line.key} className="card overflow-hidden">
              {/* The dish leads: photo with its name on a dark fade, the way delivery apps show a plate. */}
              <div className="relative">
                <MediaCard src={dish.image} alt="" ratio="wide" rounded="none" ornamentSeed={dish.id} sizes="400px" />
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                  <p className="line-clamp-2 text-[1.0625rem] leading-snug font-semibold [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">{dish.name}</p>
                  <p className="truncate text-[0.75rem] text-white/80">
                    {kitchenById(dish.kitchenId)?.name}
                    {extras.length ? ` · ${extras.join(" · ")}` : ""}
                  </p>
                </div>
              </div>
              <div className="px-3.5 py-2">
                {line.note ? <p className="text-muted-foreground truncate text-[0.75rem] italic">« {line.note} »</p> : null}
                <div className="flex items-center justify-between gap-2">
                  {line.reward ? (
                    <p className="bg-saffron-soft text-saffron-ink inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold whitespace-nowrap">
                      <Coins aria-hidden className="size-4" weight="fill" />
                      Offert · <span className="tabular-nums">{rewardCost(dish.id)}</span> points
                    </p>
                  ) : (
                    <p dir="ltr" className="flex items-baseline gap-1.5 whitespace-nowrap rtl:justify-end">
                      <span className="text-[0.9375rem] font-semibold tabular-nums">{formatMad(price.group * line.qty)}</span>
                      <span className="text-muted-foreground text-[0.75rem] tabular-nums line-through max-[359px]:hidden">{formatMad(price.solo * line.qty)}</span>
                    </p>
                  )}
                  <span className="border-border flex items-center rounded-full border">
                    <button
                      type="button"
                      onClick={() => dec(line.key)}
                      aria-label={line.qty === 1 ? `Retirer ${dish.name}` : `Retirer une portion de ${dish.name}`}
                      className="pressable hover:bg-surface-muted grid size-11 place-items-center rounded-full"
                    >
                      <Minus aria-hidden className="size-3.5" weight="bold" />
                    </button>
                    <span aria-live="polite" className="w-5 text-center text-sm font-semibold tabular-nums">{line.qty}</span>
                    <button
                      type="button"
                      disabled={line.reward}
                      onClick={() => inc(line.key)}
                      aria-label={`Ajouter une portion de ${dish.name}`}
                      className="pressable hover:bg-surface-muted grid size-11 place-items-center rounded-full disabled:opacity-30"
                    >
                      <Plus aria-hidden className="size-3.5" weight="bold" />
                    </button>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="card p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[1.0625rem] font-semibold">À payer</h2>
          <p dir="ltr" className="text-[1.5rem] font-semibold tabular-nums">{formatMad(toPay)}</p>
        </div>
        {sum.saved > 0 ? (
          <p className="mt-1 flex items-center justify-between gap-2 text-[0.8125rem]">
            <span dir="ltr" className="text-muted-foreground tabular-nums line-through">{formatMad(sum.total + sum.saved)}</span>
            <span className="text-primary-ink font-semibold">
              Économie de groupe <span dir="ltr" className="tabular-nums">−{formatMad(sum.saved)}</span>
            </span>
          </p>
        ) : null}
        <p className="text-muted-foreground mt-3 flex items-center gap-2 text-[0.8125rem]">
          <Truck aria-hidden className="size-4 shrink-0" />
          Livraison groupée incluse
        </p>
        <div className="border-border mt-3 flex items-center gap-3 border-t pt-3">
          <span className="bg-saffron-soft text-saffron-ink grid size-9 shrink-0 place-items-center rounded-full">
            <Coins aria-hidden className="size-5" weight="fill" />
          </span>
          <span className="min-w-0 flex-1 text-[0.8125rem]">
            <span className="block font-semibold">
              {canRedeem ? (
                <>
                  Utiliser <span className="tabular-nums">{POINTS.redeem}</span> points ·{" "}
                  <span dir="ltr" className="tabular-nums">
                    −{formatMad(Math.min(POINTS.worth, sum.total))}
                  </span>
                </>
              ) : toPay > 0 ? (
                <>
                  +<span className="tabular-nums">{pointsEarned({ total: toPay })}</span> points avec cette commande
                </>
              ) : (
                <>
                  <span className="tabular-nums">{offered}</span> points échangés
                </>
              )}
            </span>
            <span className="text-muted-foreground block">
              <span className="tabular-nums">{balance - offered}</span> points{offered ? " restants" : ""} · démo
            </span>
          </span>
          {canRedeem ? (
            <button
              type="button"
              role="switch"
              aria-checked={usePoints}
              aria-label={`Utiliser ${POINTS.redeem} points`}
              onClick={() => setUsePoints(!usePoints)}
              className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", usePoints ? "bg-primary" : "bg-surface-muted")}
            >
              <span
                className={cn(
                  "bg-surface absolute top-1 size-5 rounded-full shadow-sm transition-[inset-inline-start]",
                  usePoints ? "start-6" : "start-1",
                )}
              />
            </button>
          ) : null}
        </div>
      </section>

      <section className="flex items-center gap-3 px-1">
        <MapPin aria-hidden className="text-accent-red size-5 shrink-0" weight="fill" />
        <span className="min-w-0 flex-1 text-[0.875rem]">
          <span className="block truncate font-medium">
            <span className="tabular-nums">{GROUP.delivery}</span> · {workplace?.pickup}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 text-[0.75rem]">
            <Timer aria-hidden className="size-3.5" />
            Modifiable jusqu&apos;à <span className="tabular-nums">{cutoff ?? "--:--"}</span>
          </span>
        </span>
      </section>

        </>
      )}

      {checkout ? (
        <>
          <p className="text-muted-foreground text-[0.875rem]">
            <span className="tabular-nums">{sum.count}</span> plat{sum.count > 1 ? "s" : ""} ·{" "}
            <span dir="ltr" className="text-foreground font-semibold tabular-nums">
              {formatMad(toPay)}
            </span>{" "}
            · livraison <span className="tabular-nums">{GROUP.delivery}</span>
          </p>
      {guest ? (
<section aria-labelledby="infos-titre">
        <h2 id="infos-titre" className="mb-2 text-[1rem] font-semibold">
          Vos informations
        </h2>
        <div className="card divide-border divide-y">
          <label className="focus-within:bg-surface-muted flex items-center gap-3 px-4 py-3 first:rounded-t-[inherit] last:rounded-b-[inherit]">
            <span className="w-24 shrink-0 text-[0.875rem] font-medium">Prénom</span>
            <input
              id="prenom"
              name="prenom"
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="next"
              onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), document.getElementById("telephone")?.focus())}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Yassine"
              aria-invalid={infoError === "name"}
              aria-describedby="infos-aide"
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none"
            />
          </label>
          <label className="focus-within:bg-surface-muted flex items-center gap-3 px-4 py-3 first:rounded-t-[inherit] last:rounded-b-[inherit]">
            <span className="w-24 shrink-0 text-[0.875rem] font-medium">
              Téléphone <span className="text-muted-foreground font-normal">(facultatif)</span>
            </span>
            <input
              id="telephone"
              name="telephone"
              enterKeyHint="go"
              onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), confirmOrder())}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="06 12 34 56 78"
              aria-invalid={infoError === "phone"}
              aria-describedby="infos-aide"
              dir="ltr"
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] tabular-nums outline-none rtl:text-end"
            />
          </label>
        </div>
        <p id="infos-aide" aria-live="polite" className={cn("mt-1.5 text-[0.75rem]", infoError ? "text-danger" : "text-muted-foreground")}>
          {infoError === "name"
            ? "Indiquez votre prénom pour qu'on mette votre nom sur le sac."
            : infoError === "phone"
              ? "Numéro marocain attendu, par exemple 06 12 34 56 78."
              : "Démo : ces informations restent sur ce téléphone."}
        </p>
      </section>
) : null}

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className={cn("mb-2 text-[1rem] font-semibold", !guest && "sr-only")}>Paiement</legend>
        {PAYMENTS.map(({ id, label, hint, icon: Icon }) => (
          <label
            key={id}
            className={cn(
              "card flex cursor-pointer flex-col gap-2 border-2 p-3 transition-colors has-[:focus-visible]:outline-2",
              payment === id ? "border-primary" : "border-transparent",
            )}
          >
            <input type="radio" name="payment" value={id} checked={payment === id} onChange={() => setPayment(id)} className="sr-only" />
            <Icon aria-hidden className={cn("size-7", payment === id ? "text-primary-ink" : "text-muted-foreground")} weight={payment === id ? "fill" : "regular"} />
            <span>
              <span className="block text-[0.875rem] leading-tight font-semibold">{label}</span>
              <span className="text-muted-foreground block text-[0.75rem]">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-muted-foreground text-center text-xs">Démo : aucun paiement réel, prix pilote indicatifs.</p>
        </>
      ) : null}
    </PageShell>
  );
}
