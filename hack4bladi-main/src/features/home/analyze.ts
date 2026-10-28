import { TIMEOUTS, UPLOAD } from "@/config/app";
import type { ImageAnalysisResult } from "@/lib/ai/types";
import { createEmptyDraft, parseTripIntentDraft } from "@/lib/intent";
import type { Locale } from "@/types/common";
import type { IntentSource, TripIntentDraft } from "@/types/intent";
import type { SocialContext, SocialPlatform, TripProfile } from "@/types/profile";

export type UploadIssue = "imageTooLarge" | "unsupportedFile";

/**
 * DEBUG SCAFFOLD — dev only, safe to delete.
 *
 * Every modality's network call leaves from this file, so one tagged logger here shows
 * the whole input pipeline: what went out, what came back, and what the draft became.
 * Filter the browser console on `[input]`.
 */
const TRACE = process.env.NODE_ENV !== "production";
function trace(stage: string, data: Record<string, unknown>): void {
  if (TRACE) console.log(`[input] ${stage}`, data);
}

/** The fields worth seeing at a glance; the full draft is one expand away. */
function draftDigest(draft: TripIntentDraft) {
  return {
    city: draft.destination.city,
    place: draft.destination.detectedPlace,
    poiId: draft.destination.detectedPoiId,
    interests: draft.interests,
    time: draft.timeAvailable,
    budget: draft.budgetLevel,
    avoidLongWalks: draft.mobility.avoidLongWalks,
    confidence: draft.confidence,
    band: draft.band,
    degraded: draft.degraded,
    candidates: draft.candidates.map((c) => `${c.poiId}(${c.score})`),
    provider: draft.evidence.provider,
  };
}

/** Validated against UPLOAD in @/config/app, before a single byte is read. */
export function validateImage(file: File): UploadIssue | null {
  const accepted: readonly string[] = UPLOAD.acceptedMimeTypes;
  if (!accepted.includes(file.type)) {
    trace("image REJECTED unsupportedFile", { name: file.name, type: file.type });
    return "unsupportedFile";
  }
  if (file.size > UPLOAD.maxBytes) {
    trace("image REJECTED imageTooLarge", { name: file.name, bytes: file.size, max: UPLOAD.maxBytes });
    return "imageTooLarge";
  }
  trace("image accepted", { name: file.name, type: file.type, kb: Math.round(file.size / 1024) });
  return null;
}

export interface Recognition {
  destination: string | null;
  detectedPlace: string | null;
  detectedPoiId: string | null;
  labels: string[];
  /**
   * 0..1 from the provider, or null when we never heard from one.
   *
   * null is load-bearing: the reveal only prints a match score when a real model
   * produced it. A confidence invented for the fallback path would be fake data
   * on stage.
   */
  confidence: number | null;
  /** For our QA only. The jury is never told a provider was down. */
  usedFallback: boolean;
  /**
   * What the same call understood about the day, normalised like every other modality.
   * Present even on the fallback path, where it simply carries no confidence.
   */
  draft: TripIntentDraft;
}

/**
 * The path when the call itself failed — no key, a timeout, a 500 from our own route.
 *
 * It used to resolve to the golden Casablanca profile and continue silently. That put
 * "Mosquée Hassan II" under a photo of a beach at El Jadida, stated with the confidence
 * of a real answer, and the fixture's own tags (`atlantic`, `zellige`) as if they were
 * vision labels. A demo that lies about what it saw is worse than one that says it could
 * not look: the failure is invisible right up until the one moment it is not.
 *
 * So: no place, no labels, no invented city. `detectedPlace: null` is what the reveal
 * already reads as "we could not place this one", which offers exploring or choosing by
 * hand — and the CTA is still never blocked.
 */
function failedRecognition(locale: Locale): Recognition {
  return {
    destination: null,
    detectedPlace: null,
    detectedPoiId: null,
    labels: [],
    confidence: null,
    usedFallback: true,
    draft: createEmptyDraft("image", locale),
  };
}

/**
 * Longest edge we are willing to upload.
 *
 * A phone camera hands us 4032×5376. The vision model tiles that down to a few hundred
 * pixels before it looks at anything, so every megabyte past this is pure upload time
 * charged against an 8-second budget — and it was losing: a 5.6 MB photo, comfortably
 * inside the 8 MB the composer accepts, took 8.02 s end to end and came back as "we could
 * not confidently place this one" on a picture of the Hassan II mosque.
 *
 * 1600px keeps a minaret legible and turns that same photo into roughly 300 KB.
 */
const MAX_UPLOAD_EDGE = 1600;

/** Bytes → base64, in chunks so a large photo cannot blow the argument limit. */
function encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Shrinks an oversized photo before it goes anywhere.
 *
 * Every step is best-effort: a browser that cannot decode the format (HEIC on some
 * desktops), a canvas that refuses, a `toBlob` that yields nothing — all fall back to
 * sending the original, which is exactly the behaviour this function replaced. Resizing
 * is an optimisation, never a gate.
 */
