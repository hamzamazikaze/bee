/**
 * The only untrusted boundary in the app: JSON produced by a language model.
 * Everything crossing it is parsed here, or discarded.
 */
import { z } from "zod";
import { INTERESTS, type TripProfile } from "@/types/profile";
import type { Locale } from "@/types/common";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/locales";

const localeSchema = z.enum(LOCALES);
const interestSchema = z.enum(INTERESTS as unknown as [string, ...string[]]);

const socialContextSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "facebook", "youtube", "other"]),
  url: z.string(),
  author: z.string().nullish(),
  title: z.string().nullish(),
  caption: z.string().nullish(),
  hashtags: z.array(z.string()).optional(),
  thumbnailUrl: z.string().nullish(),
});

export const tripProfileSchema = z.object({
  destination: z.string().nullable().catch(null),
  detectedPlace: z.string().nullable().catch(null),
  detectedPoiId: z.string().nullable().catch(null),
  interests: z.array(interestSchema).max(3).catch([]),
  timeAvailable: z.enum(["few_hours", "half_day", "full_day"]).nullable().catch(null),
  budgetLevel: z.enum(["low", "medium", "premium"]).nullable().catch(null),
  pace: z.enum(["relaxed", "balanced", "explorer"]).nullable().catch(null),
  walkingPreference: z.enum(["minimal", "normal", "plenty"]).nullable().catch(null),
  locale: localeSchema.catch(DEFAULT_LOCALE),
  confidence: z.record(z.string(), z.number().min(0).max(1)).catch({}),
  sources: z
    .array(z.enum(["image", "social_url", "voice", "text", "manual", "preset"]))
    .catch([]),
  social: socialContextSchema.nullish(),
  transcript: z.string().nullish(),
  createdAt: z.string().catch(() => new Date().toISOString()),
});

export function createEmptyProfile(locale: Locale = DEFAULT_LOCALE): TripProfile {
  return {
    destination: null,
    detectedPlace: null,
    detectedPoiId: null,
    interests: [],
    timeAvailable: null,
    budgetLevel: null,
    pace: null,
    walkingPreference: null,
    locale,
    confidence: {},
    sources: [],
    social: null,
    transcript: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Never throws. Unparseable model output yields an empty profile rather than an error
 * screen — the user still gets a trip, built from what they picked by hand.
 */
export function parseTripProfile(input: unknown, locale: Locale = DEFAULT_LOCALE): TripProfile {
  const result = tripProfileSchema.safeParse(input);
  if (!result.success) return createEmptyProfile(locale);
  return { ...createEmptyProfile(locale), ...result.data } as TripProfile;
}
