"use client";

import { useRouter } from "next/navigation";
import { Check, Coins } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import { POINTS, lineList, pointsBalance, rewardCost, rewardPoints, useCart, useCartHydration } from "./cart";
import { formatMad, todaysDishes, workplaceById } from "./data";
import { BackLink } from "./ui";

/** Today's dishes, priced in points at the agreed rate; one tap puts one in the cart as offered. */
export function PointsScreen() {
  useCartHydration();
  const router = useRouter();
  const workplace = workplaceById(useCart((state) => state.workplaceId));
  const lines = lineList(useCart((state) => state.lines));
  const addReward = useCart((state) => state.addReward);
  const balance = pointsBalance(useCart((state) => state.orders));
  const free = balance - rewardPoints(lines);
  const dishes = todaysDishes(workplace).sort((a, b) => a.groupPrice - b.groupPrice);

  return (
    <PageShell
      nav
      header={
        <header className="bg-background sticky top-0 z-20 flex items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
          <BackLink fallback="/compte" className="pressable grid size-10 place-items-center rounded-full" />
          <h1 className="font-display text-[1.375rem] leading-tight font-semibold tracking-[-0.01em]">Échanger mes points</h1>
        </header>
      }
      className="space-y-4 px-5 pb-8"
    >
      <section aria-label="Mon solde" className="bg-saffron-soft flex items-center gap-3 rounded-2xl p-4">
        <Coins aria-hidden className="text-saffron-ink size-9 shrink-0" weight="fill" />
        <p className="min-w-0 flex-1">
          <span className="block text-[1.75rem] leading-none font-semibold tabular-nums">{free}</span>
          <span className="text-saffron-ink block text-[0.8125rem]">points disponibles · démo</span>
        </p>
        <span className="text-saffron-ink text-end text-[0.75rem]">
          <span className="tabular-nums">{POINTS.redeem}</span> pts ={" "}
          <span dir="ltr" className="tabular-nums">
            {formatMad(POINTS.worth)}
          </span>
        </span>
      </section>

      <ul className="grid grid-cols-2 gap-3">
        {dishes.map((dish) => {
          const cost = rewardCost(dish.id);
          const inCart = lines.some((line) => line.reward && line.dishId === dish.id);
          const reachable = free >= cost;
          return (
            <li key={dish.id} className="card flex flex-col overflow-hidden">
              <MediaCard src={dish.image} alt="" ratio="landscape" rounded="none" ornamentSeed={dish.id} sizes="200px" />
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-2 text-[0.875rem] leading-snug font-semibold">{dish.name}</p>
                <p className="text-saffron-ink mt-1 flex items-center gap-1 text-[0.8125rem] font-semibold">
                  <Coins aria-hidden className="size-4" weight="fill" />
                  <span className="tabular-nums">{cost}</span> points
                </p>
                <div className="mt-auto pt-3">
                  {inCart ? (
                    <p className="text-primary-ink flex h-10 items-center justify-center gap-1.5 text-[0.8125rem] font-semibold">
                      <Check aria-hidden className="size-4" weight="bold" />
                      Dans le panier
                    </p>
                  ) : reachable ? (
                    <button
                      type="button"
                      onClick={() => addReward(dish.id) && router.push("/panier")}
                      aria-label={`Échanger ${cost} points contre ${dish.name}`}
                      className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-10 w-full items-center justify-center rounded-full text-[0.8125rem] font-semibold"
                    >
                      Échanger
                    </button>
                  ) : (
                    <div>
                      <div className="bg-surface-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
                        <div className="bg-saffron h-full rounded-full" style={{ width: `${Math.max(0, (free / cost) * 100)}%` }} />
                      </div>
                      <p className={cn("text-muted-foreground mt-1.5 text-[0.75rem]")}>
                        Encore <span className="tabular-nums">{cost - Math.max(0, free)}</span> points
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
