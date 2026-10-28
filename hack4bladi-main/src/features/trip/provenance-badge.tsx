"use client";

/**
 * How a stop's provenance is said on screen: quietly, and only where it changes a
 * decision.
 *
 * The visual language is deliberately borrowed rather than invented. The two dataset
 * states share one glyph at two weights — same family, different confidence — and an AI
 * suggestion carries `Sparkle`, which is already what this app draws wherever a model did
 * something (the guide's build button, the curator's card). A traveller does not have to
 * learn a new symbol to read this.
 *
 * What it deliberately is not: a banner, a card, a shield, a coloured panel, or a
 * checkmark on everything. Only the AI state is tinted, because only the AI state changes
 * what a traveller should do next.
 *
 * `unknown` renders nothing at all. Saying nothing is the honest answer when we cannot
 * place a stop, and it is the one case where a badge would be worse than a gap.
 */
import { SealCheck, Sparkle } from "@phosphor-icons/react";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { POI } from "@/types/poi";
import { poiProvenance, type PoiProvenance } from "./provenance";

interface Presentation {
  icon: typeof SealCheck;
  /** Phosphor weight. Fill for the corroborated state, regular for everything else. */
  weight: "fill" | "regular";
  label: MessageKey;
  note: MessageKey;
  /** Icon tint only. The label stays muted so the badge never outranks the place name. */
  tone: string;
}

const PRESENTATION: Record<Exclude<PoiProvenance, "unknown">, Presentation> = {
  verified: {
    icon: SealCheck,
    weight: "fill",
    label: "trip.provenance.verified",
    note: "trip.provenance.verifiedNote",
    tone: "text-primary-ink",
  },
  curated: {
    icon: SealCheck,
    weight: "regular",
    label: "trip.provenance.curated",
    note: "trip.provenance.curatedNote",
    tone: "text-muted-foreground",
  },
  ai_suggested: {
    icon: Sparkle,
    weight: "regular",
    label: "trip.provenance.ai",
    note: "trip.provenance.aiNote",
    tone: "text-warning",
  },
};

/** Resolves the presentation, or null when there is nothing we can honestly say. */
function presentationFor(provenance: PoiProvenance): Presentation | null {
  return provenance === "unknown" ? null : PRESENTATION[provenance];
}

/**
 * One line of metadata: glyph, then label. Sits under the name, never beside it.
 *
 * `only` narrows it to the states worth interrupting for — the timeline passes
 * `["ai_suggested"]`, because four "Verified place" chips down a list is noise and the one
 * stop the guide invented is not.
 */
export function ProvenanceBadge({
  poi,
  provenance,
  only,
  className,
}: {
  poi?: Pick<POI, "id" | "verification"> | null;
  /** Pass a resolved state directly, e.g. when it has already been computed. */
  provenance?: PoiProvenance;
  only?: readonly PoiProvenance[];
  className?: string;
}) {
  const { t } = useTranslation();
  const resolved = provenance ?? poiProvenance(poi);
  if (only && !only.includes(resolved)) return null;

  const presentation = presentationFor(resolved);
  if (!presentation) return null;

  const { icon: Icon, weight, label, tone } = presentation;
  return (
    <span
      className={cn(
        "text-muted-foreground inline-flex items-center gap-1 text-[11px] font-semibold",
        className,
      )}
    >
      <Icon aria-hidden className={cn("size-3.5 shrink-0", tone)} weight={weight} />
      {t(label)}
    </span>
  );
}

/**
 * The sentence behind the badge, for a sheet where someone has gone looking.
 *
 * Factual and short by design. There is no "possibly hallucinated" anywhere in this
 * product: an AI suggestion is a real proposal that we have not confirmed, and telling a
 * traveller to check before they go is both the truth and the useful thing to say.
 *
 * `labelled` exists because a screen that already carries the badge higher up must not
 * print it twice — which the place sheet did, once under the title and once here, until
 * a render test caught two copies of "Verified place" in one sheet.
 */
export function ProvenanceNote({
  poi,
  provenance,
  labelled = true,
  className,
}: {
  poi?: Pick<POI, "id" | "verification"> | null;
  provenance?: PoiProvenance;
  /** false where the badge is already on screen above this. */
  labelled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const resolved = provenance ?? poiProvenance(poi);
  const presentation = presentationFor(resolved);
  if (!presentation) return null;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {labelled ? <ProvenanceBadge provenance={resolved} /> : null}
      <p className="text-muted-foreground text-[11px] leading-snug text-pretty">
        {t(presentation.note)}
      </p>
    </div>
  );
}
