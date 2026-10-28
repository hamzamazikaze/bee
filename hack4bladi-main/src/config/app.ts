/**
 * Client-safe configuration. No secrets. Owned by Lead.
 */
import type { BudgetLevel, TimeAvailable } from "@/types/profile";

export const APP = {
  name: "BENNA",
  tagline: "The taste of home, wherever you work.",
  region: "Casablanca-Settat",
  defaultDestination: "Casablanca",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

/**
 * Every external call is bounded. Exceeding a timeout is not an error state —
 * it is the signal to switch to local fallback data.
 */
export const TIMEOUTS = {
  /** Gemini vision measured 5–16s on a real photo; 8s timed out on the Hassan II mosque. */
  imageAnalysisMs: 18_000,
  profileExtractionMs: 8_000,
  transcriptionMs: 8_000,
  /** MoulSot runs on a public HF Space that can be cold. Longer, but still bounded. */
  darijaTranscriptionMs: 45_000,
  socialContextMs: 3_000,
  /** The curator sits in front of trip generation, so it gets the smaller half of the budget. */
  curationMs: 15_000,
  /** A chat turn is the traveller waiting on a person, not a screen loading. Longer. */
  guideMs: 12_000,
  /** BENNA assistant: one menu-sized prompt. Past this, the local matcher answers. */
  bennaAssistantMs: 9_000,
  /** M3AK photo: a vision call, measured at ~14 s under load. No local fallback can read a photo. */
  bennaPhotoMs: 20_000,
  /** Today's menu from Supabase: a local PostgREST read. */
  bennaMenuMs: 4_000,
  routingSegmentMs: 4_000,
  weatherMs: 2_500,
  /** Hard ceiling on the whole generation experience before we show the trip anyway. */
  tripGenerationMs: 20_000,
} as const;

/** Minimum time the processing screen stays up, so the reveal never feels broken. */
export const PROCESSING_MIN_MS = 2_400;

export const MAP = {
  styleUrl:
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
    "https://tiles.openfreemap.org/styles/dark",
  /** Basemap for the light theme. */
  lightStyleUrl:
    process.env.NEXT_PUBLIC_MAP_LIGHT_STYLE_URL ??
    "https://tiles.openfreemap.org/styles/positron",
  defaultCenter: { lat: 33.5899, lng: -7.6039 },
  defaultZoom: 12,
  fitPadding: 64,
} as const;

export const UPLOAD = {
  maxBytes: 8 * 1024 * 1024,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  /**
   * Every container a browser's MediaRecorder actually hands us.
   *
   * The list used to be the four we had thought of, and a recorder that produced anything
   * else was rejected at the door with `unsupported_type` — which the route answers 200 to,
   * with an empty transcript, so it reached the traveller as "the microphone did nothing".
   * Firefox records Ogg/Opus and Safari labels its MP4 `audio/x-m4a`; neither was on the
   * list, and neither had any other way to tell us.
   */
  acceptedAudioMimeTypes: [
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
  ],
} as const;

/** Pace → multiplier applied to each POI's base visit duration. Stop count never changes. */
export const PACE_DURATION_MULTIPLIER = {
  relaxed: 1.25,
  balanced: 1,
  explorer: 0.8,
} as const;

/**
 * Above this straight-line distance the engine prefers a car segment.
 *
 * Measured on STREET distance (haversine x STREET_DETOUR_FACTOR), not as the crow flies.
 * 2_600 m because the specification's own golden day (Q56) walks legs of 2.4 km and
 * 2.5 km. At the previous 1_800 m the engine called both CAR, contradicting the route it
 * is meant to produce — and a day that is already mostly car leaves Less Walking nothing
 * to save.
 */
export const WALKING_COMFORT_METERS = 2_600;

/**
 * Above this walked distance, Less Walking converts a leg to a car.
 *
 * Deliberately LOWER than WALKING_COMFORT_METERS: one number cannot be both "how far we
 * are happy to walk when planning" and "how far is too far once the traveller says their
 * feet hurt". Sharing them made Less Walking a no-op — every leg it should have shortened
 * counted as already comfortable.
 */
export const LESS_WALKING_SEGMENT_METERS = 1_800;

/** Average speeds used by fallback routing when no provider answers. */
export const FALLBACK_SPEED = {
  walkingKmh: 4.6,
  carKmh: 22,
} as const;

/**
 * What each stated budget means in MAD, for a whole day.
 *
 * One table, read by the engine when it *selects* and by the trip brief when it
 * *reports*. They were two copies of the same three numbers, which is how the product
 * came to generate a 570 MAD day and then warn about it: the selector had no idea what
 * the reporter was going to say. A day the engine believes it has fitted must never come
 * back flagged as over budget, and that can only be guaranteed by one number.
 *
 * `premium` is deliberately unbounded rather than a large figure — "no ceiling" is the
 * honest reading of the answer, and an arbitrary cap would invent a limit nobody stated.
 */
export const BUDGET_CAP_MAD: Record<BudgetLevel, number> = {
  low: 150,
  medium: 400,
  premium: Number.POSITIVE_INFINITY,
};

/**
 * Minutes the traveller actually has, per stated answer. Same contract as the budget
 * caps: the engine fits the day to these, the brief reports against these.
 *
 * These are the whole day end to end — visits plus the travel between them — not the
 * sum of the visits, because that is the number the traveller experiences.
 */
export const TIME_BUDGET_MINUTES: Record<TimeAvailable, number> = {
  few_hours: 240,
  half_day: 360,
  full_day: 540,
};
