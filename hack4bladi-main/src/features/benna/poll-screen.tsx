"use client";

import { useState } from "react";
import { Check, CheckCircle } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import { dishById, kitchenById, type Dish } from "./data";

/** Tomorrow's candidates with demo vote counts (from PR #35): nothing is sent anywhere. */
const CANDIDATES: [string, number][] = [
  ["tajine-poulet-citron", 456],
  ["pastilla-poulet", 324],
  ["couscous-7-legumes", 287],
  ["seffa-poulet", 198],
  ["rfissa", 142],
];
const MEALS = CANDIDATES.map(([id, votes]) => ({ dish: dishById(id), votes })).filter((entry): entry is { dish: Dish; votes: number } => Boolean(entry.dish));

/** Vote for tomorrow's menu: one choice, then a thank-you. */
export function PollScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const choice = MEALS.find((entry) => entry.dish.id === selected)?.dish;

  if (voted && choice) {
    const fade = (delay: number) => ({
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
    });
    return (
      <PageShell nav className="px-6">
        <div className="flex min-h-[75vh] flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", bounce: 0.45, duration: 0.8 }}
            className="relative"
          >
            <MediaCard src={choice.image} alt="" ratio="square" rounded="none" ornamentSeed={choice.id} className="size-36 rounded-full" sizes="144px" />
            <span className="bg-primary text-primary-foreground ring-background absolute end-0 bottom-0 grid size-11 place-items-center rounded-full ring-4">
              <CheckCircle aria-hidden className="size-7" weight="fill" />
            </span>
          </motion.div>
          <motion.h1 role="status" {...fade(0.3)} className="font-display mt-6 text-[1.625rem] leading-tight font-semibold tracking-[-0.01em] text-balance">
            Merci d&apos;être avec la communauté
          </motion.h1>
          <motion.p {...fade(0.5)} className="text-muted-foreground mt-2 text-[0.9375rem] text-balance">
            Votre choix aide à décider le menu de demain.
          </motion.p>
          <motion.p {...fade(0.7)} className="bg-primary-soft text-primary-ink mt-5 rounded-full px-4 py-2 text-[0.875rem] font-semibold">
            Votre vote : {choice.name}
          </motion.p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      nav
      className="px-5 pb-8"
      footer={
        selected && !voted ? (
          <button
            type="button"
            onClick={() => setVoted(true)}
            className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 w-full items-center justify-center rounded-full text-[0.9375rem] font-semibold"
          >
            Valider mon vote
          </button>
        ) : undefined
      }
    >
      <header className="pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="font-display text-[1.625rem] leading-tight font-semibold tracking-[-0.02em]">Le menu de demain</h1>
        <p className="text-muted-foreground mt-1 text-[0.875rem]">Un seul choix · votes de démo</p>
      </header>

      <div role="radiogroup" aria-label="Plat de demain" className="mt-5 space-y-3">
        {MEALS.map(({ dish, votes }) => {
          const active = selected === dish.id;
          const count = votes + (active ? 1 : 0);
          return (
            <button
              key={dish.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={voted}
              onClick={() => setSelected(dish.id)}
              className={cn("card pressable flex w-full items-center gap-3 p-3 pe-4 text-start transition-shadow", active && "ring-primary ring-2")}
            >
              <MediaCard src={dish.image} alt="" ratio="square" rounded="xl" ornamentSeed={dish.id} className="w-16 shrink-0" sizes="64px" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-semibold">{dish.name}</span>
                <span className="text-muted-foreground block truncate text-[0.8125rem]">{kitchenById(dish.kitchenId)?.name}</span>
                <span className="text-muted-foreground mt-0.5 block text-[0.75rem]">
                  <span className="tabular-nums">{count}</span> votes
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border-strong/60",
                )}
              >
                {active ? <Check className="size-4" weight="bold" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
