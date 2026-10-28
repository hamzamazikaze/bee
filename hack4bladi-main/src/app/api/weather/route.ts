/**
 * GET /api/weather?lat=&lng=&city= — one small chip in the trip header.
 *
 * Optional by design: on any failure this answers 204 and the chip is simply omitted.
 * No placeholder, no error message (docs/FALLBACKS.md).
 */
import { APP, MAP, TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import type { LocalizedText } from "@/types/common";
import type { WeatherCondition, WeatherSummary } from "@/types/experience";

const NO_CONTENT = new Response(null, { status: 204 });

/** WMO weather codes → the four conditions the UI knows how to draw. */
function toCondition(code: number): WeatherCondition {
  if (code <= 1) return "sunny";
  if (code <= 48) return "cloudy";
  if (code <= 99) return "rain";
  return "unknown";
}

const LABEL: Record<WeatherCondition, LocalizedText> = {
  sunny: {
    en: "Sunny",
    fr: "Ensoleillé",
    ar: "مشمس",
    es: "Soleado",
    de: "Sonnig",
    it: "Sole",
    pt: "Sol",
  },
  cloudy: {
    en: "Cloudy",
    fr: "Nuageux",
    ar: "غائم",
    es: "Nublado",
    de: "Bewölkt",
    it: "Nuvoloso",
    pt: "Nublado",
  },
  rain: {
    en: "Rain",
    fr: "Pluie",
    ar: "ممطر",
    es: "Lluvia",
    de: "Regen",
    it: "Pioggia",
    pt: "Chuva",
  },
  wind: {
    en: "Windy",
    fr: "Venteux",
    ar: "عاصف",
    es: "Viento",
    de: "Windig",
    it: "Vento",
    pt: "Vento",
  },
  unknown: {
    en: "—",
    fr: "—",
    ar: "—",
    es: "—",
    de: "—",
    it: "—",
    pt: "—",
  },
};

function number(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = number(params.get("lat"), MAP.defaultCenter.lat);
  const lng = number(params.get("lng"), MAP.defaultCenter.lng);
  const city = params.get("city") || APP.defaultDestination;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUTS.weatherMs);

  try {
    const url =
      `${serverEnv.weather.baseUrl}/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code`;
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return NO_CONTENT;

    const payload: unknown = await response.json();
    const current = (payload as { current?: Record<string, unknown> }).current;
    const temperature = current?.temperature_2m;
    const code = current?.weather_code;
    if (typeof temperature !== "number" || typeof code !== "number") return NO_CONTENT;

    const condition = toCondition(code);
    const summary: WeatherSummary = {
      city,
      temperatureC: Math.round(temperature),
      condition,
      label: LABEL[condition],
    };
    return Response.json(summary);
  } catch {
    return NO_CONTENT;
  } finally {
    clearTimeout(timer);
  }
}
