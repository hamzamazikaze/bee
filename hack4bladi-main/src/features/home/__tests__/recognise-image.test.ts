/**
 * What the client keeps from an image analysis.
 *
 * A screenshot of a post rarely contains a nameable monument, but it very often contains
 * the place *written down* — a tab title, a caption, a `?q=` in a visible URL. The route
 * already reads that and grounds it; the client used to throw the whole analysis away
 * whenever `detectedPlace` was null and tell the traveller "we could not place this one"
 * over evidence that plainly named a city.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { recogniseImage } from "../analyze";
import { draftFromImageAnalysis } from "@/lib/intent";
import { EMPTY_ANALYSIS } from "@/lib/ai";
import type { ImageAnalysisResult } from "@/lib/ai/types";

/** Stands in for /api/analyze, answering exactly as the route does. */
function routeAnswers(result: Partial<ImageAnalysisResult> | null, ok = true) {
  const analysis = { ...EMPTY_ANALYSIS, ...(result ?? {}) };
  vi.stubGlobal("fetch", async () =>
    new Response(
      JSON.stringify({
        ok,
        degraded: false,
        result: analysis,
        draft: draftFromImageAnalysis(analysis, { locale: "en" }),
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );
}

const file = () =>
  new File([new Uint8Array([1, 2, 3])], "screenshot.webp", { type: "image/webp" });

afterEach(() => vi.unstubAllGlobals());

describe("recogniseImage keeps what the analysis understood", () => {
  it("reads the city off a screenshot that names no landmark", async () => {
    // The TikTok screenshot: a souk, no monument — but the browser chrome is in the shot.
    routeAnswers({
      detectedPlace: null,
      destination: null,
      ocrText: "Trouve 'El jadida' · tiktok.com/…459977016?q=El%20jadida  Le Souk",
      labels: ["market", "souk", "textiles"],
      interestHints: ["hidden_gems", "culture"],
    });

    const recognition = await recogniseImage(file());

    expect(recognition.destination).toBe("El Jadida");
    expect(recognition.detectedPlace).toBeNull(); // nothing invented
    expect(recognition.usedFallback).toBe(false);
    expect(recognition.draft.interests).toContain("hidden_gems");
  });

  it("still prefers a real landmark when the model names one", async () => {
    routeAnswers({
      detectedPlace: "Mosquée Hassan II",
      destination: "Casablanca",
      confidence: { destination: 0.99, detectedPlace: 0.99 },
      interestHints: ["culture"],
    });

    const recognition = await recogniseImage(file());

    expect(recognition.detectedPlace).toBe("Mosquée Hassan II");
    expect(recognition.destination).toBe("Casablanca");
    expect(recognition.detectedPoiId).toBe("poi-hassan-ii");
    expect(recognition.confidence).toBe(0.99);
  });

  it("gives up only when there is genuinely nothing", async () => {
    routeAnswers({ detectedPlace: null, destination: null, ocrText: "Color Palette #0D0D0D" });

    const recognition = await recogniseImage(file());

    expect(recognition.destination).toBeNull();
    expect(recognition.detectedPlace).toBeNull();
    expect(recognition.usedFallback).toBe(true);
  });

  it("invents nothing when the route itself fails", async () => {
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 500 }));

    const recognition = await recogniseImage(file());

    expect(recognition.destination).toBeNull();
    expect(recognition.detectedPlace).toBeNull();
    expect(recognition.labels).toEqual([]);
    expect(recognition.usedFallback).toBe(true);
  });
});
