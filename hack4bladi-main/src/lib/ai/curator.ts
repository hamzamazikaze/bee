/**
 * The day curator — the recommendation half of the understanding layer.
 *
 * Everything else in @/lib/ai reads the traveller. This reads the *catalogue*: all 25
 * curated places and every curated experience, with what each one actually is — a
 * workshop you leave holding something, a family kitchen, a lagoon at sunset — and picks
 * which of them belong in one day for this particular person, with a line saying why.
 *
 * It obeys rule 1 exactly. The model never returns a stop, a time, a coordinate or an
 * order: it returns ids that already exist in our dataset and a sentence each. Anything
 * it invents is dropped here, and the trip engine still decides feasibility, budget,
 * opening hours and the narrative order of the day. A curation is a strong opinion handed
 * to the engine, never an itinerary handed to the traveller.
 *
 * With no OPENAI_API_KEY, or a slow answer, `curate` returns null and the day is built
 * exactly as it was before. That is a supported path, not a failure.
 */
import "server-only";
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { boundedSignal } from "@/lib/ai/http";
import { chatJson } from "@/lib/ai/openai-client";
import { LANGUAGE_NAME } from "@/lib/ai/output-language";
import { hours, media } from "@/data/poi-utils";
import { INTERESTS, type Interest } from "@/types/profile";
import type { Locale, LocalizedText } from "@/types/common";
import type { IndoorOutdoor, POI, PriceRange } from "@/types/poi";
import type { TripProfile } from "@/types/profile";
import { TRIP_STOP_COUNT } from "@/types/trip";

export interface CuratorPick {
  poiId: string;
  /** One line, authored in the traveller's own language. Shown under the stop. */
  reason: string;
}

export interface Curation {
  /** One sentence naming the shape of the day. */
  headline: string;
  /** Validated against the dataset, deduped, at most TRIP_STOP_COUNT. */
  picks: CuratorPick[];
  /**
   * The guide's line to the traveller: what it understood, and — when they asked for
   * something the catalogue does not have — what it chose instead and why.
   */
  note: string;
  /**
   * Stops the model authored itself because the catalogue did not cover the ask. Demo
   * mode: real places from the model's own knowledge, flagged `unverified` end to end.
   * Their ids appear in `picks` like any other.
   */
  pois: POI[];
  /** poi id → English Wikipedia title for the custom stops; consumed by `withWikiImages`. */
  wiki: Record<string, string>;
}

const PRICE_RANGES: readonly PriceRange[] = ["free", "0_30", "30_60", "60_150", "150_300", "300_plus", "unknown"];
const INDOOR_OUTDOOR: readonly IndoorOutdoor[] = ["indoor", "outdoor", "mixed"];

const str = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const clock = (value: unknown, fallback: string): string =>
  typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
const same = (text: string): LocalizedText => ({ en: text, fr: text, ar: text });

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

/**
 * A stop the model described rather than picked. Turned into the same POI shape the
 * catalogue uses so the engine, the map and every sheet render it without knowing.
 *
 * ponytail: demo-mode. Nothing here is verified by us — the POI says so in
 * `verification`/`availability`, and the UI already renders those honestly.
 */
export function syntheticPoi(raw: unknown, index: number): POI | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name, 80);
  const city = str(r.city, 60);
  const lat = Number(r.lat);
  const lng = Number(r.lng);
  if (!name || !city || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const categories = (Array.isArray(r.categories) ? r.categories : []).filter(
    (c): c is Interest => typeof c === "string" && (INTERESTS as readonly string[]).includes(c),
  );
  if (categories.length === 0) categories.push("culture");
  const slug = slugify(name) || `stop-${index + 1}`;
  const duration = Number(r.durationMinutes);

  return {
    id: `ai-${slug}`,
    slug,
    name,
    city,
    region: city,
    coordinates: { lat, lng },
    coordinateType: "representative",
    categories,
    tags: (Array.isArray(r.tags) ? r.tags : []).filter((t): t is string => typeof t === "string").slice(0, 6),
    openingHours: hours(clock(r.open, "09:00"), clock(r.close, "19:00")),
    baseDurationMinutes: Number.isFinite(duration) ? Math.min(240, Math.max(30, duration)) : 90,
    priceRange: PRICE_RANGES.includes(r.priceRange as PriceRange) ? (r.priceRange as PriceRange) : "unknown",
    approxPriceMad: null,
    indoorOutdoor: INDOOR_OUTDOOR.includes(r.indoorOutdoor as IndoorOutdoor)
      ? (r.indoorOutdoor as IndoorOutdoor)
      : "mixed",
    walkingScore: 2,
    cultural: { story: same(str(r.story, 600) || name), tip: same(str(r.tip, 240)) },
    media: media(slug, categories[0]),
    hero: false,
    signature: index === 0,
    priority: 3,
    verification: "unverified",
    availability: { status: "unknown" },
  };
}

/**
 * One list of picks, catalogue ids and custom stops alike. Shared with the guide so both
 * brains obey the same boundary.
 */
