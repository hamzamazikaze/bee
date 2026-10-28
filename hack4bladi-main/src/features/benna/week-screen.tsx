"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowClockwise, ArrowRight, Check, Minus, Plus, Shuffle, Sparkle } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import { useCart, useCartHydration } from "./cart";
import { GROUP, casablancaWeekday, defaultOptions, formatMad, kitchenById, servedWeekday, workplaceById, type Allergen } from "./data";
import { CONCEPT_LABEL, localDiet, parseDiet, type Concept, type Diet, type Preference } from "./m3ak";
import { WEEKDAYS, planTotals, planWeek, reasonsFor, type PlanDay, type PlanInput } from "./week-plan";
import { BackLink } from "./ui";

type Phase = "prefs" | "prix" | "infos" | "loading" | "reveal" | "summary";

const AVOID: { id: string; label: string; excludes?: Concept[]; allergens?: Allergen[] }[] = [
  { id: "vegetarien", label: "Végétarien", excludes: ["poulet", "viande", "poisson"] },
  { id: "sans-viande", label: "Sans viande", excludes: ["viande"] },
  { id: "sans-poisson", label: "Sans poisson", excludes: ["poisson"] },
  { id: "sans-oeufs", label: "Sans œufs", allergens: ["oeufs"] },
  { id: "sans-gluten", label: "Sans gluten", allergens: ["gluten"] },
  { id: "sans-noix", label: "Sans fruits à coque", allergens: ["fruits-a-coque"] },
];
const LIKES: Concept[] = ["poulet", "viande", "poisson", "legumes", "lentilles", "soupe", "tajine", "couscous"];
const STYLES: { id: Preference; label: string }[] = [
  { id: "leger", label: "Léger" },
  { id: "copieux", label: "Copieux" },
  { id: "sans-piment", label: "Sans piment" },
];
const PRESETS = [
  { label: "Petit budget", value: 25 },
  { label: "Normal", value: 35 },
  { label: "Généreux", value: 45 },
];
const LOADING_LINES = ["Lecture de vos préférences", "Menus du jour, cuisine par cuisine", "Calcul du budget du groupe"];

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]);
const merge = (...diets: Diet[]): Diet => ({
  excludes: [...new Set(diets.flatMap((diet) => diet.excludes))],
  allergens: [...new Set(diets.flatMap((diet) => diet.allergens))],
  preferences: [...new Set(diets.flatMap((diet) => diet.preferences))],
});

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "pressable flex h-10 items-center gap-1.5 rounded-full border px-4 text-[0.875rem] font-medium transition-colors",
        active ? "bg-primary text-primary-foreground border-transparent" : "border-border bg-surface text-foreground",
      )}
    >
      {active ? <Check aria-hidden className="pop size-3.5" weight="bold" /> : null}
      {children}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-muted-foreground mb-2.5 text-[0.75rem] font-semibold tracking-wide uppercase">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

const slide = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -28 },
  transition: { type: "spring", stiffness: 380, damping: 34 },
} as const;

