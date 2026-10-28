"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Timer, Truck, UsersThree } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GROUP, PARTICIPANTS, PARTICIPANT_DISHES, WORKPLACES, dishById } from "./data";
import { useCart, useCartHydration } from "./cart";
import { Avatar, AvatarStack, CUTOFF, Countdown } from "./ui";

/** Where a shared invite link lands. */
export function JoinScreen({ code }: { code: string }) {
  useCartHydration();
  const router = useRouter();
  const setWorkplace = useCart((state) => state.setWorkplace);
  const joinGroup = useCart((state) => state.join);
  const workplace = WORKPLACES.find((place) => place.code === code.toUpperCase());
  const inGroup = PARTICIPANTS.filter((person) => person.status !== "invited");
  const host = PARTICIPANTS.find((person) => person.status === "host") ?? PARTICIPANTS[0];
  // The dish most colleagues took leads the page, as on /groupe.
  const takers = new Map<string, number>();
  for (const ids of Object.values(PARTICIPANT_DISHES)) for (const id of new Set(ids)) takers.set(id, (takers.get(id) ?? 0) + 1);
  const hero = dishById([...takers].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "");

  const join = () => {
    if (!workplace) return;
    setWorkplace(workplace.id);
    joinGroup();
    router.push("/#menu");
  };
  // Look first, join later: the menu without taking a seat.
  const browse = () => {
    if (!workplace) return;
    setWorkplace(workplace.id);
    router.push("/#menu");
  };

  const back = (
    <Link
      href="/bienvenue"
      aria-label="Retour"
      className="pressable bg-surface/95 absolute start-4 top-[max(1rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-full shadow-md"
    >
      <ArrowLeft aria-hidden className="size-5 rtl:-scale-x-100" weight="bold" />
    </Link>
  );

  if (!workplace) {
    return (
      <PageShell header={<header className="relative h-16">{back}</header>} className="px-5 pb-8">
        <section className="card mt-8 p-5 text-center">
          <h1 className="font-display text-[1.375rem] font-semibold">Ce lien d&apos;invitation n&apos;est plus valable.</h1>
          <p className="text-muted-foreground mt-2 text-[0.9375rem]">
            Demandez un nouveau lien à votre collègue, ou choisissez votre lieu de travail.
          </p>
          <Link href="/bienvenue" className={cn(buttonVariants({ block: true }), "mt-5 rounded-full")}>
            Choisir mon lieu de travail
          </Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell className="pb-8">
      <div className="relative h-64">
        {hero ? <MediaCard src={hero.image} alt="" ratio="fill" rounded="none" ornamentSeed={hero.id} sizes="430px" priority /> : null}
        {back}
      </div>
      <section className="bg-surface relative mx-4 -mt-24 rounded-[1.75rem] p-5 shadow-[0_8px_30px_rgb(0_0_0/0.08)]">
        <AvatarStack people={inGroup} max={4} size="md" />
        <h1 className="font-display mt-3 text-[1.75rem] leading-tight font-semibold tracking-[-0.01em]">Groupe de {GROUP.host}</h1>
        <p className="text-muted-foreground mt-1.5 flex items-center gap-2 text-[0.875rem]">
          <Avatar person={host} />
          <span>
            Organisé par <span className="text-foreground font-semibold">{GROUP.host}</span> · {workplace.name.split(" · ")[0]}
          </span>
        </p>

        <div className="bg-background divide-border mt-4 divide-y rounded-2xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <Truck aria-hidden className="size-6 shrink-0" />
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-semibold">
                Livraison <span className="tabular-nums">{GROUP.delivery}</span>
              </p>
              <p className="text-muted-foreground truncate text-[0.8125rem]">{workplace.pickup}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Timer aria-hidden className="text-primary-ink size-6 shrink-0" />
            <p className="min-w-0 flex-1 truncate text-[0.8125rem]">Clôture des commandes</p>
            <Countdown until={CUTOFF} prefix="" className="text-primary-ink h-auto shrink-0 bg-transparent px-0 text-[0.875rem] font-bold" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <UsersThree aria-hidden className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-2 text-[0.875rem]">
                <span>
                  <span className="font-semibold tabular-nums">
                    {inGroup.length}/{GROUP.capacity}
                  </span>{" "}
                  collègues
                </span>
                <span className="text-muted-foreground text-[0.8125rem]">
                  <span className="tabular-nums">{GROUP.capacity - inGroup.length}</span> places libres
                </span>
              </p>
              <div
                role="progressbar"
                aria-label="Places prises"
                aria-valuemin={0}
                aria-valuemax={GROUP.capacity}
                aria-valuenow={inGroup.length}
                className="bg-surface-muted mt-2 h-2 overflow-hidden rounded-full"
              >
                <div className="bg-primary h-full rounded-full" style={{ width: `${(inGroup.length / GROUP.capacity) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={join}
          className="pressable bg-primary text-primary-foreground hover:bg-primary-hover mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[0.9375rem] font-semibold"
        >
          <Plus aria-hidden className="size-4" weight="bold" />
          Rejoindre le groupe
        </button>
        <button
          type="button"
          onClick={browse}
          className="pressable bg-primary-soft text-primary-ink mt-2 flex h-12 w-full items-center justify-center rounded-2xl text-[0.9375rem] font-semibold"
        >
          Voir le menu du jour
        </button>
      </section>
    </PageShell>
  );
}
