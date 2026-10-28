/**
 * Grounding: turning a model's free-text place name into a curated POI id.
 *
 * The model is never asked for an id and its answer is never trusted as one. It says
 * "Hassan II Mosque"; this file decides whether that is `poi-hassan-ii`. If nothing
 * matches we return null and the trip engine simply has one less hint to work with.
 *
 * Matching is on token overlap, not substrings, because the model answers in whichever
 * language and word order it likes: "Hassan II Mosque", "Mosquée Hassan II" and
 * "مسجد الحسن الثاني" must all land on the same POI.
 *
 * Deliberately free of any server-only import so it stays unit-testable.
 */
import { POIS } from "@/data/pois";
import type { PoiCandidate } from "@/types/intent";
import type { POI } from "@/types/poi";

/** Words too common to identify anything on their own. */
const STOPWORDS = new Set([
  "de", "du", "des", "la", "le", "les", "l", "d", "el", "al", "et", "and", "of", "the",
  "a", "en", "sur", "at", "in", "to", "من", "في",
]);

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .trim();
}

function tokenise(value: string): string[] {
  return normalise(value)
    .split(" ")
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

/** Every name a POI answers to, as token sets. */
function aliasesOf(poi: POI): string[][] {
  return [poi.name, poi.slug, ...Object.values(poi.localizedName ?? {})]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(tokenise)
    .filter((tokens) => tokens.length > 0);
}

/** Names the model can be shown as a hint. Grounding, not an id vocabulary. */
export const CURATED_PLACE_NAMES: string[] = POIS.map((poi) => poi.name);

/**
 * Resolves a detected place name to a curated POI id, or null.
 *
 * Requires two shared significant words (or every word of a one-word name), so a bare
 * "Casablanca" or "a beach somewhere" resolves to nothing rather than to the nearest
 * famous thing. Deterministic: highest overlap wins, ties go to the earlier POI.
 */
export function resolvePoiId(
  place: string | null | undefined,
  pois: POI[] = POIS,
): string | null {
  if (!place) return null;
  const needle = new Set(tokenise(place));
  if (needle.size === 0) return null;

  let bestId: string | null = null;
  let bestScore = 0;

  for (const poi of pois) {
    for (const alias of aliasesOf(poi)) {
      const overlap = alias.filter((token) => needle.has(token)).length;
      const required = Math.min(2, alias.length);
      if (overlap < required) continue;
      if (overlap > bestScore) {
        bestScore = overlap;
        bestId = poi.id;
      }
    }
  }
  return bestId;
}

/**
 * The same match, ranked and explained: every curated POI the text could plausibly be
 * naming, best first.
 *
 * Qualification is exactly `resolvePoiId`'s rule — two shared significant words, or every
 * word of a one-word name — so this can never surface a POI the strict resolver would
 * have refused. City and tag overlap only *rank* the survivors; neither can promote a POI
 * that no name matched. That is the difference between "which of these is it" and
 * "guessing the nearest famous thing".
 *
 * Deterministic: score, then curation priority, then id.
 */
export function resolvePoiCandidates(
  text: string | null | undefined,
  options: { city?: string | null; limit?: number; pois?: POI[] } = {},
): PoiCandidate[] {
  const { city = null, limit = 3, pois = POIS } = options;
  if (!text) return [];
  const needle = new Set(tokenise(text));
  if (needle.size === 0) return [];

  const cityTokens = city ? new Set(tokenise(city)) : null;
  const scored: { candidate: PoiCandidate; priority: number }[] = [];

  for (const poi of pois) {
    let best = 0;
    let matched: string[] = [];

    for (const alias of aliasesOf(poi)) {
      const hits = alias.filter((token) => needle.has(token));
      if (hits.length < Math.min(2, alias.length)) continue;
      const ratio = hits.length / alias.length;
      if (ratio > best) {
        best = ratio;
        matched = hits;
      }
    }
    if (best === 0) continue;

    const reasons = [`name: ${matched.join(", ")}`];
    let score = 0.6 + best * 0.3;

    // A city said out loud is corroboration, not evidence on its own.
    const cityHit =
      (cityTokens && tokenise(poi.city).some((token) => cityTokens.has(token))) ||
      tokenise(poi.city).some((token) => needle.has(token));
    if (cityHit) {
      score += 0.06;
      reasons.push(`city: ${poi.city}`);
    }

    const tagHits = poi.tags.filter((tag) => tokenise(tag).some((token) => needle.has(token)));
    if (tagHits.length > 0) {
      score += Math.min(0.04, tagHits.length * 0.02);
      reasons.push(`tags: ${tagHits.slice(0, 2).join(", ")}`);
    }

    scored.push({
      candidate: {
        poiId: poi.id,
        name: poi.name,
        city: poi.city,
        score: Math.min(1, Number(score.toFixed(3))),
        reason: reasons.join(" · "),
        kind: "name",
      },
      priority: poi.priority,
    });
  }

  return scored
    .sort(
      (a, b) =>
        b.candidate.score - a.candidate.score ||
        b.priority - a.priority ||
        a.candidate.poiId.localeCompare(b.candidate.poiId),
    )
    .slice(0, Math.max(1, limit))
    .map((entry) => entry.candidate);
}

/**
 * "We do not have that place — here is the closest one we do cover."
 *
 * The honest answer when the model correctly named somewhere real that the curated
 * dataset simply does not include: a photo of Sidi Bouzid beach is not a failure of
 * recognition, it is a gap in coverage, and saying so beats both inventing a match and
 * shrugging. Only ever reached when no name matched — this can never overrule
 * `resolvePoiCandidates`.
 *
 * Scoped to the named city, because "nearest" without coordinates we trust is a lie:
 * the model gives us a town, the dataset gives us what is in it. Interest hints break
 * ties, then curation priority. Deterministic.
 *
 * Scores are capped at 0.5 so a coverage candidate can never reach the HIGH band or
 * outrank a real name match anywhere downstream.
 */
export function coverageCandidates(
  city: string | null | undefined,
  options: { interests?: readonly string[]; limit?: number; pois?: POI[] } = {},
): PoiCandidate[] {
  const { interests = [], limit = 2, pois = POIS } = options;
  if (!city) return [];
  const cityTokens = new Set(tokenise(city));
  if (cityTokens.size === 0) return [];

  const wanted = new Set(interests);
  const scored = pois
    .filter((poi) => tokenise(poi.city).some((token) => cityTokens.has(token)))
    .map((poi) => {
      const matched = poi.categories.filter((category) => wanted.has(category));
      const hit = matched.length > 0;
      /* An experience is something you book, not somewhere you were photographed. It can
         still be offered, but never ahead of an actual place. */
      const isPlace = poi.kind === undefined || poi.kind === "place";
      return {
        candidate: {
          poiId: poi.id,
          name: poi.name,
          city: poi.city,
          score: Number((hit ? 0.5 : 0.35).toFixed(3)),
          reason: hit
            ? `coverage: ${poi.city} · ${matched.join(", ")}`
            : `coverage: ${poi.city}`,
          kind: "coverage" as const,
        },
        priority: poi.priority,
        hit,
        isPlace,
      };
    });

  return scored
    .sort(
      (a, b) =>
        Number(b.isPlace) - Number(a.isPlace) ||
        Number(b.hit) - Number(a.hit) ||
        b.priority - a.priority ||
        a.candidate.poiId.localeCompare(b.candidate.poiId),
    )
    .slice(0, Math.max(1, limit))
    .map((entry) => entry.candidate);
}
