"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, MagnifyingGlass, Ticket, Truck, UsersThree } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import { GROUP, WORKPLACES, dishById, type City } from "./data";
import { useCart, useCartHydration } from "./cart";

/** Three real dishes from the menu: the page shows what a site gets before asking which site. */
const STRIP = ["tajine-kefta", "couscous-7-legumes", "harira-dattes"].map((id) => dishById(id)).filter((dish) => dish !== undefined);

const CITIES: { id: City; label: string }[] = [
  { id: "casablanca", label: "Casablanca" },
  { id: "rabat", label: "Rabat" },
  { id: "marrakech", label: "Marrakech" },
];

/** Where a first visit lands after the splash, and where "change site" leads back to. */
export function WelcomeScreen() {
  const hydrated = useCartHydration();
  const router = useRouter();
  const current = useCart((state) => state.workplaceId);
  const setWorkplace = useCart((state) => state.setWorkplace);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<City | "all">("all");
  const [picked, setPicked] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);

  // Someone who already has a site came here to change it: give them a way back and the tabs.
  const returning = hydrated && current !== null;
  const selected = picked ?? current;
  const codeMatch = WORKPLACES.find((place) => place.code === code.trim().toUpperCase());
  const codeError = code.trim().length >= 6 && !codeMatch;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WORKPLACES.filter(
      (place) => (city === "all" || place.city === city) && (!q || `${place.name} ${place.area}`.toLowerCase().includes(q)),
    );
  }, [query, city]);

  // Radio semantics: one tab stop, arrows move the choice through the list as shown.
  const ordered = CITIES.flatMap((entry) => results.filter((place) => place.city === entry.id));
  const chosenIndex = ordered.findIndex((place) => place.id === selected && !codeMatch);
  const move = (from: number, step: number) => {
    const next = ordered[(from + step + ordered.length) % ordered.length];
    setPicked(next.id);
    document.getElementById(`site-${next.id}`)?.focus();
  };

  const choose = (id: string | null) => {
    if (!id) return;
    setWorkplace(id);
    router.push("/");
  };

  return (
    <PageShell
      nav={returning}
      footer={
        <button
          type="button"
          disabled={!selected && !codeMatch}
          onClick={() => choose(codeMatch?.id ?? selected)}
          className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 w-full items-center justify-center rounded-full text-[0.9375rem] font-semibold disabled:opacity-40"
        >
          {codeMatch ? `Rejoindre ${codeMatch.name.split(" · ")[0]}` : returning && selected === current ? "Garder ce site" : "Continuer"}
          <ArrowRight aria-hidden className="ms-2 size-5 rtl:-scale-x-100" weight="bold" />
        </button>
      }
    >
      <div className="relative grid h-44 grid-cols-3 gap-1">
        {STRIP.map((dish, index) => (
          <MediaCard key={dish.id} src={dish.image} alt="" ratio="fill" rounded="none" ornamentSeed={dish.id} sizes="144px" priority={index === 0} />
        ))}
        <div aria-hidden className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent" />
        {returning ? (
          <Link
            href="/"
            aria-label="Retour au menu"
            className="pressable bg-surface/95 absolute start-4 top-[max(1rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-full shadow-md"
          >
            <ArrowLeft aria-hidden className="size-5 rtl:-scale-x-100" weight="bold" />
          </Link>
        ) : null}
      </div>
      <section className="relative -mt-4 px-5 pb-6">
        <h1 className="font-display text-[1.625rem] leading-tight font-semibold tracking-[-0.02em]">Où travaillez-vous ?</h1>
        <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-[0.875rem]">
          <Truck aria-hidden className="text-accent-red size-4" weight="fill" />
          Livraison groupée à <span className="text-foreground font-semibold tabular-nums">{GROUP.delivery}</span>
        </p>

        <label className="card focus-within:border-primary mt-5 flex h-12 items-center gap-2.5 px-3.5">
          <MagnifyingGlass aria-hidden className="text-muted-foreground size-5 shrink-0" />
          <span className="sr-only">Rechercher un lieu de travail</span>
          <input
            type="search"
            name="workplace"
            autoComplete="off"
            placeholder="Bâtiment, technopark, quartier…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none"
          />
        </label>

        <div role="group" aria-label="Ville" className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {[{ id: "all" as const, label: "Toutes" }, ...CITIES].map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={city === entry.id}
              onClick={() => setCity(entry.id)}
              className={cn(
                "pressable h-9 shrink-0 rounded-full px-4 text-[0.8125rem] font-medium transition-colors",
                city === entry.id ? "bg-primary text-primary-foreground" : "bg-surface border-border border",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div role="radiogroup" aria-label="Lieux de travail" className="mt-4 space-y-5">
          {CITIES.map(({ id, label }) => {
            const places = results.filter((place) => place.city === id);
            if (!places.length) return null;
            return (
              <section key={id} aria-label={label}>
                <h2 className="text-muted-foreground mb-2 text-[0.75rem] font-semibold">{label}</h2>
                <ul className="card divide-border divide-y overflow-hidden">
                  {places.map((place) => {
                    const active = selected === place.id && !codeMatch;
                    const [name, building] = place.name.split(" · ");
                    return (
                      <li key={place.id}>
                        <button
                          type="button"
                          role="radio"
                          id={`site-${place.id}`}
                          aria-checked={active}
                          tabIndex={active || (chosenIndex === -1 && ordered[0]?.id === place.id) ? 0 : -1}
                          onClick={() => setPicked(place.id)}
                          onKeyDown={(event) => {
                            const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
                            if (!step) return;
                            event.preventDefault();
                            move(ordered.findIndex((entry) => entry.id === place.id), step);
                          }}
                          className={cn(
                            "pressable flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start transition-colors",
                            active && "bg-primary-soft",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.9375rem] font-semibold">{name}</span>
                            <span className="text-muted-foreground block truncate text-[0.8125rem]">
                              {building ? `${building} · ` : ""}
                              {place.area.split(",")[0]}
                            </span>
                          </span>
                          <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-[0.8125rem]">
                            <UsersThree aria-hidden className="size-4" />
                            <span className="tabular-nums">{place.members}</span>
                            <span className="sr-only">collègues</span>
                          </span>
                          <span
                            className={cn(
                              "grid size-6 shrink-0 place-items-center rounded-full border",
                              active ? "border-primary bg-primary text-primary-foreground" : "border-border-strong/60",
                            )}
                          >
                            {active ? <Check aria-hidden className="size-3.5" weight="bold" /> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {results.length === 0 ? (
            <p className="card text-muted-foreground px-4 py-6 text-center text-sm">
              Votre bâtiment n&apos;est pas encore sur BENNA. Demandez un code à un collègue.
            </p>
          ) : null}
        </div>

        {/* Invited by a colleague: the code from their link joins the right site directly. */}
        <div className="card mt-5 p-3.5">
          {codeOpen ? (
            <>
              <label htmlFor="invite-code" className="flex items-center gap-2 text-[0.875rem] font-semibold">
                <Ticket aria-hidden className="text-accent-red size-5" weight="fill" />
                Code d&apos;invitation
              </label>
              <input
                id="invite-code"
                name="invite-code"
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="characters"
                placeholder="ex. CASA2B"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                aria-invalid={codeError}
                aria-describedby="invite-code-hint"
                className={cn(
                  "bg-background focus-visible:ring-ring mt-2 h-12 w-full rounded-xl border px-3.5 font-mono text-[0.9375rem] tracking-[0.08em] uppercase outline-none focus-visible:ring-2",
                  codeError ? "border-danger" : "border-border focus:border-primary",
                )}
              />
              <p id="invite-code-hint" aria-live="polite" className={cn("mt-1.5 text-xs", codeError ? "text-danger" : "text-muted-foreground")}>
                {codeError
                  ? "Ce code ne correspond à aucun groupe. Vérifiez-le auprès de votre collègue."
                  : codeMatch
                    ? `Groupe trouvé : ${codeMatch.name}`
                    : "Le code est dans le lien partagé par votre collègue."}
              </p>
            </>
          ) : (
            <button type="button" onClick={() => setCodeOpen(true)} className="flex w-full items-center gap-3 text-start">
              <Ticket aria-hidden className="text-accent-red size-6 shrink-0" weight="fill" />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-semibold">Un collègue vous a invité ?</span>
                <span className="text-muted-foreground block text-[0.8125rem]">Entrez le code de son lien</span>
              </span>
              <ArrowRight aria-hidden className="text-muted-foreground size-4 shrink-0 rtl:-scale-x-100" />
            </button>
          )}
        </div>
      </section>
    </PageShell>
  );
}