/** Préférences → prix → infos, a short "on compose" moment, then the week one day at a time. */
export function WeekScreen() {
  useCartHydration();
  const router = useRouter();
  const workplace = workplaceById(useCart((state) => state.workplaceId));
  const profile = useCart((state) => state.diet);
  const addLine = useCart((state) => state.addLine);

  const [phase, setPhase] = useState<Phase>("prefs");
  const [avoid, setAvoid] = useState<string[]>([]);
  const [likes, setLikes] = useState<Concept[]>([]);
  const [styles, setStyles] = useState<Preference[]>([]);
  const [text, setText] = useState("");
  const [perDay, setPerDay] = useState(35);
  const [people, setPeople] = useState(4);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [input, setInput] = useState<PlanInput | null>(null);
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [shown, setShown] = useState(0);
  const [line, setLine] = useState(0);

  const today = servedWeekday(casablancaWeekday());
  const site = workplace?.name.split(" · ")[0];

  // The composing moment: the free text is read (model, then local reader) while the tajine breathes.
  useEffect(() => {
    if (phase !== "loading") return;
    let alive = true;
    const ticker = setInterval(() => setLine((value) => (value + 1) % LOADING_LINES.length), 900);
    (async () => {
      const started = Date.now();
      const chosen: Diet = {
        excludes: AVOID.filter((entry) => avoid.includes(entry.id)).flatMap((entry) => entry.excludes ?? []),
        allergens: AVOID.filter((entry) => avoid.includes(entry.id)).flatMap((entry) => entry.allergens ?? []),
        preferences: styles,
      };
      let said: Diet | null = null;
      if (text.trim()) {
        const answer = await fetch("/api/benna/diet", { method: "POST", body: JSON.stringify({ text }) })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null);
        said = parseDiet(answer?.diet) ?? localDiet(text);
      }
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, 2700 - (Date.now() - started))));
      if (!alive) return;
      const next: PlanInput = { perDay, people, days, diet: merge(profile, chosen, ...(said ? [said] : [])), wants: likes, city: workplace?.city ?? "casablanca" };
      setInput(next);
      setPlan(planWeek(next));
      setShown(0);
      setPhase("reveal");
    })();
    return () => {
      alive = false;
      clearInterval(ticker);
    };
    // Runs once per "Composer ma semaine"; the answers are frozen by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const totals = planTotals(plan, people);
  const budget = perDay * people * days.length;
  const swap = (index: number) =>
    setPlan((current) =>
      current.map((day, at) => {
        if (at !== index || day.options.length < 2) return day;
        const next = day.options[(day.options.findIndex((dish) => dish.id === day.dish?.id) + 1) % day.options.length];
        return { ...day, dish: next };
      }),
    );

  /* ---------- The composing moment ---------- */
  if (phase === "loading") {
    return (
      <PageShell className="bg-primary text-primary-foreground relative isolate flex min-h-full flex-col items-center justify-center overflow-hidden px-8 text-center">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[url('/images/zellige.svg')] bg-[length:3.5rem] opacity-[0.14] [mask-image:radial-gradient(circle,transparent_25%,black_80%)]"
        />
        <Image src="/icons/benna-tajine.png" alt="" width={409} height={387} priority className="step-in brand-breathe w-32 drop-shadow-[0_14px_22px_rgba(60,0,4,0.45)]" />
        <h1 className="font-display mt-8 text-[1.5rem] leading-tight font-bold">On compose votre semaine…</h1>
        <div className="mt-3 h-6" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.9, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-[0.875rem]"
            >
              {LOADING_LINES[line]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/20">
          <div className="analysing-bar !bg-primary-foreground relative h-full" />
        </div>
      </PageShell>
    );
  }

  /* ---------- One day at a time ---------- */
  if (phase === "reveal" && input) {
    const day = plan[shown];
    const last = shown === plan.length - 1;
    return (
      <PageShell
        header={
          <header className="bg-background sticky top-0 z-20 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.8125rem] font-semibold">
                Jour <span className="tabular-nums">{shown + 1}</span> sur <span className="tabular-nums">{plan.length}</span>
              </p>
              <button type="button" onClick={() => setPhase("summary")} className="text-primary-ink text-[0.8125rem] font-semibold">
                Tout voir
              </button>
            </div>
            <div className="mt-2.5 flex gap-1.5" aria-hidden>
              {plan.map((entry, index) => (
                <span key={entry.weekday} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", index <= shown ? "bg-primary" : "bg-surface-muted")} />
              ))}
            </div>
          </header>
        }
        footer={
          <div className="flex gap-2">
            {day.options.length > 1 ? (
              <button
                type="button"
                onClick={() => swap(shown)}
                className="pressable border-border bg-surface flex h-12 items-center justify-center gap-2 rounded-full border px-5 text-[0.9375rem] font-semibold"
              >
                <Shuffle aria-hidden className="size-4" weight="bold" />
                Changer
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => (last ? setPhase("summary") : setShown(shown + 1))}
              className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold"
            >
              {last ? "Voir ma semaine" : `Suivant · ${WEEKDAYS[plan[shown + 1].weekday - 1]}`}
              <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" weight="bold" />
            </button>
          </div>
        }
        className="px-5 pb-6"
      >
        <AnimatePresence mode="wait">
          <motion.article key={`${day.weekday}-${day.dish?.id ?? "none"}`} {...slide} className="card overflow-hidden">
            {day.dish ? (
              <>
                <div className="relative">
                  <MediaCard src={day.dish.image} alt="" ratio="landscape" rounded="none" ornamentSeed={day.dish.id} priority />
                  <span className="bg-background/95 absolute start-3 top-3 rounded-full px-3 py-1 text-[0.8125rem] font-semibold">
                    {day.label}
                    {day.weekday === today ? " · aujourd'hui" : ""}
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="font-display text-[1.375rem] leading-tight font-semibold">{day.dish.name}</h2>
                  <p className="text-muted-foreground mt-1 text-[0.8125rem]">{kitchenById(day.dish.kitchenId)?.name}</p>
                  <p className="text-muted-foreground mt-2 text-[0.875rem] leading-snug">{day.dish.description}</p>
                  <p dir="ltr" className="mt-3 flex items-baseline gap-2 rtl:justify-end">
                    <span className="text-[1.25rem] font-semibold tabular-nums">{formatMad(day.dish.groupPrice)}</span>
                    <span className="text-muted-foreground text-[0.8125rem] tabular-nums line-through">{formatMad(day.dish.soloPrice)}</span>
                    <span className="text-muted-foreground text-[0.8125rem]">× {people}</span>
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {reasonsFor(day.dish, input).map((reason, index) => (
                      <motion.li
                        key={reason}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + index * 0.08 }}
                        className="bg-saffron-soft text-saffron-ink flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold"
                      >
                        <Sparkle aria-hidden className="size-3" weight="fill" />
                        {reason}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="p-6 text-center">
                <p className="font-display text-[1.25rem] font-semibold">{day.label}</p>
                <p className="text-muted-foreground mt-2 text-[0.875rem]">Aucun plat de ce jour ne respecte vos préférences.</p>
              </div>
            )}
          </motion.article>
        </AnimatePresence>
      </PageShell>
    );
  }

  /* ---------- The week ---------- */
  if (phase === "summary") {
    const todays = plan.find((day) => day.weekday === today)?.dish;
    return (
      <PageShell
        header={
          <header className="bg-background sticky top-0 z-20 flex items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
            <BackLink fallback="/compte" className="pressable grid size-10 place-items-center rounded-full" />
            <h1 className="font-display text-[1.375rem] leading-tight font-semibold tracking-[-0.01em]">Votre semaine est prête</h1>
          </header>
        }
        footer={
          todays ? (
            <button
              type="button"
              onClick={() => {
                addLine(todays.id, defaultOptions(todays), people);
                router.push("/panier");
              }}
              className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 w-full items-center gap-3 rounded-full ps-5 pe-5 shadow-[0_10px_24px_-10px_rgba(168,6,15,0.45)]"
            >
              <span className="flex-1 text-start text-[0.9375rem] font-semibold">Commander aujourd&apos;hui pour {people}</span>
              <span dir="ltr" className="font-mono text-[0.9375rem] tabular-nums">
                {formatMad(todays.groupPrice * people)}
              </span>
            </button>
          ) : undefined
        }
        className="space-y-4 px-5 pb-6"
      >
        <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-primary text-primary-foreground relative isolate overflow-hidden rounded-2xl p-4">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[url('/images/zellige.svg')] bg-[length:3rem] opacity-[0.14]" />
          <p className="text-[0.8125rem] opacity-90">
            {plan.length} déjeuners · {people} personne{people > 1 ? "s" : ""}
          </p>
          <p dir="ltr" className="mt-1 text-[2rem] leading-none font-bold tabular-nums rtl:text-end">
            {formatMad(totals.total)}
          </p>
          <p className="mt-2 text-[0.8125rem]">
            {totals.total <= budget ? `Dans votre budget de ${formatMad(budget)}` : `${formatMad(totals.total - budget)} au-dessus de votre budget`} ·{" "}
            <span className="font-semibold">{formatMad(totals.saved)} économisés</span>
          </p>
        </motion.section>

        <ul className="space-y-2.5">
          {plan.map((day, index) => (
            <motion.li key={day.weekday} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * index }}>
              <button
                type="button"
                onClick={() => {
                  setShown(index);
                  setPhase("reveal");
                }}
                className="card pressable flex w-full items-center gap-3 p-2.5 text-start"
              >
                <span className="w-14 shrink-0">
                  {day.dish ? <MediaCard src={day.dish.image} alt="" ratio="square" rounded="lg" ornamentSeed={day.dish.id} sizes="56px" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-primary-ink block text-[0.75rem] font-semibold">
                    {day.label}
                    {day.weekday === today ? " · aujourd'hui" : ""}
                  </span>
                  <span className="block truncate text-[0.9375rem] font-semibold">{day.dish?.name ?? "Aucun plat compatible"}</span>
                </span>
                {day.dish ? (
                  <span dir="ltr" className="text-[0.875rem] font-semibold tabular-nums">
                    {formatMad(day.dish.groupPrice)}
                  </span>
                ) : null}
              </button>
            </motion.li>
          ))}
        </ul>

        <button type="button" onClick={() => setPhase("prefs")} className="text-primary-ink mx-auto flex h-11 items-center gap-2 text-[0.875rem] font-semibold">
          <ArrowClockwise aria-hidden className="size-4" weight="bold" />
          Recommencer
        </button>
        <p className="text-muted-foreground text-[0.75rem]">Menus de la rotation hebdomadaire. Prix pilote indicatifs, démo.</p>
      </PageShell>
    );
  }

  /* ---------- Questions, one screen each ---------- */
  const steps: Phase[] = ["prefs", "prix", "infos"];
  const step = steps.indexOf(phase);
  const next = () => (step < 2 ? setPhase(steps[step + 1]) : setPhase("loading"));

  return (
    <PageShell
      header={
        <header className="bg-background sticky top-0 z-20 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
          <div className="flex items-center gap-2">
            {step === 0 ? (
              <BackLink fallback="/compte" className="pressable grid size-10 place-items-center rounded-full" />
            ) : (
              <button type="button" onClick={() => setPhase(steps[step - 1])} aria-label="Étape précédente" className="pressable grid size-10 place-items-center rounded-full">
                <ArrowRight aria-hidden className="size-5 -scale-x-100 rtl:scale-x-100" weight="bold" />
              </button>
            )}
            <p className="text-muted-foreground text-[0.8125rem] font-semibold">
              Étape <span className="tabular-nums">{step + 1}</span> sur 3
            </p>
          </div>
          <div className="mt-2 flex gap-1.5 px-1" aria-hidden>
            {steps.map((entry, index) => (
              <span key={entry} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", index <= step ? "bg-primary" : "bg-surface-muted")} />
            ))}
          </div>
        </header>
      }
      footer={
        <button
          type="button"
          onClick={next}
          disabled={phase === "infos" && days.length === 0}
          className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 w-full items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold disabled:opacity-50"
        >
          {step < 2 ? "Continuer" : "Composer ma semaine"}
          {step < 2 ? <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" weight="bold" /> : <Sparkle aria-hidden className="size-4" weight="fill" />}
        </button>
      }
      className="px-5 pb-6"
    >
      <AnimatePresence mode="wait">
        <motion.div key={phase} {...slide} className="space-y-6">
          {phase === "prefs" ? (
            <>
              <div>
                <h1 className="font-display text-[1.625rem] leading-tight font-semibold tracking-[-0.01em]">Qu&apos;est-ce qu&apos;on aime manger&nbsp;?</h1>
                <p className="text-muted-foreground mt-1.5 text-[0.875rem]">Pour tout le groupe. Rien n&apos;est obligatoire.</p>
              </div>
              <Group title="On aime">
                {LIKES.map((concept) => (
                  <Chip key={concept} active={likes.includes(concept)} onClick={() => setLikes(toggle(likes, concept))}>
                    {CONCEPT_LABEL[concept][0].toUpperCase() + CONCEPT_LABEL[concept].slice(1)}
                  </Chip>
                ))}
              </Group>
              <Group title="On évite">
                {AVOID.map((entry) => (
                  <Chip key={entry.id} active={avoid.includes(entry.id)} onClick={() => setAvoid(toggle(avoid, entry.id))}>
                    {entry.label}
                  </Chip>
                ))}
              </Group>
              <Group title="Style">
                {STYLES.map((entry) => (
                  <Chip key={entry.id} active={styles.includes(entry.id)} onClick={() => setStyles(toggle(styles, entry.id))}>
                    {entry.label}
                  </Chip>
                ))}
              </Group>
              <label className="block">
                <span className="text-muted-foreground mb-2.5 block text-[0.75rem] font-semibold tracking-wide uppercase">Autre chose ?</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={2}
                  maxLength={400}
                  placeholder="bla hout, 7assas l gluten… (darija ou français)"
                  className="border-border bg-surface block w-full resize-none rounded-xl border p-3 text-[0.9375rem] outline-none"
                />
              </label>
            </>
          ) : null}

          {phase === "prix" ? (
            <>
              <div>
                <h1 className="font-display text-[1.625rem] leading-tight font-semibold tracking-[-0.01em]">Quel budget par déjeuner&nbsp;?</h1>
                <p className="text-muted-foreground mt-1.5 text-[0.875rem]">Par personne, au prix groupe.</p>
              </div>
              <div className="card p-5 text-center">
                <p dir="ltr" className="text-[3rem] leading-none font-bold tabular-nums">
                  <motion.span key={perDay} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
                    {perDay}
                  </motion.span>{" "}
                  <span className="text-muted-foreground text-[1.25rem] font-semibold">DH</span>
                </p>
                <input
                  type="range"
                  min={15}
                  max={60}
                  value={perDay}
                  onChange={(event) => setPerDay(Number(event.target.value))}
                  aria-label="Budget par personne et par déjeuner"
                  className="accent-primary mt-5 w-full"
                />
                <div className="text-muted-foreground mt-1 flex justify-between text-[0.75rem] tabular-nums" dir="ltr">
                  <span>15 DH</span>
                  <span>60 DH</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Chip key={preset.value} active={perDay === preset.value} onClick={() => setPerDay(preset.value)}>
                    {preset.label} · <span className="tabular-nums">{preset.value}</span>
                  </Chip>
                ))}
              </div>
              <p className="text-muted-foreground text-[0.8125rem]">
                Soit environ <span className="text-foreground font-semibold tabular-nums">{formatMad(perDay * 5)}</span> par personne pour la semaine.
              </p>
            </>
          ) : null}

          {phase === "infos" ? (
            <>
              <div>
                <h1 className="font-display text-[1.625rem] leading-tight font-semibold tracking-[-0.01em]">Pour qui, et quels jours&nbsp;?</h1>
                <p className="text-muted-foreground mt-1.5 text-[0.875rem]">
                  Livré {site ? `à ${site} ` : ""}vers <span className="tabular-nums">{GROUP.delivery}</span>.
                </p>
              </div>
              <div className="card flex items-center justify-between gap-3 p-4">
                <span>
                  <span className="block text-[0.9375rem] font-semibold" id="people-label">
                    Personnes
                  </span>
                  <span className="text-muted-foreground block text-[0.75rem]">Vous compris</span>
                </span>
                <span className="flex items-center gap-3" role="group" aria-labelledby="people-label">
                  <button type="button" onClick={() => setPeople((count) => Math.max(1, count - 1))} aria-label="Une personne de moins" className="pressable bg-surface-muted grid size-11 place-items-center rounded-full">
                    <Minus aria-hidden className="size-4" weight="bold" />
                  </button>
                  <motion.span key={people} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-7 text-center text-[1.375rem] font-semibold tabular-nums" aria-live="polite">
                    {people}
                  </motion.span>
                  <button type="button" onClick={() => setPeople((count) => Math.min(GROUP.capacity, count + 1))} aria-label="Une personne de plus" className="pressable bg-surface-muted grid size-11 place-items-center rounded-full">
                    <Plus aria-hidden className="size-4" weight="bold" />
                  </button>
                </span>
              </div>
              <Group title="Jours">
                {WEEKDAYS.map((label, index) => (
                  <Chip key={label} active={days.includes(index + 1)} onClick={() => setDays(toggle(days, index + 1))}>
                    {label}
                  </Chip>
                ))}
              </Group>
              <div className="bg-saffron-soft text-saffron-ink rounded-2xl p-4 text-[0.875rem]">
                Budget du groupe :{" "}
                <span dir="ltr" className="font-semibold tabular-nums">
                  {formatMad(budget)}
                </span>{" "}
                pour <span className="tabular-nums">{days.length}</span> jour{days.length > 1 ? "s" : ""}
              </div>
            </>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </PageShell>
  );
}