async function toBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_UPLOAD_EDGE / longest);

    if (scale < 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");

      if (context) {
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.85),
        );
        bitmap.close();

        if (blob) {
          trace("image downscaled before upload", {
            from: `${longest}px / ${Math.round(file.size / 1024)}KB`,
            to: `${Math.max(canvas.width, canvas.height)}px / ${Math.round(blob.size / 1024)}KB`,
          });
          return {
            base64: encode(new Uint8Array(await blob.arrayBuffer())),
            mimeType: "image/jpeg",
          };
        }
      }
    }
    bitmap.close();
  } catch {
    /* Undecodable here is not undecodable at the model: send it as it came. */
  }

  return { base64: encode(new Uint8Array(await file.arrayBuffer())), mimeType: file.type };
}

/** The model's own score for the place it named. Anything unusable becomes null. */
function readConfidence(map: ImageAnalysisResult["confidence"] | undefined): number | null {
  const value = map?.detectedPlace ?? map?.destination;
  return typeof value === "number" && value > 0 && value <= 1 ? value : null;
}

/**
 * IMAGE → analysis → candidate POI → draft. Bounded by TIMEOUTS.imageAnalysisMs;
 * a timeout is not an error, it is the fallback.
 *
 * The route hands back the analysis and the draft together, so the reveal can show both
 * the place it recognised and the day it understood without a second round trip.
 */
