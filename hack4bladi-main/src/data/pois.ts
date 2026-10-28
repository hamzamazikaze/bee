/**
 * The curated POIs of the Casablanca-Settat pilot dataset: 25 places plus the curated
 * experiences.
 *
 * This file is a barrel on purpose. The four golden POIs are imported straight from
 * src/data/fixtures/golden-pois.ts — the same objects the demo renders — so their ids and
 * coordinates cannot drift from the fixtures. The other 21 live in pois-casablanca.ts and
 * pois-coast.ts, each documenting how its coordinates were researched.
 */
import type { POI } from "@/types/poi";
import {
  HABOUS,
  HASSAN_II,
  MARCHE_CENTRAL,
  SACRE_COEUR,
} from "@/data/fixtures/golden-pois";
import { CASABLANCA_POIS } from "./pois-casablanca";
import { COAST_POIS } from "./pois-coast";
import { EXPERIENCES } from "./experiences";

/** The golden four, re-exported so nothing downstream re-declares them. */
export const GOLDEN_DATASET_POIS: POI[] = [
  HASSAN_II,
  HABOUS,
  MARCHE_CENTRAL,
  SACRE_COEUR,
];

/**
 * Places first, then the curated experiences.
 *
 * They share one array because they are the same thing to the engine: a stop with
 * coordinates, categories, a duration and a price. `kind` is what tells them apart when
 * composing a day, not a separate pipeline.
 */
export const POIS: POI[] = [
  ...GOLDEN_DATASET_POIS,
  ...CASABLANCA_POIS,
  ...COAST_POIS,
  ...EXPERIENCES,
];

export { CASABLANCA_POIS, COAST_POIS, EXPERIENCES };

const POIS_BY_ID = new Map(POIS.map((poi) => [poi.id, poi]));

export function getPoiById(id: string): POI | undefined {
  return POIS_BY_ID.get(id);
}

export function getPoisByCity(city: string): POI[] {
  const needle = city.trim().toLowerCase();
  return POIS.filter((poi) => poi.city.toLowerCase() === needle);
}
