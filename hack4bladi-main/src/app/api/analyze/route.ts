/**
 * POST /api/analyze — "what place is this?", and what day does it imply?
 *
 * The image on-ramp of the understanding layer. One vision call produces the analysis and
 * the TripIntentDraft together: the model names a place in words, the local resolver
 * decides whether those words are a curated POI id, and the candidates it ranked come
 * back so the confirmation screen can offer alternatives instead of insisting.
 *
 * Always answers 200 with a usable body. A missing key, a timeout or unparseable model
 * output all come back as `degraded: true`, an empty analysis and a low-confidence draft:
 * the traveller keeps their manual selections and the trip is built from those. No error
 * screen, ever.
 *
 * Request:  multipart/form-data with `file`, or JSON `{ image: { base64, mimeType } }`
 * Response: { ok, degraded, reason?, result: ImageAnalysisResult, draft: TripIntentDraft }
 */
import { TIMEOUTS } from "@/config/app";
import { EMPTY_ANALYSIS, boundedSignal, createGeminiProvider, orFallback } from "@/lib/ai";
import { readImageUpload } from "@/lib/ai/upload";
import { draftFromImageAnalysis } from "@/lib/intent";
import { isLocale } from "@/lib/i18n/locales";
import type { Locale } from "@/types/common";

/**
 * Vercel gives a function 10 seconds by default, which is less than this route is allowed
 * to spend. TIMEOUTS.imageAnalysisMs allows 18s for a vision call on an uploaded photo.
 * Without this the platform kills the request before the timeout that was designed for it,
 * and the caller sees a failure the fallback logic never gets to handle.
 */
export const maxDuration = 25;

/** The locale rides on a query string so both request shapes can carry it. */
function localeOf(request: Request): Locale {
  const value = new URL(request.url).searchParams.get("locale");
  return isLocale(value) ? value : "en";
}

export async function POST(request: Request) {
  const locale = localeOf(request);
  const degradedDraft = () =>
    draftFromImageAnalysis(EMPTY_ANALYSIS, { locale, degraded: true });

  const upload = await readImageUpload(request);
  if (!upload.ok) {
    return Response.json({
      ok: false,
      degraded: true,
      reason: upload.reason,
      result: EMPTY_ANALYSIS,
      draft: degradedDraft(),
    });
  }

  const provider = createGeminiProvider();
  if (!provider) {
    return Response.json({
      ok: true,
      degraded: true,
      reason: "unavailable",
      result: EMPTY_ANALYSIS,
      draft: degradedDraft(),
    });
  }

  const result = await orFallback(
    () =>
      provider.analyzeImage(
        upload.value,
        boundedSignal(TIMEOUTS.imageAnalysisMs, request.signal),
        locale,
      ),
    null,
  );

  return Response.json({
    ok: true,
    degraded: result === null,
    result: result ?? EMPTY_ANALYSIS,
    draft: result
      ? draftFromImageAnalysis(result, { locale })
      : degradedDraft(),
  });
}
