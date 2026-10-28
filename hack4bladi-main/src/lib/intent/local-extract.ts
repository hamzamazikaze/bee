/**
 * Understanding without a model.
 *
 * When Gemini is missing or down, a typed or spoken sentence should still tell us
 * something — "half a day in Casablanca, culture and food, not too much walking" is not a
 * hard parse. This is a deterministic keyword pass over the three languages the app
 * speaks, and it feeds the very same `buildDraft` the model path uses, so a degraded
 * draft has the same shape as a real one and the confirmation screen cannot tell them
 * apart structurally.
 *
 * It is deliberately conservative: a word it does not recognise contributes nothing, and
 * the draft it produces is marked `degraded`, which caps its confidence below the HIGH
 * band. The traveller confirms; we never claim certainty we did not earn.
 */
import type { RawIntent } from "./normalize";

/** Diacritics folded, punctuation flattened. Arabic and Latin both survive. */
function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function has(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(normalise(needle)));
}

/** en · fr · ar for each value. Ordered most-specific first where it matters. */
const INTEREST_WORDS = {
  culture: ["culture", "cultural", "heritage", "history", "museum", "monument", "mosque",
    "culturel", "patrimoine", "histoire", "musee", "mosquee", "ثقافة", "تراث", "تاريخ", "متحف", "مسجد"],
  food: ["food", "eat", "eating", "restaurant", "cuisine", "street food", "tagine", "seafood",
    "manger", "nourriture", "gastronomie", "أكل", "طعام", "مطعم", "مأكولات",
    // Darija: "الماكلة" is how a Moroccan says food, far more often than "طعام".
    "ماكلة", "الماكلة", "ماكله", "ناكل", "طاجين", "الحوت"],
  coast_nature: ["beach", "coast", "sea", "ocean", "atlantic", "lagoon", "nature", "sunset",
    "plage", "cote", "mer", "ocean", "lagune", "coucher de soleil", "شاطئ", "بحر", "ساحل", "طبيعة"],
  hidden_gems: ["hidden", "local", "authentic", "off the beaten", "secret", "like a local",
    "cache", "authentique", "locaux", "insolite", "خفي", "محلي", "أصيل"],
  art_creative: ["art", "artist", "gallery", "design", "street art", "architecture", "photo",
    "galerie", "artiste", "فن", "معرض", "تصميم"],
  activities: ["surf", "hike", "hiking", "walk tour", "adventure", "kayak", "activity", "sport",
    "randonnee", "aventure", "activite", "مغامرة", "رياضة", "نشاط"],
} as const;

const TIME_WORDS = {
  few_hours: ["couple of hours", "a few hours", "two hours", "quick", "short",
    "quelques heures", "deux heures", "rapide", "court", "ساعتين", "بضع ساعات", "سريع"],
  half_day: ["half day", "half a day", "morning", "afternoon",
    "demi journee", "demi-journee", "matinee", "apres midi", "نصف يوم", "صباح", "بعد الظهر",
    // Darija
    "نص نهار", "نص النهار", "غير الصباح"],
  full_day: ["full day", "whole day", "all day", "one day", "entire day",
    "journee entiere", "toute la journee", "une journee", "يوم كامل", "طوال اليوم",
    // Darija: a day is "نهار", not "يوم".
    "نهار كامل", "نهار كامل", "النهار كامل", "نهار زوين كامل"],
} as const;

/* "budget" on its own is not a signal — "medium budget" and "budget moyen" contain it and
   mean the opposite of "low". Only qualified phrases count. */
const BUDGET_WORDS = {
  low: ["cheap", "low budget", "small budget", "tight budget", "affordable", "not expensive",
    "pas cher", "petit budget", "economique", "abordable", "رخيص", "ميزانية صغيرة", "اقتصادي"],
  medium: ["medium", "moderate", "mid range", "reasonable", "average",
    "moyen", "budget moyen", "raisonnable", "متوسط", "ميزانية متوسطة"],
  premium: ["premium", "luxury", "high end", "splurge", "fine dining", "expensive",
    "luxe", "haut de gamme", "raffine", "فاخر", "رفاهية"],
} as const;

