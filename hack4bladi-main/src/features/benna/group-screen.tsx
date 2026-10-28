"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bag, CaretRight, ForkKnife, MagnifyingGlass, Percent, Plus, Timer, Truck, UserPlus, UsersThree } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import { GROUP, PARTICIPANTS, PARTICIPANT_DISHES, dishById, formatMad, workplaceById, type Dish, type Participant } from "./data";
import { lineList, totals, useCart, useCartHydration } from "./cart";
import { isVegetarian } from "./m3ak";
import { Avatar, AvatarStack, CUTOFF, Countdown } from "./ui";

const STATUS_LINE: Record<Participant["status"], (items: number) => string> = {
  host: (items) => `Hôte · ${items} plat${items > 1 ? "s" : ""}`,
  confirmed: (items) => `Confirmé · ${items} plat${items > 1 ? "s" : ""}`,
  browsing: (items) => (items ? `Choisit · ${items} plat${items > 1 ? "s" : ""} au panier` : "Vient de rejoindre · choisit son plat"),
  invited: () => "Invité · pas encore ouvert",
};

/** A dish the group already ordered: photo, description, price, + adds it to my part. */
function GroupDish({ dish, takers, popular }: { dish: Dish; takers: number; popular: boolean }) {
  const lines = useCart((state) => state.lines);
  const quickAdd = useCart((state) => state.quickAdd);
  const qty = Object.values(lines).reduce((sum, line) => (line.dishId === dish.id ? sum + line.qty : sum), 0);
  const tag = popular ? "Le plus populaire" : isVegetarian(dish) ? "Végétarien" : null;

  return (
    <li className="flex gap-3 py-3">
      <Link href={`/plat/${dish.id}`} aria-hidden tabIndex={-1} className="block size-24 shrink-0">
        <MediaCard src={dish.image} alt="" ratio="fill" rounded="xl" ornamentSeed={dish.id} sizes="96px" />
      </Link>
      <Link href={`/plat/${dish.id}`} className="min-w-0 flex-1">
        <span className="line-clamp-1 text-[0.9375rem] leading-snug font-semibold">{dish.name}</span>
        <span className="text-muted-foreground mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug">{dish.description}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {tag ? (
            <span
              className={cn(
                "inline-flex h-5 items-center rounded-full px-2 text-[0.6875rem] font-semibold",
                popular ? "bg-saffron-soft text-saffron-ink" : "bg-primary-soft text-primary-ink",
              )}
            >
              {tag}
            </span>
          ) : null}
          <span className="text-muted-foreground text-[0.75rem]">
            pris par {takers} collègue{takers > 1 ? "s" : ""}
          </span>
        </span>
      </Link>
      <div className="flex shrink-0 flex-col items-end justify-between">
        <span dir="ltr" className="text-[0.9375rem] font-semibold tabular-nums">
          {formatMad(dish.groupPrice)}
        </span>
        <button
          type="button"
          onClick={() => quickAdd(dish.id)}
          aria-label={qty ? `Ajouter un autre ${dish.name} (${qty} au panier)` : `Ajouter ${dish.name} au panier`}
          className="pressable bg-primary text-primary-foreground hover:bg-primary-hover grid size-10 place-items-center rounded-full text-[0.875rem] font-semibold"
        >
          <span key={qty} className={qty ? "pop tabular-nums" : undefined}>
            {qty ? qty : <Plus aria-hidden className="size-4" weight="bold" />}
          </span>
        </button>
      </div>
    </li>
  );
}

/** Seats as one bar; the fill is the share of the group already in. */
function SeatsBar({ taken, className }: { taken: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label="Places prises"
      aria-valuemin={0}
      aria-valuemax={GROUP.capacity}
      aria-valuenow={taken}
      className={cn("bg-surface-muted h-2 overflow-hidden rounded-full", className)}
    >
      <div className="bg-primary h-full rounded-full" style={{ width: `${(taken / GROUP.capacity) * 100}%` }} />
    </div>
  );
}

