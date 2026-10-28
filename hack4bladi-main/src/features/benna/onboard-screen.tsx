"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock, MapPin, UsersThree } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { GROUP, PARTICIPANTS, PARTICIPANT_DISHES, dishById, formatMad, todaysDishes, workplaceById, type Dish } from "./data";
import { useCart } from "./cart";
import { CartScreen } from "./cart-screen";
import { OrderScreen } from "./order-screen";
import { AvatarStack, CUTOFF, Countdown } from "./ui";

/** The jury's first look: couscous, tajine, adass, then what the group took most. */
const FIRST = ["couscous-7-legumes", "tajine-poulet-citron", "adass"];

/**
 * Where a scanned QR lands (benna.ma/<site>): one photo-led welcome, then the group's dishes.
 * The site comes from the address, so the eater never picks it; every figure comes from the data.
 */
export function OnboardScreen({ workplaceId }: { workplaceId: string }) {
  const setWorkplace = useCart((state) => state.setWorkplace);
  const join = useCart((state) => state.join);
  const startGuest = useCart((state) => state.startGuest);
  const quickAdd = useCart((state) => state.quickAdd);
  // The whole QR path stays on this address: welcome → dishes → cart → مرحبا بيك. A refresh starts over.
  const [stage, setStage] = useState<"welcome" | "picking" | "cart" | "done">("welcome");
  const [orderId, setOrderId] = useState<string | null>(null);
  const go = (next: typeof stage) => {
    setStage(next);
    window.scrollTo(0, 0);
  };
  // Every scan is a new first visit: no cart, account or order carried over from the last one on this phone.
  // ponytail: wipes a signed-in user too; scope it to guests if the QR ever targets existing users.
  useEffect(() => {
    useCart.persist.clearStorage();
    useCart.setState(useCart.getInitialState(), true);
  }, []);
  const workplace = workplaceById(workplaceId);
  if (!workplace) return null;

  const dishes = todaysDishes(workplace);
  // The biggest group saving carries the price step; the other two steps show different dishes.
  const deal = [...dishes].sort((a, b) => b.soloPrice - b.groupPrice - (a.soloPrice - a.groupPrice))[0];
  const others = dishes.filter((dish) => dish.id !== deal?.id);
  const site = workplace.name.split(" · ")[0];

  const enter = () => {
    setWorkplace(workplace.id);
    join();
    startGuest();
  };
  const take = (dish: Dish) => {
    enter();
    quickAdd(dish.id);
    go("cart");
  };

  // What colleagues already ordered: the classics first, then the most taken. Joining them is one tap.
  const takers = new Map<string, number>();
  for (const person of PARTICIPANTS) for (const id of new Set(PARTICIPANT_DISHES[person.id] ?? [])) takers.set(id, (takers.get(id) ?? 0) + 1);
  const ranked = [...takers].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const favorites = [...new Set([...FIRST, ...ranked])]
    .map((id) => ({ dish: dishById(id), count: takers.get(id) ?? 0 }))
    .filter((entry): entry is { dish: Dish; count: number } => Boolean(entry.dish))
    .slice(0, 4);

  if (stage === "done" && orderId) return <OrderScreen id={orderId} />;
  if (stage === "cart")
    return (
      <CartScreen
        onBack={() => go("picking")}
        onPlaced={(id) => {
          setOrderId(id);
          go("done");
        }}
      />
    );

  if (stage === "picking") {
    return (
      <PageShell
        className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6"
      >
        <h1 className="font-display text-[1.625rem] leading-tight font-semibold tracking-[-0.01em] text-balance">Le groupe a déjà commandé ça</h1>
        <p className="text-muted-foreground mt-1.5 flex items-center gap-2 text-[0.875rem]">
          <MapPin aria-hidden className="text-primary-ink size-4 shrink-0" weight="fill" />
          Livré à {site} à <span className="tabular-nums">{GROUP.delivery}</span>
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {favorites.map(({ dish, count }) => (
            <li key={dish.id} className="card flex flex-col overflow-hidden">
              <MediaCard src={dish.image} alt="" ratio="square" rounded="none" ornamentSeed={dish.id} sizes="200px" />
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-2 flex-1 text-[0.875rem] leading-snug font-semibold">{dish.name}</p>
                <p className="text-muted-foreground mt-1 text-[0.75rem]">
                  <span dir="ltr" className="text-foreground font-semibold tabular-nums">
                    {formatMad(dish.groupPrice)}
                  </span>
                  {count ? (
                    <>
                      {" "}
                      · <span className="tabular-nums">{count}</span> collègue{count > 1 ? "s" : ""}
                    </>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={() => take(dish)}
                  className="pressable bg-primary text-primary-foreground hover:bg-primary-hover mt-3 h-10 w-full shrink-0 rounded-full text-[0.8125rem] font-semibold"
                >
                  Prendre ce plat
                </button>
              </div>
            </li>
          ))}
        </ul>
      </PageShell>
    );
  }

  const hero = others[0] ?? deal;
  const row = "flex items-start gap-3";

  return (
    <PageShell
      footer={
        <button
          type="button"
          onClick={() => go("picking")}
          className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 w-full items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold"
        >
          Commander mon déjeuner
          <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" weight="bold" />
        </button>
      }
      className="pb-6"
    >
      <div className="relative h-[40vh] min-h-56">
        {hero ? <MediaCard src={hero.image} alt="" ratio="fill" rounded="none" ornamentSeed={hero.id} priority /> : null}
      </div>

      <section className="bg-background relative -mt-7 rounded-t-[1.75rem] px-6 pt-6">
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.01em] text-balance">Bienvenue à {site}</h1>
        <ul className="mt-5 space-y-4 text-[0.9375rem]">
          <li className={row}>
            <UsersThree aria-hidden className="text-primary-ink mt-0.5 size-5 shrink-0" weight="fill" />
            <span className="min-w-0 flex-1">
              <span className="font-semibold tabular-nums">{workplace.members}</span> collègues commandent déjà ici
              <AvatarStack people={PARTICIPANTS} max={4} className="mt-2" />
            </span>
          </li>
          <li className={row}>
            <Clock aria-hidden className="text-primary-ink mt-0.5 size-5 shrink-0" weight="fill" />
            <span className="min-w-0 flex-1">
              <Countdown until={CUTOFF} className="text-primary-ink h-auto bg-transparent px-0 text-[0.9375rem] font-bold" />
              {deal ? (
                <span className="text-muted-foreground block">
                  Prix groupe :{" "}
                  <span dir="ltr" className="text-foreground font-semibold tabular-nums">
                    {formatMad(deal.groupPrice)}
                  </span>{" "}
                  au lieu de{" "}
                  <span dir="ltr" className="tabular-nums line-through">
                    {formatMad(deal.soloPrice)}
                  </span>
                </span>
              ) : null}
            </span>
          </li>
          <li className={row}>
            <MapPin aria-hidden className="text-primary-ink mt-0.5 size-5 shrink-0" weight="fill" />
            <span className="min-w-0 flex-1">
              Retrait à <span className="font-semibold tabular-nums">{GROUP.delivery}</span> · {workplace.pickup}
              <span className="text-muted-foreground block">Sans application, sans compte</span>
            </span>
          </li>
        </ul>
      </section>
    </PageShell>
  );
}
