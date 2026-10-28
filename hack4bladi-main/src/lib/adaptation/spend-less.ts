/**
 * Spend Less — swap the day's priciest stop for a cheaper one that plays the same role.
 *
 * The replacement must share a category with the stop it replaces, so the day keeps its
 * shape: a paid museum becomes a cheaper cultural stop, not a beach. Candidates come from
 * the curated dataset in the same city, ranked by curation priority, so "cheaper" never
 * means "worse". Segments and arrival times are rebuilt around the new stop.
 */
import { POIS } from "@/data/pois";
import { poiName } from "@/data/poi-utils";
import { calculateMetrics } from "@/lib/routing/metrics";
import {
  buildDelta,
  candidatesFor,
  poiCeilingMad,
  rebuild,
  sharesCategory,
  unchanged,
  visitMinutes,
} from "./shared";
import type { Adapter } from "./types";
import type { AdaptationRequest, AdaptationResult } from "@/types/adaptation";
import type { LocalizedText } from "@/types/common";
import type { POI } from "@/types/poi";

/** Below this the swap is not worth rewriting someone's day for. */
const MIN_SAVING_MAD = 20;

const ALREADY_CHEAP: LocalizedText = {
  en: "This day is already free or close to it.",
  fr: "Cette journée est déjà gratuite ou tout comme.",
  ar: "هذا اليوم مجاني أو يكاد.",
  es: "Este día ya es gratis o casi.",
  de: "Dieser Tag ist schon fast kostenlos.",
  it: "Questa giornata è già gratis o quasi.",
  pt: "Este dia já é grátis ou quase.",
};

const NO_CHEAPER: LocalizedText = {
  en: "No cheaper stop nearby plays the same role in the day.",
  fr: "Aucune étape moins chère à proximité ne joue le même rôle.",
  ar: "لا توجد محطة أرخص قريبة تؤدي الدور نفسه.",
  es: "No hay cerca una parada más barata que haga el mismo papel.",
  de: "In der Nähe übernimmt kein günstigerer Stopp dieselbe Rolle.",
  it: "Nei dintorni non c'è una tappa più economica con lo stesso ruolo.",
  pt: "Não há por perto uma paragem mais barata com o mesmo papel.",
};

function headlineFor(saved: number, added: POI): LocalizedText {
  return {
    en: `${saved} MAD less · ${poiName(added, "en")} instead`,
    fr: `${saved} MAD de moins · ${poiName(added, "fr")} à la place`,
    ar: `أقل بـ ${saved} درهم · ${poiName(added, "ar")} بدلاً منها`,
  };
}

export const spendLessAdapter: Adapter = {
  type: "spend_less",

  async apply({ trip }: AdaptationRequest): Promise<AdaptationResult> {
    // The one stop carrying most of the day's admission cost.
    const target = [...trip.stops].sort(
      (a, b) => poiCeilingMad(b.poi) - poiCeilingMad(a.poi) || a.id.localeCompare(b.id),
    )[0];

    if (poiCeilingMad(target.poi) <= MIN_SAVING_MAD) {
      return unchanged("spend_less", trip, ALREADY_CHEAP);
    }

    const replacement = candidatesFor(trip, POIS).find(
      (poi) =>
        sharesCategory(poi, target.poi) &&
        poiCeilingMad(target.poi) - poiCeilingMad(poi) >= MIN_SAVING_MAD,
    );
    if (!replacement) return unchanged("spend_less", trip, NO_CHEAPER);

    const swapped = trip.stops.map((stop) =>
      stop.id === target.id
        ? {
            ...stop,
            poi: replacement,
            poiId: replacement.id,
            durationMinutes: visitMinutes(replacement, trip.profile),
            reason: {
              en: "Swapped in to bring the day's cost down.",
              fr: "Intégrée pour faire baisser le coût de la journée.",
              ar: "أُضيفت لخفض تكلفة اليوم.",
              es: "Cambiada para bajar el coste del día.",
              de: "Eingewechselt, um die Tageskosten zu senken.",
              it: "Inserita per abbassare il costo della giornata.",
              pt: "Trocada para baixar o custo do dia.",
            },
          }
        : stop,
    );

    const { stops, segments } = rebuild(swapped);
    const metrics = calculateMetrics(stops, segments);
    const saved = trip.metrics.estimatedCostMad[1] - metrics.estimatedCostMad[1];

    if (saved < MIN_SAVING_MAD) return unchanged("spend_less", trip, NO_CHEAPER);

    // The legs on either side of the swapped stop are the ones the map should animate.
    const changedSegmentIds = segments
      .filter((segment) => segment.fromStopId === target.id || segment.toStopId === target.id)
      .map((segment) => segment.id);

    return {
      type: "spend_less",
      applied: true,
      trip: { ...trip, stops, segments, metrics },
      delta: buildDelta(trip.metrics, metrics),
      headline: headlineFor(saved, replacement),
      changedSegmentIds,
    };
  },
};
