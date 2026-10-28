/**
 * Rainy Day — move the open-air stops under a roof.
 *
 * Only stops marked `outdoor` are swapped; `mixed` ones (a covered market, a mosque with
 * an interior) already work in the rain and are left alone. Each replacement is an
 * `indoor` POI in the same city that shares a category with the stop it replaces, so the
 * day keeps its shape. If nothing indoors is available, it says so rather than shuffling.
 */
import { POIS } from "@/data/pois";
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

/** How much more a sheltered stand-in may cost before it stops being a fair swap. */
const PRICE_TOLERANCE_MAD = 60;

const ALREADY_SHELTERED: LocalizedText = {
  en: "Every stop already works in the rain.",
  fr: "Chaque étape fonctionne déjà sous la pluie.",
  ar: "كل محطة تصلح أصلاً تحت المطر.",
  es: "Todas las paradas ya funcionan con lluvia.",
  de: "Alle Stopps funktionieren auch bei Regen.",
  it: "Tutte le tappe funzionano già con la pioggia.",
  pt: "Todas as paragens já funcionam com chuva.",
};

const NO_INDOOR: LocalizedText = {
  en: "No indoor stop nearby fits this day.",
  fr: "Aucune étape en intérieur à proximité ne convient.",
  ar: "لا توجد محطة داخلية قريبة تناسب هذا اليوم.",
  es: "No hay ninguna parada cubierta cerca que encaje.",
  de: "In der Nähe passt kein überdachter Stopp in diesen Tag.",
  it: "Nei dintorni non c'è una tappa al coperto che ci stia.",
  pt: "Não há nenhuma paragem coberta por perto que encaixe.",
};

function headlineFor(moved: number, total: number): LocalizedText {
  return {
    en: `${moved} of ${total} stops moved indoors`,
    fr: `${moved} étapes sur ${total} passées en intérieur`,
    ar: `${moved} من ${total} محطات انتقلت إلى الداخل`,
  };
}

export const rainyDayAdapter: Adapter = {
  type: "rainy_day",

  async apply({ trip }: AdaptationRequest): Promise<AdaptationResult> {
    const exposed = trip.stops.filter((stop) => stop.poi.indoorOutdoor === "outdoor");
    if (exposed.length === 0) return unchanged("rainy_day", trip, ALREADY_SHELTERED);

    const indoor = candidatesFor(trip, POIS).filter((poi) => poi.indoorOutdoor === "indoor");
    const claimed = new Set<string>();
    const movedStopIds: string[] = [];

    const swapped = trip.stops.map((stop) => {
      if (stop.poi.indoorOutdoor !== "outdoor") return stop;

      /*
       * Same role, and not a bigger bill. Without the price guard this swapped a free
       * medina walk for a 250 MAD cooking class and called it a rainy-day plan — the
       * traveller asked for a roof, not a spending decision.
       */
      const affordable = (poi: (typeof indoor)[number]) =>
        poiCeilingMad(poi) <= poiCeilingMad(stop.poi) + PRICE_TOLERANCE_MAD;
      const free = (poi: (typeof indoor)[number]) => !claimed.has(poi.id);

      const pick =
        indoor.find((poi) => free(poi) && sharesCategory(poi, stop.poi) && affordable(poi)) ??
        indoor.find((poi) => free(poi) && affordable(poi)) ??
        indoor.find((poi) => free(poi) && sharesCategory(poi, stop.poi));
      if (!pick) return stop;

      claimed.add(pick.id);
      movedStopIds.push(stop.id);
      return {
        ...stop,
        poi: pick,
        poiId: pick.id,
        durationMinutes: visitMinutes(pick, trip.profile),
        reason: {
          en: "Indoors, swapped in for the rain.",
          fr: "En intérieur, remplacée à cause de la pluie.",
          ar: "في الداخل، استُبدلت بسبب المطر.",
          es: "Bajo techo, cambiada por la lluvia.",
          de: "Überdacht, wegen des Regens eingewechselt.",
          it: "Al coperto, inserita per via della pioggia.",
          pt: "Coberta, trocada por causa da chuva.",
        },
      };
    });

    if (movedStopIds.length === 0) return unchanged("rainy_day", trip, NO_INDOOR);

    const { stops, segments } = rebuild(swapped);
    const metrics = calculateMetrics(stops, segments);

    const changedSegmentIds = segments
      .filter(
        (segment) =>
          movedStopIds.includes(segment.fromStopId) || movedStopIds.includes(segment.toStopId),
      )
      .map((segment) => segment.id);

    return {
      type: "rainy_day",
      applied: true,
      trip: { ...trip, stops, segments, metrics },
      delta: buildDelta(trip.metrics, metrics),
      headline: headlineFor(movedStopIds.length, trip.stops.length),
      changedSegmentIds,
    };
  },
};
