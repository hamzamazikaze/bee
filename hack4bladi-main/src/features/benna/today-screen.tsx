"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretDown, CaretRight, Check, MapPin, Truck, UsersThree } from "@phosphor-icons/react";
import Image from "next/image";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import { ALLERGEN_LABEL, GROUP, KITCHENS, PARTICIPANTS, todaysDishes, workplaceById, type Dish } from "./data";
import { lineList, totals, useCart, useCartHydration } from "./cart";
import { CONCEPT_LABEL, dietConflicts, isEmptyDiet, isVegetarian } from "./m3ak";
import { AvatarStack, CUTOFF, Countdown, DishCard, StickyCta, useCutoffTime } from "./ui";

const ordered = PARTICIPANTS.filter((person) => person.status === "host" || person.status === "confirmed");

/** The hero's round bubbles: each filters today's menu; icons in public/images/icons (AI-illustrated). */
const CATEGORIES: { id: string; label: string; icon: string; keep: (dish: Dish) => boolean }[] = [
  { id: "tajines", label: "Tajines", icon: "tajine", keep: (dish) => /tajine|tanjia/i.test(dish.name) },
  { id: "couscous", label: "Couscous", icon: "couscous", keep: (dish) => /couscous|seffa|rfissa/i.test(dish.name) },
  { id: "vegetarien", label: "Végétarien", icon: "vegetarien", keep: (dish) => isVegetarian(dish) },
  { id: "leger", label: "Léger", icon: "leger", keep: (dish) => dish.tag === "healthy" },
  { id: "soupes", label: "Soupes", icon: "soupe", keep: (dish) => /harira|adass|bissara|loubia/i.test(dish.name) },
];

type Filter = { kind: "all" } | { kind: "category"; id: string } | { kind: "kitchen"; id: string };

function Tile({ label, icon, count, active, onClick }: { label: string; icon: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "pressable relative flex w-[5.25rem] flex-col items-center gap-1 rounded-2xl px-1 pt-2 pb-2.5 transition-colors",
          active ? "bg-saffron text-[#3d2700]" : "text-foreground bg-white",
        )}
      >
        <Image src={`/images/icons/${icon}.webp`} alt="" width={96} height={96} className="size-12" />
        <span className="text-[0.75rem] leading-tight font-medium whitespace-nowrap">{label}</span>
        {/* How many of today's dishes the tile leads to. */}
        <span
          aria-label={`${count} plats`}
          className={cn(
            "absolute top-1.5 end-1.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full px-1 text-[0.625rem] font-semibold tabular-nums",
            active ? "bg-[#3d2700] text-saffron" : "bg-primary-soft text-primary-ink",
          )}
        >
          {count}
        </span>
      </button>
    </li>
  );
}

