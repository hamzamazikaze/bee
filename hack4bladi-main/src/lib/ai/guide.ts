/**
 * The guide — a conversation that answers anything, and can hand the day over when it
 * has one.
 *
 * This is the inversion the rest of the app was built waiting for. Everywhere else the
 * traveller answers our four questions and the engine decides; here they just talk, and
 * the model does the deciding — what to see, what to eat, whether Oualidia is worth the
 * drive, why the mosque is better at six than at noon. Our own logic stops being the
 * author of the day and becomes what keeps it coherent: the ids have to be ours, the
 * enums have to be ones the app understands, and the four stops still have to survive
 * opening hours, a budget and a route.
 *
 * So the model returns three things at once:
 *   `reply`   — what it says to the traveller. Free text, its own voice, their language.
 *   `picks`   — ids from our catalogue when the conversation has produced a day.
 *   `profile` — what it now believes about the traveller, in the app's own vocabulary.
 *
 * Everything after that is a filter, never an author. An id we do not have is dropped, an
 * invented enum is dropped, and with no key at all the whole thing returns null and the
 * screen says so. The guide is never asked to produce a schedule — the engine still owns
 * the clock, the route and the money.
 */
import "server-only";
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { buildCatalog, parsePicks, withWikiImages, type CuratorPick } from "@/lib/ai/curator";
import { boundedSignal } from "@/lib/ai/http";
import { chatJson, type ChatMessage } from "@/lib/ai/openai-client";
import { LANGUAGE_NAME } from "@/lib/ai/output-language";
import { pickInterests } from "@/lib/intent";
import { INTERESTS } from "@/types/profile";
import type { Locale } from "@/types/common";
import type { POI } from "@/types/poi";
import type {
  BudgetLevel,
  TimeAvailable,
  TripPace,
  TripProfile,
  WalkingPreference,
} from "@/types/profile";
import { TRIP_STOP_COUNT } from "@/types/trip";

/** One line of the conversation. The whole history is sent every turn; there is no session. */
export interface GuideTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GuideAnswer {
  /** What the guide says. Always present — an answer with no day is a complete answer. */
  reply: string;
  /** Ids from our catalogue, empty until the conversation has actually produced a day. */
  picks: CuratorPick[];
  /** One line naming the day, shown on the card above the "build this day" button. */
  headline: string;
  /** What the guide now understands about the traveller, in the app's own vocabulary. */
  profile: Partial<TripProfile>;
  /** Stops the guide authored itself when the catalogue did not cover the ask. Unverified. */
  pois: POI[];
  /** poi id → English Wikipedia title, for `withWikiImages`. */
  wiki: Record<string, string>;
}

export interface GuideInput {
  turns: GuideTurn[];
  pois: POI[];
  locale: Locale;
  /** What the traveller has already told us, so the guide does not ask twice. */
  profile?: TripProfile;
  /** The day currently on screen, when there is one — "make it cheaper" needs it. */
  currentPoiIds?: string[];
}

const SYSTEM = `You are a Moroccan local in Casablanca-Settat, talking with a traveller who is planning a day. You are the one with the opinions: answer whatever they ask — what is worth it, what is a tourist trap, what to eat, what things cost, when to go, what to wear, how to behave in a mosque, whether somewhere is fine after dark. Be warm, specific and short. Two or three sentences unless they asked for more.

You are given a catalogue. Each line is:
id | name | kind | categories | city | duration | price | indoor/outdoor | what it is

Return ONLY JSON:
{"reply": string, "picks": [{"id": string, "reason": string} | {"custom": {"name": string, "city": string, "lat": number, "lng": number, "categories": string[], "tags": string[], "open": "HH:MM", "close": "HH:MM", "durationMinutes": number, "priceRange": "free"|"0_30"|"30_60"|"60_150"|"150_300"|"300_plus"|"unknown", "indoorOutdoor": "indoor"|"outdoor"|"mixed", "story": string, "tip": string, "wikipedia": string|null}, "reason": string}], "headline": string, "profile": {"destination": string|null, "interests": string[], "timeAvailable": "few_hours"|"half_day"|"full_day"|null, "budgetLevel": "low"|"medium"|"premium"|null, "pace": "relaxed"|"balanced"|"explorer"|null, "walkingPreference": "minimal"|"normal"|"plenty"|null}}

- "reply" is the conversation. It is never empty, and it never contains JSON, ids, or a bulleted list of stops.
- "picks" is ${TRIP_STOP_COUNT} stops when the traveller wants a day, wants a different day, or asks you to change the one they have. Otherwise []. A catalogue "id" is copied character-for-character. When they want a day somewhere the catalogue does not cover — another city, a place we do not have — do NOT refuse and do NOT substitute: give them a real, coherent day there as "custom" picks (real places, real approximate coordinates in decimal degrees, "categories" from: ${INTERESTS.join(", ")}, a two-sentence "story", one practical "tip", "wikipedia" = the exact English Wikipedia article title of the place, else of the district or landmark it sits in, else null), and say in "reply" that it comes from your own knowledge and is not yet verified by the app. Use a catalogue id whenever the catalogue has that place.
- Half the catalogue is people, not places (kind: workshop, food_experience, local_activity). A day of four monuments is a sightseeing list. When their words support it, put them in a kitchen, a workshop or a boat, not only in front of a facade.
- Do not pick two stops that do the same thing. Keep the day in one city.
- "reason" is one short line to them, as "you", saying why that stop is in their day.
- "headline" is one sentence naming the day. "" when there are no picks.
- "profile" is what you now believe, from the whole conversation. null for anything they have not implied. Its enum values are fixed English tokens — copy them exactly, never translate them.
- Keep every day in one city, with stops close enough to make one coherent day.
- Never invent a catalogue id. Never write a schedule with clock times: the app builds the timing.`;

