"use client";

import { useState } from "react";
import { CaretDown, Leaf, Minus, Plus, UsersThree } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { ViewTransition } from "@/components/view-transition";
import { cn } from "@/lib/utils";
import { ALLERGEN_LABEL, OPTION_GROUPS, defaultOptions, dishById, formatMad, kitchenById, optionExtra } from "./data";
import { useCart, useCartHydration } from "./cart";
import { isVegetarian } from "./m3ak";
import { BackLink, MonoTag, useGoBack } from "./ui";

export function MealScreen({ id }: { id: string }) {
  useCartHydration();
  const goBack = useGoBack();
  const addLine = useCart((state) => state.addLine);
  const dish = dishById(id);
  const [options, setOptions] = useState<string[]>(() => (dish ? defaultOptions(dish) : []));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  if (!dish) return null;
  const kitchen = kitchenById(dish.kitchenId);
  const groups = OPTION_GROUPS[dish.slot];
  const unit = dish.groupPrice + optionExtra(dish, options);
  const saving = Math.round((1 - dish.groupPrice / dish.soloPrice) * 100);

  const pickSingle = (groupId: string, choiceId: string) => {
    const group = groups.find((entry) => entry.id === groupId);
    const others = group?.choices.map((choice) => choice.id) ?? [];
    setOptions((current) => [...current.filter((option) => !others.includes(option)), choiceId]);
  };
  const toggleMulti = (choiceId: string) =>
    setOptions((current) =>
      current.includes(choiceId) ? current.filter((option) => option !== choiceId) : [...current, choiceId],
    );

  return (
    <PageShell
      nav
      footer={
        <div className="flex items-center gap-3">
          <div className="border-border bg-surface flex h-12 shrink-0 items-center rounded-full border px-1">
            <button
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              aria-label="Retirer une portion"
              className="pressable hover:bg-surface-muted grid size-9 place-items-center rounded-full disabled:opacity-30"
            >
              <Minus aria-hidden className="size-4" weight="bold" />
            </button>
            <span className="w-5 text-center font-mono text-[0.9375rem] tabular-nums" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(qty + 1)}
              aria-label="Ajouter une portion"
              className="pressable hover:bg-surface-muted grid size-9 place-items-center rounded-full"
            >
              <Plus aria-hidden className="size-4" weight="bold" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              addLine(dish.id, options, qty, note);
              goBack();
            }}
            className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-5 text-[0.9375rem] font-semibold whitespace-nowrap"
          >
            Ajouter au panier ·{" "}
            <span dir="ltr" className="tabular-nums">{formatMad(unit * qty)}</span>
          </button>
        </div>
      }
    >
      <div className="relative">
        <ViewTransition name={`dish-${dish.id}`} share="dish" default="none">
          <MediaCard src={dish.image} alt={dish.name} ratio="landscape" rounded="none" ornamentSeed={dish.id} sizes="430px" priority />
        </ViewTransition>
        <BackLink className="pressable bg-surface/95 absolute start-4 top-[max(1rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-full shadow-md" />
      </div>

      {/* The sheet rises over the photo; everything below lives on white. */}
      <div className="bg-surface relative -mt-6 rounded-t-[1.75rem]">
        <section className="px-5 pt-6 pb-5">
          <h1 className="font-display text-[1.5rem] leading-tight font-semibold tracking-[-0.01em]">{dish.name}</h1>
          <p className="text-muted-foreground mt-1.5 flex items-center gap-2 text-[0.875rem]">
            <span className="bg-accent-red-soft text-accent-red grid size-6 place-items-center rounded-full text-[0.6875rem] font-semibold">
              {kitchen?.name.replace(/^Cuisine /, "").charAt(0)}
            </span>
            Chez {kitchen?.name.replace(/^Cuisine /, "")} · {kitchen?.district}
          </p>
          <p className="text-muted-foreground mt-3 text-[0.9375rem] leading-relaxed">{dish.description}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {dish.tag ? <MonoTag tone={dish.tag} /> : null}
            {isVegetarian(dish) ? (
              <span className="bg-primary-soft text-primary-ink inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-medium">
                <Leaf aria-hidden className="size-3.5" weight="fill" />
                Végétarien
              </span>
            ) : null}
          </div>

          <details className="border-border group mt-4 border-y py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-semibold">Ingrédients</span>
                <span className="text-muted-foreground block truncate text-[0.8125rem] group-open:hidden">{dish.ingredients.join(", ")}</span>
              </span>
              <CaretDown aria-hidden className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-[0.875rem]">{dish.ingredients.join(", ")}</p>
            <p className="mt-2 text-[0.8125rem]">
              <span className="text-muted-foreground">Allergènes : </span>
              <span className="font-medium">
                {dish.allergens.length ? dish.allergens.map((code) => ALLERGEN_LABEL[code]).join(", ") : "aucun allergène majeur"}
              </span>
            </p>
            <p className="text-muted-foreground mt-1 text-[0.6875rem]">Tels que déclarés par la cuisine.</p>
          </details>

          {/* Group vs solo in one line: the whole point of ordering together. */}
          <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="sr-only">Prix en groupe</span>
            <span dir="ltr" className="text-[1.5rem] leading-none font-semibold tabular-nums">
              {formatMad(dish.groupPrice)}
            </span>
            <span className="sr-only">Prix solo</span>
            <s dir="ltr" className="text-muted-foreground text-[0.9375rem] tabular-nums">
              {formatMad(dish.soloPrice)}
            </s>
            <span className="bg-accent-red-soft text-accent-red inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-semibold">
              <UsersThree aria-hidden className="size-3.5" weight="fill" />
              <span dir="ltr">−{saving} %</span> en groupe
            </span>
          </p>
        </section>

      {groups.map((group) => {
        const selectedInGroup = group.choices.filter((choice) => options.includes(choice.id)).length;
        return (
          <fieldset key={group.id} className="border-border border-t px-5 pb-2">
            <legend className="sr-only">
              {group.label} ({group.kind === "single" ? "1 choix" : `jusqu'à ${group.max}`})
            </legend>
            <p aria-hidden className="flex items-baseline gap-2 pt-4">
              <span className="text-[0.9375rem] font-semibold">{group.label}</span>
              <span className="text-muted-foreground text-xs">
                {group.kind === "single" ? "1 choix" : `jusqu'à ${group.max}`}
              </span>
            </p>
            <ul className="mt-1">
              {group.choices.map((choice) => {
                const checked = options.includes(choice.id);
                const blocked = group.kind === "multi" && !checked && selectedInGroup >= (group.max ?? 99);
                return (
                  <li key={choice.id} className="border-border border-b last:border-b-0">
                    <label className={cn("flex min-h-12 cursor-pointer items-center gap-3 py-2", blocked && "opacity-40")}>
                      <input
                        type={group.kind === "single" ? "radio" : "checkbox"}
                        name={`${dish.id}-${group.id}`}
                        checked={checked}
                        disabled={blocked}
                        onChange={() => (group.kind === "single" ? pickSingle(group.id, choice.id) : toggleMulti(choice.id))}
                        className={cn("accent-primary size-5 shrink-0", group.kind === "single" ? "rounded-full" : "rounded")}
                      />
                      <span className="flex-1 text-[0.9375rem]">{choice.label}</span>
                      {choice.extra ? (
                        <span dir="ltr" className="text-muted-foreground font-mono text-xs tabular-nums">
                          +{formatMad(choice.extra)}
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}

      <section className="border-border border-t px-5 pt-5 pb-8">
        <label htmlFor="note" className="text-[0.9375rem] font-semibold">
          Un mot pour la cuisine
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={120}
          autoComplete="off"
          placeholder="ex. bien cuit, sans olives…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="border-border focus:border-primary bg-background mt-2 w-full resize-none rounded-xl border px-3.5 py-3 text-[0.9375rem] outline-none"
        />
      </section>
      </div>
    </PageShell>
  );
}