export function TodayScreen() {
  const hydrated = useCartHydration();
  const router = useRouter();
  const workplace = workplaceById(useCart((state) => state.workplaceId));
  const lines = useCart((state) => state.lines);
  const joined = useCart((state) => state.joined !== null && state.joined === state.workplaceId);
  const join = useCart((state) => state.join);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const diet = useCart((state) => state.diet);
  const cart = totals(lineList(lines));
  const taken = PARTICIPANTS.length + (joined ? 1 : 0);
  const seatsLeft = GROUP.capacity - taken;

  useEffect(() => {
    if (hydrated && !workplace) router.replace("/bienvenue");
  }, [hydrated, workplace, router]);

  // Today's lunch rotation for this workplace's city; the bubbles and kitchen tiles filter it.
  const menu = todaysDishes(workplace);
  const kitchens = KITCHENS.filter((kitchen) => menu.some((dish) => dish.kitchenId === kitchen.id));
  // Only bubbles that lead somewhere today: an empty category is a dead end.
  const categories = CATEGORIES.filter((entry) => menu.some(entry.keep));
  const category = filter.kind === "category" ? CATEGORIES.find((entry) => entry.id === filter.id) : undefined;
  const kitchen = filter.kind === "kitchen" ? KITCHENS.find((entry) => entry.id === filter.id) : undefined;
  // Dishes that go against the profile sink to the bottom, marked; they are not hidden.
  const shown = menu
    .filter((dish) => (category ? category.keep(dish) : kitchen ? dish.kitchenId === kitchen.id : true))
    .map((dish) => ({ dish, warning: dietConflicts(dish, diet) }))
    .sort((a, b) => Number(a.warning.length > 0) - Number(b.warning.length > 0));
  const dietLabels = [
    ...diet.excludes.map((value) => `sans ${CONCEPT_LABEL[value]}`),
    ...diet.allergens.map((value) => `allergie ${ALLERGEN_LABEL[value]}`),
  ];
  const kitchenName = (dish: Dish) => KITCHENS.find((entry) => entry.id === dish.kitchenId)?.name.replace(/^Cuisine /, "");

  const pick = (next: Filter) => {
    const same =
      (next.kind === "category" && filter.kind === "category" && next.id === filter.id) ||
      (next.kind === "kitchen" && filter.kind === "kitchen" && next.id === filter.id);
    setFilter(same ? { kind: "all" } : next);
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const cutoff = useCutoffTime();
  const isActive = (id: string) => filter.kind === "category" && filter.id === id;

  return (
    <PageShell
      nav
      footer={
        cart.count > 0 ? (
          <StickyCta href="/panier" label="Voir le panier" count={cart.count} amount={cart.total} />
        ) : undefined
      }
    >
      {/* The hero: brand red, the site, the day's question, and today's food as tiles. */}
      <section className="bg-primary text-primary-foreground relative isolate overflow-hidden pb-14">
        {/* Zellige: an eight-point star lattice, faint, fading out before it reaches the title. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[url('/images/zellige.svg')] bg-[length:3.5rem] opacity-[0.14] [mask-image:linear-gradient(to_left,black_15%,transparent_75%)]"
        />
        <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <Link
            href="/bienvenue"
            className="flex h-9 w-fit max-w-full items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[0.875rem] font-semibold"
          >
            <MapPin aria-hidden className="size-4 shrink-0" weight="fill" />
            <span className="truncate">{workplace?.name.split(" · ")[0] ?? "Choisir mon site"}</span>
            <CaretDown aria-hidden className="size-3.5 shrink-0" weight="bold" />
          </Link>
        </div>

        <h1 className="font-display mt-8 px-5 text-[1.875rem] leading-[1.1] font-bold">
          Chno naklou
          <br />
          aujourd&apos;hui ?
        </h1>
        <p className="mt-2.5 px-5 text-[0.8125rem] opacity-90">
          {menu.length} plats · {kitchens.length} cuisines{cutoff ? ` · commandez avant ${cutoff}` : ""}
        </p>

        <ul aria-label="Catégories" className="mt-7 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {categories.map((entry) => (
            <Tile key={entry.id} {...entry} count={menu.filter(entry.keep).length} active={isActive(entry.id)} onClick={() => pick({ kind: "category", id: entry.id })} />
          ))}
        </ul>
      </section>

      {/* The group order, on a cream sheet that slides up over the hero's bottom edge. */}
      <div className="bg-background relative z-10 -mt-6 rounded-t-[1.75rem] px-5 pt-4">
        <section aria-label="Commande de groupe" className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <AvatarStack people={ordered} max={4} />
            <Countdown until={CUTOFF} className="h-7 px-2.5 text-[0.75rem]" />
          </div>
          <Link href="/groupe" className="mt-2.5 block">
            <h2 className="text-[1.0625rem] leading-tight font-semibold">Groupe de {GROUP.host}</h2>
            <p className="text-muted-foreground mt-1 flex min-w-0 items-center gap-1.5 text-[0.8125rem]">
              <Truck aria-hidden className="text-accent-red size-4 shrink-0" weight="fill" />
              <span className="shrink-0">
                Livraison <span className="text-foreground font-semibold tabular-nums">{GROUP.delivery}</span>
              </span>
              {workplace?.pickup ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">{workplace.pickup}</span>
                </>
              ) : null}
            </p>
          </Link>
          <div
            role="progressbar"
            aria-label="Places prises"
            aria-valuemin={0}
            aria-valuemax={GROUP.capacity}
            aria-valuenow={taken}
            className="bg-surface-muted mt-3 h-1.5 overflow-hidden rounded-full"
          >
            <div className="bg-primary h-full rounded-full" style={{ width: `${(taken / GROUP.capacity) * 100}%` }} />
          </div>
          <p className="text-muted-foreground mt-1.5 text-[0.75rem]">
            <span className="text-foreground font-semibold tabular-nums">{taken}</span> collègues ·{" "}
            <span className="tabular-nums">{seatsLeft}</span> places libres
          </p>
          {joined ? (
            <Link
              href="/groupe"
              className="bg-primary-soft text-primary-ink mt-3 flex h-11 items-center gap-2 rounded-full px-4 text-[0.875rem] font-semibold"
            >
              <Check aria-hidden className="size-4 shrink-0" weight="bold" />
              <span className="min-w-0 flex-1 truncate">Vous êtes inscrit</span>
              <span className="text-[0.8125rem] font-medium">Voir</span>
              <CaretRight aria-hidden className="size-4 rtl:rotate-180" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                join();
                document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="pressable bg-primary text-primary-foreground hover:bg-primary-hover mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold"
            >
              <UsersThree aria-hidden className="size-5" weight="fill" />
              Rejoindre la commande
            </button>
          )}
        </section>
      </div>

      {/* Today's kitchens: square tiles in a row, each one filters the menu to that kitchen. */}
      <section className="mt-6">
        <h2 className="font-display px-5 text-[1.125rem] font-semibold">Les cuisines du jour</h2>
        <ul className="mt-2.5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {kitchens.map((entry) => {
            const active = filter.kind === "kitchen" && filter.id === entry.id;
            return (
              <li key={entry.id} className="w-[5.75rem] shrink-0">
                <button type="button" onClick={() => pick({ kind: "kitchen", id: entry.id })} aria-pressed={active} className="pressable w-full text-center">
                  <span
                    className={cn(
                      "card block size-[5.75rem] overflow-hidden p-0 transition-shadow",
                      active && "ring-primary ring-2",
                    )}
                  >
                    <MediaCard src={entry.cover} alt="" ratio="fill" rounded="none" ornamentSeed={entry.id} sizes="92px" />
                  </span>
                  <span className="mt-1.5 line-clamp-2 block text-[0.75rem] leading-tight font-medium">
                    {entry.name.replace(/^Cuisine /, "")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="menu" className="mt-6 scroll-mt-4 px-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[1.125rem] font-semibold">
            {category ? category.label : kitchen ? kitchen.name.replace(/^Cuisine /, "") : "Au menu à midi"}
          </h2>
          {filter.kind !== "all" ? (
            <button type="button" onClick={() => setFilter({ kind: "all" })} className="text-primary-ink text-[0.8125rem] font-semibold">
              Tout voir
            </button>
          ) : (
            <span className="text-muted-foreground text-[0.75rem] tabular-nums">{menu.length} plats</span>
          )}
        </div>
        {!isEmptyDiet(diet) && dietLabels.length ? (
          <Link href="/compte" className="text-muted-foreground mt-1 block text-[0.75rem]">
            Selon votre profil : {dietLabels.join(" · ")} · <span className="text-primary-ink font-semibold">Modifier</span>
          </Link>
        ) : null}
        <ul className="mt-2.5 space-y-3">
          {shown.map(({ dish, warning }) => (
            <DishCard key={dish.id} dish={dish} kitchenName={kitchenName(dish)} warning={warning} />
          ))}
        </ul>
        {shown.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">Rien dans cette catégorie aujourd&apos;hui.</p>
        ) : null}
        <p className="text-muted-foreground pt-4 pb-6 text-[0.75rem]">Prix groupe, à côté du prix seul barré. Prix pilote indicatifs.</p>
      </section>
    </PageShell>
  );
}
