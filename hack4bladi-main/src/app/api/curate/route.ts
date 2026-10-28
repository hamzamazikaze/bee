/**
 * POST /api/curate — "which four of ours belong in this person's day, and why?"
 *
 * The one server surface of the curator. It exists because the trip is generated in the
 * browser and the key is not: the client sends the profile, gets back ids it already owns
 * and a line per stop.
 *
 * Always answers 200. No key, a timeout, unparseable output or a model that only named
 * places we do not have all come back as `degraded: true` with no picks, and the caller
 * builds the day locally — which is the day it built before this route existed.
 *
 * Request:  JSON { profile: TripProfile }
 * Response: { ok, degraded, headline, picks: [{ poiId, reason }] }
 */
import { TIMEOUTS } from "@/config/app";
import { POIS } from "@/data/pois";
import { boundedSignal, orFallback } from "@/lib/ai";
import { curate } from "@/lib/ai/curator";
import { parseTripProfile } from "@/lib/validation/trip-profile";

/**
 * Vercel gives a function 10 seconds by default, which is less than this route is allowed
 * to spend. TIMEOUTS.curationMs allows 5s, and the catalogue is 1.7k tokens of prompt.
 * Without this the platform kills the request before the timeout that was designed for it,
 * and the caller sees a failure the fallback logic never gets to handle.
 */
export const maxDuration = 15;

const EMPTY = { ok: true, degraded: true, headline: "", picks: [] as never[] };

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const raw = (body as { profile?: unknown } | null)?.profile;
  if (!raw || typeof raw !== "object") {
    return Response.json({ ...EMPTY, reason: "invalid_profile" });
  }

  const profile = parseTripProfile(raw);

  const curation = await orFallback(
    () =>
      curate({ profile, pois: POIS }, boundedSignal(TIMEOUTS.curationMs, request.signal)),
    null,
  );

  if (!curation) return Response.json({ ...EMPTY, reason: "unavailable" });

  return Response.json({
    ok: true,
    degraded: false,
    headline: curation.headline,
    note: curation.note,
    picks: curation.picks,
    pois: curation.pois,
  });
}