export async function recogniseImage(file: File, locale: Locale = "en"): Promise<Recognition> {
  const startedAt = Date.now();
  trace("IMAGE → /api/analyze", { name: file.name, type: file.type, locale });
  try {
    const image = await toBase64(file);
    const response = await fetch(`/api/analyze?locale=${locale}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image }),
      signal: AbortSignal.timeout(TIMEOUTS.imageAnalysisMs + 2_000),
    });
    if (!response.ok) {
      trace("IMAGE ✗ http", { status: response.status, ms: Date.now() - startedAt });
      return failedRecognition(locale);
    }

    /* The analysis sits under `result`; the envelope around it carries ok/degraded.
       Reading detectedPlace off the top level made every upload fall through to the
       golden profile — see docs/API_REVIEW.md H1. */
    const body = (await response.json()) as
      | { ok?: boolean; result?: Partial<ImageAnalysisResult>; draft?: unknown }
      | null;
    const data = body?.result;
    trace("IMAGE ← /api/analyze", {
      ms: Date.now() - startedAt,
      ok: body?.ok,
      detectedPlace: data?.detectedPlace ?? null,
      detectedPoiId: data?.detectedPoiId ?? null,
      destination: data?.destination ?? null,
      labels: data?.labels?.slice(0, 5) ?? [],
      ocr: data?.ocrText?.slice(0, 60) ?? null,
      confidence: data?.confidence ?? null,
    });
    if (!body || body.ok === false) {
      trace("IMAGE ✗ call failed", { reason: !body ? "empty body" : "ok:false" });
      return failedRecognition(locale);
    }

    /*
     * Not naming a landmark is not the same as understanding nothing.
     *
     * This used to bail the moment `detectedPlace` was null, throwing away the whole
     * analysis — the city, the interests, the OCR — and the draft the route had already
     * built from them. A screenshot of a TikTok about a souk carries no nameable monument,
     * but the browser chrome in the shot says "El jadida" in the tab title and again in
     * `?q=El%20jadida`, the OCR reads it, and the keyword pass resolves it to a real city.
     * The server got that right and the client answered "we could not place this one".
     *
     * So the draft decides. `RecognitionReveal` already has the state for this — a city
     * with no landmark shows "FOUND IN …" over what we understood about the day — and we
     * only give up when there is genuinely nothing: no place, no city, no interests.
     */
    const draft = parseTripIntentDraft(body.draft, "image", locale);
    const understoodSomething =
      Boolean(data?.detectedPlace) ||
      Boolean(draft.destination.city) ||
      draft.interests.length > 0;

    if (!understoodSomething) {
      trace("IMAGE ✗ nothing understood — reveal says so, nothing invented", {});
      return failedRecognition(locale);
    }

    trace("IMAGE ✓ understood", {
      place: data?.detectedPlace ?? null,
      city: data?.destination ?? draft.destination.city,
      viaOcrOnly: !data?.detectedPlace,
      interests: draft.interests,
    });

    return {
      /* The model's own city first, then whatever the OCR grounded to — the second is the
         whole point of reading a screenshot rather than only looking at it. */
      destination: data?.destination ?? draft.destination.city ?? null,
      detectedPlace: data?.detectedPlace ?? null,
      detectedPoiId: data?.detectedPoiId ?? draft.destination.detectedPoiId ?? null,
      labels: Array.isArray(data?.labels) ? data.labels.slice(0, 5) : [],
      confidence: readConfidence(data?.confidence),
      usedFallback: false,
      draft,
    };
  } catch (error) {
    trace("IMAGE ✗ threw (timeout or network)", {
      ms: Date.now() - startedAt,
      error: error instanceof Error ? error.name : String(error),
    });
    return failedRecognition(locale);
  }
}

export interface UnderstandInput {
  source: IntentSource;
  text?: string;
  transcript?: string;
  url?: string;
  /** Everything the traveller already chose. The model never overwrites it. */
  known?: Partial<TripProfile>;
  locale?: Locale;
}

/**
 * VOICE / TEXT / URL → TripIntentDraft, through the one understanding endpoint.
 *
 * Never throws and never returns null: a dead provider, a dead platform or a timeout all
 * come back as a low-confidence draft, which the confirmation surface treats as "ask"
 * rather than "fail". The CTA is never blocked by this call.
 */
export async function understand(input: UnderstandInput): Promise<TripIntentDraft> {
  const locale = input.locale ?? "en";
  const startedAt = Date.now();
  trace(`${input.source.toUpperCase()} → /api/extract`, {
    text: input.text ?? null,
    transcript: input.transcript ?? null,
    url: input.url ?? null,
    known: input.known ? Object.keys(input.known) : null,
    locale,
  });
  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, locale }),
      signal: AbortSignal.timeout(TIMEOUTS.profileExtractionMs + TIMEOUTS.socialContextMs),
    });
    if (!response.ok) {
      trace(`${input.source.toUpperCase()} ✗ http`, { status: response.status, ms: Date.now() - startedAt });
      return createEmptyDraft(input.source, locale);
    }

    const body = (await response.json()) as { draft?: unknown; trace?: unknown } | null;
    const draft = parseTripIntentDraft(body?.draft, input.source, locale);
    trace(`${input.source.toUpperCase()} ← draft`, {
      ms: Date.now() - startedAt,
      ...draftDigest(draft),
      serverTrace: body?.trace ?? null,
    });
    return draft;
  } catch (error) {
    trace(`${input.source.toUpperCase()} ✗ threw (timeout or network)`, {
      ms: Date.now() - startedAt,
      error: error instanceof Error ? error.name : String(error),
    });
    return createEmptyDraft(input.source, locale);
  }
}

const PLATFORM_HOSTS: Array<[SocialPlatform, RegExp]> = [
  ["tiktok", /tiktok\./i],
  ["instagram", /instagram\.|instagr\.am/i],
  ["facebook", /facebook\.|fb\.watch/i],
  ["youtube", /youtube\.|youtu\.be/i],
];

/**
 * Local only. Metadata enrichment is optional and failure must be silent, so a pasted
 * link never waits on the network before the user can move on.
 */
export function readSocialUrl(raw: string): SocialContext | null {
  const value = raw.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (!url.hostname.includes(".")) return null;

  const platform = PLATFORM_HOSTS.find(([, pattern]) => pattern.test(url.hostname))?.[0] ?? "other";
  return { platform, url: url.toString() };
}

/**
 * Bounded transcription. Any failure returns null; the CTA is never blocked.
 *
 * The locale travels with the audio so the route knows which engine to lead with: Darija
 * to MoulSot, English and French to Whisper. The budget is the Darija one because that is
 * the slower of the two paths, and a cold Space must not look like a hang.
 */
export async function transcribe(blob: Blob, locale: Locale = "en"): Promise<string | null> {
  const startedAt = Date.now();
  trace("VOICE → /api/transcribe", { bytes: blob.size, type: blob.type, locale });
  try {
    const body = new FormData();
    body.append("audio", blob, "voice.webm");
    body.append("locale", locale);
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TIMEOUTS.darijaTranscriptionMs + TIMEOUTS.transcriptionMs),
    });
    if (!response.ok) {
      trace("VOICE ✗ http", { status: response.status, ms: Date.now() - startedAt });
      return null;
    }
    const data = (await response.json()) as {
      text?: unknown;
      provider?: unknown;
      degraded?: unknown;
      reason?: unknown;
    };
    const text =
      typeof data?.text === "string" && data.text.trim() ? data.text.trim() : null;
    /* Which engine answered is the thing worth seeing here: Darija goes to MoulSot and
       English/French to Whisper, and a silent fall-through between them is exactly the
       kind of failure that looks like "the mic did not work".

       `reason` is on this line because it was not, and an afternoon went into finding out
       what "empty" meant. The route rejects an unusable upload with 200 and an empty
       transcript — by design, so the CTA is never blocked — which means the status code
       says nothing and the body says everything. `unsupported_type` is a recorder we do
       not accept, `missing_file` a recording with no bytes in it, and `unavailable` both
       engines failing; those are three different bugs that looked like one. */
    trace(text ? "VOICE ← transcript" : "VOICE ✗ empty", {
      ms: Date.now() - startedAt,
      provider: data?.provider ?? null,
      degraded: data?.degraded ?? null,
      reason: data?.reason ?? null,
      chars: text?.length ?? 0,
      text: text?.slice(0, 80) ?? null,
    });
    return text;
  } catch (error) {
    trace("VOICE ✗ threw (timeout or network)", {
      ms: Date.now() - startedAt,
      error: error instanceof Error ? error.name : String(error),
    });
    return null;
  }
}
