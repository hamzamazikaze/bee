/**
 * POST /api/extract — the one understanding endpoint.
 *
 * Image, voice, text and URL all arrive here and all leave as the same TripIntentDraft.
 * Downstream code does not care where the inspiration came from; that is the whole point
 * of this route.
 *
 *   AI UNDERSTANDS → USER CONFIRMS → LOCAL ENGINE DECIDES → GEO SERVICES VERIFY
 *
 * This route is the first arrow only. It never builds a trip, never returns a stop, and
 * never hands back a POI id that did not come from the curated dataset.
 *
 * It always answers 200 with a usable draft. No key, a timeout, a dead platform or
 * unparseable model output all degrade one level and say so — the traveller confirms a
 * little more by hand and the engine still builds a full day.
 *
 * Request:  JSON { source?, text?, transcript?, url?, image?, known?, locale? }
 * Response: { ok, degraded, draft, profile, trace? }
 */
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import {
  boundedSignal,
  createIntentProvider,
  extractUrlMetadata,
  fetchRemoteImage,
  orFallback,
  toSocialContext,
  type ImageInput,
  type UrlMetadata,
} from "@/lib/ai";
import {
  draftFromLocalText,
  draftFromUrlMetadata,
  draftToProfile,
  mergeKnown,
} from "@/lib/intent";
import { isLocale } from "@/lib/i18n/locales";
import type { Locale } from "@/types/common";
import type { IntentEvidence, IntentSource, TripIntentDraft } from "@/types/intent";
import type { SocialContext, TripProfile } from "@/types/profile";

/**
 * Vercel gives a function 10 seconds by default, which is less than this route is allowed
 * to spend. A URL fetch, a thumbnail download and a vision call, in sequence.
 * Without this the platform kills the request before the timeout that was designed for it,
 * and the caller sees a failure the fallback logic never gets to handle.
 */
export const maxDuration = 30;

interface ExtractBody {
  source?: unknown;
  text?: unknown;
  transcript?: unknown;
  url?: unknown;
  /** The name this route has always used for a link. Still accepted. */
  socialUrl?: unknown;
  image?: { base64?: unknown; mimeType?: unknown };
  known?: Partial<TripProfile>;
  locale?: unknown;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/** What the traveller actually did, in priority order. An image is the strongest signal. */
function sourceOf(body: ExtractBody, image?: ImageInput, url?: string): IntentSource {
  const declared = body.source;
  if (declared === "image" || declared === "audio" || declared === "text" || declared === "url") {
    return declared;
  }
  if (image) return "image";
  if (url) return "url";
  if (asString(body.transcript)) return "audio";
  return "text";
}

export async function POST(request: Request) {
  const body = await orFallback<ExtractBody>(() => request.json(), {});
  const locale: Locale = isLocale(body.locale) ? body.locale : "en";

  const text = asString(body.text);
  const transcript = asString(body.transcript);
  const url = asString(body.url) ?? asString(body.socialUrl);
  const known = body.known && typeof body.known === "object" ? body.known : undefined;

  const uploaded: ImageInput | undefined =
    body.image && typeof body.image.base64 === "string" && typeof body.image.mimeType === "string"
      ? {
          base64: body.image.base64.replace(/^data:[^,]*,/, ""),
          mimeType: body.image.mimeType,
        }
      : undefined;

  const source = sourceOf(body, uploaded, url);

  /* URL extraction runs first and independently: its metadata is evidence for the model,
     and on the no-key path it is the only evidence there is. It can only ever add. */
  let metadata: UrlMetadata | null = null;
  let thumbnail: ImageInput | null = null;
  if (url) {
    metadata = await extractUrlMetadata(url, {
      signal: boundedSignal(TIMEOUTS.socialContextMs, request.signal),
      youtubeApiKey: serverEnv.youtube.apiKey,
    });
    /* A thumbnail turns a pasted link into a visual signal rather than a caption. Failure
       here is not a failure of the request — we simply continue on the text metadata. */
    if (metadata.thumbnailUrl) {
      thumbnail = await fetchRemoteImage(
        metadata.thumbnailUrl,
        boundedSignal(TIMEOUTS.socialContextMs, request.signal),
      );
    }
  }

  const evidence: Partial<IntentEvidence> = {
    transcript: transcript ?? text ?? null,
    urlTitle: metadata?.title ?? null,
    urlDescription: metadata?.description ?? null,
    urlAuthor: metadata?.author ?? null,
    urlThumbnailUrl: metadata?.thumbnailUrl ?? null,
    provider: metadata?.provider ?? null,
  };

  const image = uploaded ?? thumbnail ?? undefined;
  const provider = createIntentProvider();

  const modelDraft: TripIntentDraft | null = provider
    ? await orFallback(
        () =>
          provider.extractIntent(
            {
              source,
              locale,
              text,
              transcript,
              evidence,
              image,
              known,
              placeProvenance: thumbnail && !uploaded ? "url_thumbnail" : undefined,
              provenance:
                source === "audio"
                  ? "voice"
                  : source === "url"
                    ? "url_title"
                    : source === "image"
                      ? "image_visual"
                      : "text",
            },
            boundedSignal(TIMEOUTS.profileExtractionMs, request.signal),
          ),
        null,
      )
    : null;

  /* Degraded, not broken. Without a model we still read the link's own metadata and run
     the local keyword pass over whatever words we have — the draft comes back with the
     same shape and an honest, capped confidence. */
  const draft = modelDraft
    ? modelDraft
    : mergeKnown(
        metadata && !text && !transcript
          ? draftFromUrlMetadata(metadata, { locale })
          : draftFromLocalText(transcript ?? text ?? metadata?.title ?? null, {
              locale,
              source: source === "audio" ? "audio" : "text",
            }),
        known,
      );

  const social: SocialContext | null = metadata ? toSocialContext(metadata) : null;
  /* No `edits` here: the traveller's own choices were already folded into the draft by
     `mergeKnown`, with the right precedence. Applying `known` a second time as edits let a
     caller that sends its whole current profile — which is what the composer does — spread
     a full set of nulls back over everything the model had just understood. */
  const profile = draftToProfile(draft, { locale, social });

  return Response.json({
    ok: true,
    degraded: modelDraft === null,
    draft,
    profile,
    ...(process.env.NODE_ENV === "production" ? {} : { trace: trace(draft, metadata, thumbnail) }),
  });
}

/**
 * Development-only trace. Names the chain that ran and what it believed, so a wrong answer
 * can be attributed without a debugger. Never a key, never a request header, never a
 * provider's raw response.
 */
function trace(
  draft: TripIntentDraft,
  metadata: UrlMetadata | null,
  thumbnail: ImageInput | null,
) {
  return {
    source: draft.source,
    provider: draft.evidence.provider,
    urlProvider: metadata?.provider ?? null,
    thumbnailAnalysed: Boolean(thumbnail),
    degraded: draft.degraded,
    confidence: draft.confidence,
    band: draft.band,
    candidates: draft.candidates,
    detectedPoiId: draft.destination.detectedPoiId,
    uncertainFields: draft.uncertainFields,
    provenance: draft.provenance,
  };
}
