/**
 * Telling the model which language the traveller is reading in.
 *
 * SCOPE, PRECISELY. This affects presentation and nothing else. It is appended to prompts
 * whose output is partly free text a person will read — the visual clues under a
 * recognised photo, the short "what you'd do here" phrases, the constraints we echo back.
 * It never touches:
 *
 *   - enum values (`culture`, `half_day`, `premium`) — fixed English tokens the local
 *     normaliser matches against. A German "Kultur" would be silently dropped.
 *   - JSON keys.
 *   - place names, which stay canonical: a Spanish traveller looking for the Hassan II
 *     Mosque needs the name written on the building, not "Mezquita Hassan II", because
 *     `resolvePoiId` matches it against the curated dataset and the traveller has to
 *     recognise it on a street sign.
 *   - confidence numbers, coordinates, ids, or anything the routing engine reads.
 *
 * Same reasoning in, same structure out; only the prose changes language.
 */
import type { Locale } from "@/types/common";

/** Exported so any prompt that asks for prose in the traveller's language names it the same way. */
export const LANGUAGE_NAME: Record<Locale, string> = {
  fr: "French",
  en: "English",
  ar: "Modern Standard Arabic",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
};

/**
 * The directive, or an empty string for English — the prompts are already written in
 * English and repeating it only spends tokens.
 */
export function outputLanguageDirective(locale: Locale): string {
  if (locale === "en") return "";
  return [
    "",
    `OUTPUT LANGUAGE: the traveller reads ${LANGUAGE_NAME[locale]}.`,
    `- Write every free-text value a person will read in ${LANGUAGE_NAME[locale]}: descriptive labels, activity phrases and quoted constraints.`,
    "- Do NOT translate the JSON keys, and do NOT translate the enum values listed above — copy those exactly as written, in English.",
    "- Do NOT translate proper place names, towns or monuments. Keep the name the place is actually known by locally (Hassan II Mosque stays Hassan II, Habous stays Habous).",
    "- Numbers, ids and confidence values are unaffected.",
  ].join("\n");
}