export function parsePicks(
  raw: unknown,
  pois: POI[],
): { picks: CuratorPick[]; extra: POI[]; wiki: Record<string, string> } {
  const known = new Set(pois.map((poi) => poi.id));
  const picks: CuratorPick[] = [];
  const extra: POI[] = [];
  /** poi id → English Wikipedia title, resolved to a photo later by `withWikiImages`. */
  const wiki: Record<string, string> = {};
  const seen = new Set<string>();
  if (!Array.isArray(raw)) return { picks, extra, wiki };
  /* Spare custom stops past the four are kept as pool, not as picks: when one pick falls
     to the one-city guard below, the engine tops the day up from them instead of the
     golden fallback throwing the whole authored day away. */
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { id, custom, reason } = entry as { id?: unknown; custom?: unknown; reason?: unknown };
    let poiId: string | null = null;
    if (typeof id === "string" && known.has(id)) poiId = id;
    else if (custom && extra.length < TRIP_STOP_COUNT + 2) {
      const poi = syntheticPoi(custom, extra.length);
      if (poi && !known.has(poi.id) && !seen.has(poi.id)) {
        poiId = poi.id;
        extra.push(poi);
        const title = str((custom as Record<string, unknown>).wikipedia, 120);
        if (title) wiki[poi.id] = title;
      }
    }
    if (!poiId || seen.has(poiId)) continue;
    seen.add(poiId);
    if (picks.length < TRIP_STOP_COUNT) {
      picks.push({ poiId, reason: typeof reason === "string" ? reason.trim().slice(0, 140) : "" });
    }
  }

  /* A model-authored day is one city or it is not a day: a catalogue stop 240 km from
     the custom ones would make the engine's distance repair throw the whole day away. */
  if (extra.length > 0) {
    const city = extra[0].city.trim().toLowerCase();
    const cityOf = new Map([...pois, ...extra].map((poi) => [poi.id, poi.city.trim().toLowerCase()]));
    return {
      picks: picks.filter((pick) => cityOf.get(pick.poiId) === city),
      extra: extra.filter((poi) => poi.city.trim().toLowerCase() === city),
      wiki,
    };
  }
  return { picks, extra, wiki };
}

/**
 * A photo per custom stop, from the Wikipedia article the model named. Wikimedia is the
 * one image host a model can point at without inventing a URL. Parallel, 3s each, and a
 * miss simply keeps the category image.
 */
export async function withWikiImages(pois: POI[], wiki: Record<string, string>): Promise<POI[]> {
  return Promise.all(
    pois.map(async (poi) => {
      const title = wiki[poi.id];
      if (!title) return poi;
      try {
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
          { signal: AbortSignal.timeout(3_000), headers: { accept: "application/json" } },
        );
        if (!response.ok) return poi;
        const data = (await response.json()) as { thumbnail?: { source?: string } };
        const thumb = data.thumbnail?.source;
        if (!thumb || !thumb.startsWith("https://upload.wikimedia.org/")) return poi;
        /* As handed back, query string included: Wikimedia answers 400 to any other
           width on this path. 330px is plenty for a 56px thumb and a phone-wide hero. */
        return { ...poi, media: { ...poi.media, heroImage: thumb, credit: "Wikimedia Commons" } };
      } catch {
        return poi;
      }
    }),
  );
}

/** What a POI is, in the fewest words that still let a model tell two of them apart. */
function catalogLine(poi: POI): string {
  const kind = poi.kind ?? "place";
  const price =
    poi.experience?.price?.amount != null
      ? `${poi.experience.price.amount} MAD`
      : poi.approxPriceMad
        ? `${poi.approxPriceMad[0]}-${poi.approxPriceMad[1]} MAD`
        : poi.priceRange;

  /* An experience is described by what you *do*; a place by what it is known for. That
     asymmetry is the whole point of the dataset having two halves. */
  const detail =
    poi.experience?.includes?.length
      ? poi.experience.includes
          .slice(0, 2)
          .map((item) => item.en)
          .join("; ")
      : poi.tags.slice(0, 4).join(", ");

  return [
    poi.id,
    poi.name,
    kind,
    poi.categories.join("/"),
    poi.city,
    `${poi.baseDurationMinutes}min`,
    price,
    poi.indoorOutdoor,
    detail,
  ].join(" | ");
}

export function buildCatalog(pois: POI[]): string {
  return pois.map(catalogLine).join("\n");
}

