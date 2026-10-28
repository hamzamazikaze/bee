/**
 * POST /api/chat — one turn with the guide.
 *
 * Stateless by design: the client owns the conversation and replays it every turn, which
 * is what makes the whole feature survive a refresh, a language switch and a cold server
 * with no session store anywhere.
 *
 * Always answers 200. No key, a timeout or unusable output all come back as
 * `degraded: true` with an empty reply, and the screen says the guide is unavailable —
 * every other way into a trip still works.
 *
 * Request:  JSON { turns: [{ role, content }], locale?, profile?, currentPoiIds? }
 * Response: { ok, degraded, reply, picks: [{ poiId, reason }], headline, profile }
 */
import { TIMEOUTS } from "@/config/app";
import { POIS } from "@/data/pois";
import { boundedSignal, orFallback } from "@/lib/ai";
import { ask, type GuideTurn } from "@/lib/ai/guide";
import { isLocale } from "@/lib/i18n/locales";
import { parseTripProfile } from "@/lib/validation/trip-profile";
import type { Locale } from "@/types/common";

/**
 * Vercel gives a function 10 seconds by default, which is less than this route is allowed
 * to spend. TIMEOUTS.guideMs allows the guide 12s, plus the catalogue it reads first.
 * Without this the platform kills the request before the timeout that was designed for it,
 * and the caller sees a failure the fallback logic never gets to handle.
 */
export const maxDuration = 30;

const DEGRADED = {
  ok: true,
  degraded: true,
  reply: "",
  picks: [] as never[],
  headline: "",
  profile: {},
};

/** Only what a traveller could plausibly have typed. Anything else is not a turn. */
function readTurns(value: unknown): GuideTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (turn): turn is GuideTurn =>
        Boolean(turn) &&
        typeof turn === "object" &&
        (turn as GuideTurn).role !== undefined &&
        ((turn as GuideTurn).role === "user" || (turn as GuideTurn).role === "assistant") &&
        typeof (turn as GuideTurn).content === "string" &&
        (turn as GuideTurn).content.trim().length > 0,
    )
    .slice(-20)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, 2000) }));
}

function readPoiIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(POIS.map((poi) => poi.id));
  return value.filter((id): id is string => typeof id === "string" && known.has(id)).slice(0, 8);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const turns = readTurns(body?.turns);
  if (turns.length === 0) return Response.json({ ...DEGRADED, reason: "no_turns" });

  const locale: Locale = isLocale(body?.locale) ? body.locale : "en";
  const profile =
    body?.profile && typeof body.profile === "object"
      ? parseTripProfile(body.profile, locale)
      : undefined;

  const answer = await orFallback(
    () =>
      ask(
        {
          turns,
          pois: POIS,
          locale,
          profile,
          currentPoiIds: readPoiIds(body?.currentPoiIds),
        },
        boundedSignal(TIMEOUTS.guideMs, request.signal),
      ),
    null,
  );

  if (!answer) return Response.json({ ...DEGRADED, reason: "unavailable" });

  return Response.json({
    ok: true,
    degraded: false,
    reply: answer.reply,
    picks: answer.picks,
    headline: answer.headline,
    profile: answer.profile,
    pois: answer.pois,
  });
}