const TIME_VALUES: readonly TimeAvailable[] = ["few_hours", "half_day", "full_day"];
const BUDGET_VALUES: readonly BudgetLevel[] = ["low", "medium", "premium"];
const PACE_VALUES: readonly TripPace[] = ["relaxed", "balanced", "explorer"];
const WALKING_VALUES: readonly WalkingPreference[] = ["minimal", "normal", "plenty"];

function pickEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/**
 * The whole of the trust boundary.
 *
 * Everything the model said is treated as a suggestion here: ids it does not own are
 * dropped, enum values it paraphrased are dropped, a fifth stop is dropped, and a day of
 * one stop is not a day. What survives is expressed in types the rest of the app already
 * speaks, so nothing downstream has to know a model was involved.
 */
export function parseGuideAnswer(raw: unknown, pois: POI[]): GuideAnswer | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const reply = typeof record.reply === "string" ? record.reply.trim() : "";
  if (!reply) return null;

  const { picks, extra, wiki } = parsePicks(record.picks, pois);

  /* A single surviving id is not a day, and offering to build one would be worse than
     offering nothing. The reply still stands on its own. */
  const day = picks.length >= 2 ? picks : [];
  const dayIds = new Set(day.map((pick) => pick.poiId));

  const rawProfile = (record.profile ?? {}) as Record<string, unknown>;
  const profile: Partial<TripProfile> = {
    destination: typeof rawProfile.destination === "string" ? rawProfile.destination : null,
    interests: pickInterests(rawProfile.interests),
    timeAvailable: pickEnum(rawProfile.timeAvailable, TIME_VALUES),
    budgetLevel: pickEnum(rawProfile.budgetLevel, BUDGET_VALUES),
    pace: pickEnum(rawProfile.pace, PACE_VALUES),
    walkingPreference: pickEnum(rawProfile.walkingPreference, WALKING_VALUES),
  };

  return {
    reply: reply.slice(0, 1200),
    picks: day,
    headline:
      day.length > 0 && typeof record.headline === "string"
        ? record.headline.trim().slice(0, 160)
        : "",
    profile,
    pois: extra.filter((poi) => dayIds.has(poi.id)),
    wiki,
  };
}

/** What the guide already knows, so it does not open every turn by asking again. */
function contextBlock(input: GuideInput): string {
  const profile = input.profile;
  const lines = [
    profile?.destination && `They are planning for: ${profile.destination}`,
    profile?.interests?.length && `Interests so far: ${profile.interests.join(", ")}`,
    profile?.budgetLevel && `Budget so far: ${profile.budgetLevel}`,
    profile?.timeAvailable && `Time so far: ${profile.timeAvailable}`,
    profile?.pace && `Pace so far: ${profile.pace}`,
    profile?.walkingPreference && `Walking so far: ${profile.walkingPreference}`,
    input.currentPoiIds?.length &&
      `The day currently on their screen, in order: ${input.currentPoiIds.join(", ")}. When they ask to change it, return the whole new day, not just the change.`,
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : "(this is the start of the conversation)";
}

/**
 * One turn. Returns null on no key, a timeout, or output with nothing usable in it —
 * every one of which the screen shows as "the guide is unavailable", never as an error.
 */
export async function ask(input: GuideInput, signal?: AbortSignal): Promise<GuideAnswer | null> {
  const apiKey = serverEnv.openai.apiKey;
  if (!apiKey) return null;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        `Catalogue:\n${buildCatalog(input.pois)}`,
        `What you already know:\n${contextBlock(input)}`,
        `Write "reply", every "reason" and "headline" in ${LANGUAGE_NAME[input.locale]}. Ids and enum values stay exactly as written above.`,
      ].join("\n\n"),
    },
    /* The history is replayed as user turns carrying the speaker, rather than as real
       assistant turns: JSON mode wants the last word to be the traveller's, and an
       assistant turn holding a bare sentence would teach the model to answer with one. */
    ...input.turns.slice(-12).map(
      (turn): ChatMessage => ({
        role: "user",
        content: turn.role === "user" ? `Traveller: ${turn.content}` : `You said: ${turn.content}`,
      }),
    ),
  ];

  try {
    const json = await chatJson(
      apiKey,
      serverEnv.openai.model,
      messages,
      signal ?? boundedSignal(TIMEOUTS.guideMs),
    );
    const answer = parseGuideAnswer(json, input.pois);
    if (!answer || answer.pois.length === 0) return answer;
    return { ...answer, pois: await withWikiImages(answer.pois, answer.wiki) };
  } catch {
    return null;
  }
}