/** Everything the traveller told us, in the order it matters. Absent is simply unsaid. */
function travellerBlock(profile: TripProfile): string {
  const lines = [
    profile.transcript && `In their own words: ${profile.transcript}`,
    profile.destination && `City: ${profile.destination}`,
    profile.detectedPlace && `Place they showed us: ${profile.detectedPlace}`,
    profile.detectedPoiId &&
      `They explicitly asked for this stop — it must be in the day: ${profile.detectedPoiId}`,
    profile.interests.length > 0 && `Interests, most important first: ${profile.interests.join(", ")}`,
    profile.timeAvailable && `Time: ${profile.timeAvailable}`,
    profile.budgetLevel && `Budget: ${profile.budgetLevel}`,
    profile.pace && `Pace: ${profile.pace}`,
    profile.walkingPreference && `Walking: ${profile.walkingPreference}`,
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : "(they told us almost nothing — choose a day that shows the city at its best)";
}

const SYSTEM = `You are a Moroccan local who knows Casablanca-Settat and is choosing one day for one traveller.

You choose from the catalogue you are given whenever it covers what the traveller asked for. Each line is:
id | name | kind | categories | city | duration | price | indoor/outdoor | what it is

When the traveller asks for a city, a place or an activity the catalogue does not cover, do NOT substitute somewhere else: build the day where they asked, from real, well-known places you are confident exist, as "custom" picks.

Return ONLY JSON:
{"headline": string, "note": string, "picks": [{"id": string, "reason": string} | {"custom": {"name": string, "city": string, "lat": number, "lng": number, "categories": string[], "tags": string[], "open": "HH:MM", "close": "HH:MM", "durationMinutes": number, "priceRange": "free"|"0_30"|"30_60"|"60_150"|"150_300"|"300_plus"|"unknown", "indoorOutdoor": "indoor"|"outdoor"|"mixed", "story": string, "tip": string, "wikipedia": string|null}, "reason": string}]}

Rules:
- Exactly ${TRIP_STOP_COUNT} picks. A catalogue "id" is copied character-for-character. Use a catalogue id whenever the catalogue has that place; use "custom" only for places it does not have.
- A custom stop is a real place with its real approximate coordinates in decimal degrees, "categories" from: ${INTERESTS.join(", ")}, "story" two or three sentences about what it is and why it matters, "tip" one practical line. Hours and price are your best estimate. "wikipedia" is the exact English Wikipedia article title for the place when one exists (e.g. "Jemaa el-Fnaa", "Majorelle Garden"); when the place itself has none, the article of the district or landmark it sits in (a souk → "Medina of Marrakesh", a café on a square → that square); null only when nothing fits — the app fetches its photo from there.
- Keep the whole day in ONE city — the traveller's, when they named one — and make it a coherent day: places close enough to each other, no two doing the same thing. If any pick is custom, every pick is in that same city (catalogue stops from another city are dropped) and you return ${TRIP_STOP_COUNT + 2} custom picks, best first — the app keeps four.
- The catalogue is half places and half experiences (kind: workshop, food_experience, local_activity). A day of four monuments is a sightseeing list. Include at least one experience where the traveller's words support it — someone who talks about food, craft, people or "the real Morocco" should be making, tasting or meeting somebody, not only looking.
- Do not pick two stops that do the same thing (two medinas, two beaches).
- "reason" is one short line, at most 90 characters, spoken to the traveller as "you", saying why THIS stop is in THEIR day. Never generic: name the thing they will actually do or see.
- "headline" is one sentence naming the shape of the day.
- "note" is one or two sentences to the traveller, as "you": what you understood from their words and why this day answers it. When the day uses custom stops, say that it comes from your own knowledge of the place and has not yet been verified by the app.
- Do not order the day, do not give times, do not add stops beyond the picks.`;

/**
 * Keeps only what the dataset can honour. A hallucinated id, a duplicate, a fifth pick
 * and a missing reason are all ordinary model behaviour and all handled here rather than
 * downstream — nothing past this function has to be defensive.
 */
export function parseCuration(raw: unknown, pois: POI[]): Curation | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { headline?: unknown; note?: unknown; picks?: unknown };
  if (!Array.isArray(record.picks)) return null;

  const { picks, extra, wiki } = parsePicks(record.picks, pois);

  /* One surviving pick is noise, not an opinion: the engine's own day is better than a
     day built around a single lucky id. */
  if (picks.length < 2) return null;

  return {
    headline: typeof record.headline === "string" ? record.headline.trim().slice(0, 160) : "",
    note: typeof record.note === "string" ? record.note.trim().slice(0, 320) : "",
    picks,
    pois: extra,
    wiki,
  };
}

/**
 * Asks for a curation. Returns null on no key, a timeout, bad JSON or a model that only
 * produced ids we do not have — every one of which means "build the day locally".
 */
export async function curate(
  input: { profile: TripProfile; pois: POI[]; locale?: Locale },
  signal?: AbortSignal,
): Promise<Curation | null> {
  const apiKey = serverEnv.openai.apiKey;
  if (!apiKey) return null;

  const locale = input.locale ?? input.profile.locale;
  const prompt = [
    `Traveller:\n${travellerBlock(input.profile)}`,
    `Catalogue:\n${buildCatalog(input.pois)}`,
    `Write "headline" and every "reason" in ${LANGUAGE_NAME[locale]}. Ids stay exactly as written above.`,
  ].join("\n\n");

  try {
    const json = await chatJson(
      apiKey,
      serverEnv.openai.model,
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      signal ?? boundedSignal(TIMEOUTS.curationMs),
    );
    const curation = parseCuration(json, input.pois);
    if (!curation || curation.pois.length === 0) return curation;
    return { ...curation, pois: await withWikiImages(curation.pois, curation.wiki) };
  } catch {
    return null;
  }
}