const PACE_WORDS = {
  relaxed: ["relaxed", "relaxing", "slow", "chill", "take it easy", "calm", "no rush",
    "detendu", "relaxant", "tranquille", "calme", "sans se presser", "هادئ", "مريح", "بدون عجلة"],
  balanced: ["balanced", "normal pace", "a bit of everything",
    "equilibre", "un peu de tout", "متوازن"],
  explorer: ["packed", "as much as possible", "see everything", "intense", "explorer",
    "maximum", "voir un maximum", "intense", "مكثف", "أكبر قدر"],
} as const;

const AVOID_WALKING = [
  "not too much walking", "no long walks", "avoid walking", "less walking", "little walking",
  "cannot walk", "can t walk", "bad knees", "wheelchair", "stroller", "tired legs",
  "pas trop de marche", "pas trop marcher", "eviter de marcher", "peu de marche", "moins de marche",
  "لا أريد المشي", "مشي قليل", "بدون مشي كثير",
  /* Darija negation wraps the verb: "ما بغيتش نمشي بزاف" = "I don't want to walk much".
     Matching the fragment "نمشي بزاف" catches it whichever way the ASR spaces the ما…ش. */
  "نمشي بزاف", "ما بغيتش نمشي", "مابغيتش نمشي", "ما نمشيش", "بلا ما نمشي", "ماشي بزاف ديال المشي",
] as const;

const LIKES_WALKING = [
  "love walking", "happy to walk", "walk a lot", "on foot",
  "j aime marcher", "beaucoup de marche", "a pied", "أحب المشي",
] as const;

/** The towns the curated dataset actually covers, plus how they are said locally. */
const CITY_ALIASES: Record<string, readonly string[]> = {
  /* Darija aliases mirror the list proven in the Checkmate project: a Moroccan says
     "كازا", and the ASR often glues the preposition on — "فكازا". Substring matching
     handles the glue; the aliases handle the vocabulary. */
  Casablanca: ["casablanca", "casa", "dar el beida", "الدار البيضاء", "دار البيضاء",
    "كازابلانكا", "البيضاء", "كازا"],
  /* Latin-script Darija is how people actually type it: "ljdida", "lwalidia". The
     model handles these; this table is the no-key path and has to as well. */
  "El Jadida": ["el jadida", "eljadida", "ljdida", "jdida", "lejdida", "mazagan",
    "الجديدة", "الجديده"],
  Azemmour: ["azemmour", "azzemour", "zemmour", "أزمور"],
  Oualidia: ["oualidia", "walidia", "lwalidia", "wlidiya", "الوليدية"],
  Mohammedia: ["mohammedia", "mohammadia", "fedala", "المحمدية"],
  Boulaouane: ["boulaouane", "بولعوان"],
};

function firstMatch<T extends string>(
  text: string,
  table: Record<T, readonly string[]>,
): T | null {
  for (const [value, words] of Object.entries(table) as [T, readonly string[]][]) {
    if (has(text, words)) return value;
  }
  return null;
}

/**
 * A `RawIntent` in exactly the shape the model is asked for, so `buildDraft` treats both
 * paths identically. Every field it cannot support is simply absent.
 */
export function localExtract(text: string | null | undefined): RawIntent {
  if (!text || !text.trim()) return {};
  const haystack = normalise(text);
  const intent: RawIntent = {};

  const interests = (Object.keys(INTEREST_WORDS) as (keyof typeof INTEREST_WORDS)[]).filter(
    (interest) => has(haystack, INTEREST_WORDS[interest]),
  );
  if (interests.length > 0) intent.interests = interests.slice(0, 3);

  const time = firstMatch(haystack, TIME_WORDS);
  if (time) intent.timeAvailable = time;

  const budget = firstMatch(haystack, BUDGET_WORDS);
  if (budget) intent.budgetLevel = budget;

  const pace = firstMatch(haystack, PACE_WORDS);
  if (pace) intent.pace = pace;

  if (has(haystack, AVOID_WALKING)) intent.avoidLongWalks = true;
  else if (has(haystack, LIKES_WALKING)) intent.avoidLongWalks = false;

  const city = Object.entries(CITY_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => haystack.includes(normalise(alias))),
  )?.[0];
  if (city) intent.city = city;

  /* Deliberately no place detection here. `buildDraft` grounds the raw text against the
     curated dataset with the same token resolver the model path uses — a second, weaker
     substring index would only disagree with it. The dataset's canonical name is French
     ("Mosquée Hassan II"), so substring matching would miss an English caption anyway.

     No self-report either: a keyword pass has no opinion about how right it is. */
  return intent;
}