export function GroupScreen() {
  useCartHydration();
  const workplace = workplaceById(useCart((state) => state.workplaceId));
  const lines = useCart((state) => state.lines);
  const orders = useCart((state) => state.orders);
  const join = useCart((state) => state.join);
  const joined = useCart((state) => state.joined !== null && state.joined === state.workplaceId);
  const cart = totals(lineList(lines));
  const placed = orders.find((order) => order.workplaceId === workplace?.id && !order.cancelled);
  const [tab, setTab] = useState<"dishes" | "people">("dishes");
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);

  const me: Participant | null = placed
    ? { id: "me", name: "Vous", initials: "VO", status: "confirmed", items: totals(placed.lines).count }
    : cart.count || joined
      ? { id: "me", name: "Vous", initials: "VO", status: "browsing", items: cart.count }
      : null;
  const people = me ? [me, ...PARTICIPANTS] : PARTICIPANTS;
  const host = PARTICIPANTS.find((person) => person.status === "host") ?? PARTICIPANTS[0];
  const myDishes = placed ? placed.lines.map((line) => line.dishId) : lineList(lines).map((line) => line.dishId);
  const dishesOf = (person: Participant) => (person.id === "me" ? myDishes : (PARTICIPANT_DISHES[person.id] ?? []));
  const price = (dishes: string[]) => dishes.reduce((sum, id) => sum + (dishById(id)?.groupPrice ?? 0), 0);

  // The group's dishes, most taken first: what colleagues ordered, one + away.
  const takers = new Map<string, number>();
  for (const person of PARTICIPANTS) for (const id of new Set(PARTICIPANT_DISHES[person.id] ?? [])) takers.set(id, (takers.get(id) ?? 0) + 1);
  const ranked = [...takers]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ dish: dishById(id), count }))
    .filter((entry): entry is { dish: Dish; count: number } => Boolean(entry.dish));
  const topId = ranked[0]?.dish.id;
  const needle = query.trim().toLowerCase();
  const groupDishes = ranked.filter((entry) => !needle || entry.dish.name.toLowerCase().includes(needle));
  // Computed from the menu's own prices, never claimed.
  const bestSaving = Math.max(0, ...ranked.map(({ dish }) => Math.round((1 - dish.groupPrice / dish.soloPrice) * 100)));
  const seatsLeft = GROUP.capacity - people.length;

  const hero = ranked[0]?.dish;
  const tabs = [
    { id: "dishes" as const, label: "Plats du groupe", icon: ForkKnife },
    { id: "people" as const, label: `Participants (${people.length})`, icon: UsersThree },
  ];
  const soft = "pressable bg-primary-soft text-primary-ink mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[0.9375rem] font-semibold";
  const strong =
    "pressable bg-primary text-primary-foreground hover:bg-primary-hover mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[0.9375rem] font-semibold";

  return (
    <PageShell
      nav
      footer={
        cart.count > 0 ? (
          <div className="bg-surface flex items-center gap-3 rounded-[1.25rem] p-2 ps-3 shadow-[0_-4px_24px_rgb(0_0_0/0.08)]">
            <span className="bg-primary-soft text-primary-ink relative grid size-11 shrink-0 place-items-center rounded-xl">
              <Bag aria-hidden className="size-5" />
              <span className="bg-primary text-primary-foreground absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full text-[0.6875rem] font-semibold tabular-nums">
                {cart.count}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-muted-foreground block truncate text-[0.75rem]">
                {cart.count} plat{cart.count > 1 ? "s" : ""}
              </span>
              <span dir="ltr" className="block text-[1rem] font-semibold whitespace-nowrap tabular-nums rtl:text-end">
                {formatMad(cart.total)}
              </span>
            </span>
            <Link
              href="/panier"
              className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 shrink-0 items-center gap-2 rounded-2xl px-4 text-[0.875rem] font-semibold whitespace-nowrap"
            >
              Voir ma commande
              <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" weight="bold" />
            </Link>
          </div>
        ) : undefined
      }
      className="pb-8"
    >
      <div className="relative h-64">
        {hero ? <MediaCard src={hero.image} alt="" ratio="fill" rounded="none" ornamentSeed={hero.id} sizes="430px" priority /> : null}
      </div>
      <section className="bg-surface relative mx-4 -mt-24 rounded-[1.75rem] p-5 shadow-[0_8px_30px_rgb(0_0_0/0.08)]">
        <AvatarStack people={people} max={4} size="md" />
        <h1 className="font-display mt-3 text-[1.75rem] leading-tight font-semibold tracking-[-0.01em]">Groupe de {GROUP.host}</h1>
        <p className="text-muted-foreground mt-1.5 flex items-center gap-2 text-[0.875rem]">
          <Avatar person={host} />
          <span>
            Organisé par <span className="text-foreground font-semibold">{GROUP.host}</span>
          </span>
        </p>
        <p className="mt-3 text-[0.9375rem] text-pretty">
          {placed
            ? "Votre part est confirmée. Elle part avec la commande du groupe."
            : me
              ? "Vous êtes dans le groupe. Choisissez vos plats avant la clôture."
              : "Déjeuner ensemble, livré au même endroit. Rejoignez le groupe pour commander au prix groupe."}
        </p>

        <div className="bg-background divide-border mt-4 divide-y rounded-2xl">
          <div className="flex items-center gap-3 px-3.5 py-3">
            <Truck aria-hidden className="size-6 shrink-0" />
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-semibold">
                Livraison <span className="tabular-nums">{GROUP.delivery}</span>
              </p>
              {workplace?.pickup ? <p className="text-muted-foreground truncate text-[0.8125rem]">{workplace.pickup}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3">
            <Timer aria-hidden className="text-primary-ink size-6 shrink-0" />
            <p className="min-w-0 flex-1 truncate text-[0.8125rem]">Clôture des commandes</p>
            <Countdown until={CUTOFF} prefix="" className="text-primary-ink h-auto shrink-0 bg-transparent px-0 text-[0.875rem] font-bold" />
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3">
            <UsersThree aria-hidden className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-2 text-[0.875rem]">
                <span>
                  <span className="font-semibold tabular-nums">
                    {people.length}/{GROUP.capacity}
                  </span>{" "}
                  collègues
                </span>
                <span className="text-muted-foreground text-[0.8125rem]">
                  <span className="tabular-nums">{seatsLeft}</span> places libres
                </span>
              </p>
              <SeatsBar taken={people.length} className="mt-2" />
            </div>
          </div>
        </div>

        {placed ? (
          <Link href={`/commande/${placed.id}`} className={strong}>
            Suivre ma commande ·{" "}
            <span dir="ltr" className="whitespace-nowrap tabular-nums">
              {formatMad(placed.total)}
            </span>
            <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" weight="bold" />
          </Link>
        ) : me ? (
          <a href="#plats" className={strong}>
            <ForkKnife aria-hidden className="size-4" weight="bold" />
            Choisir mes plats
          </a>
        ) : (
          <button type="button" onClick={join} className={strong}>
            <Plus aria-hidden className="size-4" weight="bold" />
            Rejoindre le groupe
          </button>
        )}
        <Link href="/groupe/inviter" className={soft}>
          <UserPlus aria-hidden className="size-4" weight="bold" />
          Inviter des collègues
        </Link>
      </section>

      {!me && !browsing ? (
        <section className="mt-6">
          <div className="flex items-center justify-between px-5">
            <h2 className="text-[1.0625rem] font-semibold">Au menu du groupe</h2>
            <button type="button" onClick={() => setBrowsing(true)} className="text-muted-foreground flex items-center gap-1 text-[0.8125rem] font-medium">
              Voir tout
              <CaretRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
            </button>
          </div>
          <ul className="mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {ranked.map(({ dish }) => (
              <li key={dish.id} className="w-36 shrink-0 snap-start">
                <Link href={`/plat/${dish.id}`} className="card block overflow-hidden">
                  <MediaCard src={dish.image} alt="" ratio="landscape" rounded="none" ornamentSeed={dish.id} sizes="144px" />
                  <span className="block px-2.5 pt-2 pb-2.5">
                    <span className="block truncate text-[0.875rem] font-semibold">{dish.name}</span>
                    <span dir="ltr" className="text-muted-foreground block text-[0.8125rem] tabular-nums rtl:text-end">
                      {formatMad(dish.groupPrice)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div id="plats" className="mt-4 scroll-mt-4 px-5">
        <div role="tablist" aria-label="Groupe" className="border-border mt-4 flex border-b">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`onglet-${id}`}
              aria-selected={tab === id}
              aria-controls={`panneau-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(event) => {
                // Two tabs: either arrow switches to the other one, in LTR and RTL alike.
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                const next = tabs[(tabs.findIndex((entry) => entry.id === id) + 1) % tabs.length].id;
                setTab(next);
                document.getElementById(`onglet-${next}`)?.focus();
              }}
              className={cn(
                "-mb-px flex flex-1 items-center justify-center gap-1.5 border-b-2 pb-2.5 text-[0.875rem] font-semibold transition-colors",
                tab === id ? "border-primary text-primary-ink" : "text-muted-foreground border-transparent",
              )}
            >
              <Icon aria-hidden className="size-4" weight={tab === id ? "fill" : "regular"} />
              {label}
            </button>
          ))}
        </div>

        {tab === "dishes" ? (
          <div role="tabpanel" id="panneau-dishes" aria-labelledby="onglet-dishes" className="mt-4">
            {bestSaving > 0 ? (
              <div className="bg-primary-soft flex items-center gap-3 rounded-2xl px-4 py-3">
                <span className="bg-primary/10 text-primary-ink grid size-10 shrink-0 place-items-center rounded-full">
                  <Percent aria-hidden className="size-5" weight="bold" />
                </span>
                <span className="min-w-0">
                  <span className="text-primary-ink block text-[0.9375rem] font-semibold">Prix groupe</span>
                  <span className="text-muted-foreground block text-[0.8125rem]">
                    Jusqu&apos;à <span dir="ltr">−{bestSaving} %</span> vs prix solo
                  </span>
                </span>
              </div>
            ) : null}
            <label className="bg-surface-muted focus-within:ring-ring mt-3 flex h-11 items-center gap-2 rounded-2xl px-3.5 focus-within:ring-2">
              <MagnifyingGlass aria-hidden className="text-muted-foreground size-4 shrink-0" />
              <span className="sr-only">Rechercher un plat</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un plat…"
                className="min-w-0 flex-1 bg-transparent text-[0.875rem] outline-none"
              />
            </label>
            {groupDishes.length ? (
              <ul className="divide-border mt-1 divide-y">
                {groupDishes.map(({ dish, count }) => (
                  <GroupDish key={dish.id} dish={dish} takers={count} popular={dish.id === topId} />
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground py-6 text-center text-[0.875rem]">Aucun plat du groupe ne correspond.</p>
            )}
          </div>
        ) : (
          <div role="tabpanel" id="panneau-people" aria-labelledby="onglet-people">
          <ul className="divide-border mt-1 divide-y">
            {people.map((person, index) => {
              const dishes = dishesOf(person);
              const done = person.status === "host" || person.status === "confirmed";
              return (
                <li key={person.id} className="flex min-h-16 items-center gap-3 py-3">
                  <Avatar person={person} index={index} size="md" confirmed={done} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-semibold">{person.name}</span>
                    <span className="text-muted-foreground block truncate text-[0.8125rem]">
                      {dishes.length ? dishes.map((id) => dishById(id)?.name).join(", ") : STATUS_LINE[person.status](person.items)}
                    </span>
                  </span>
                  {dishes.length ? (
                    <span dir="ltr" className="shrink-0 text-[0.875rem] font-semibold tabular-nums">
                      {formatMad(price(dishes))}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          </div>
        )}
        </div>
      )}
    </PageShell>
  );
}
