/**
 * The understanding layer as the app actually runs it: the real route handlers and the
 * real Gemini providers, with only the network stubbed.
 *
 * The two properties every case here checks are the two the demo depends on — the answer
 * is always 200 with a usable draft, and nothing the model says reaches application state
 * without crossing Zod first.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiIntentProvider } from "@/lib/ai/intent";
import { GeminiProvider } from "@/lib/ai/gemini";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as extract } from "@/app/api/extract/route";
import { POST as transcribe } from "@/app/api/transcribe/route";
import type { TripIntentDraft } from "@/types/intent";
import type { TripProfile } from "@/types/profile";

/** One Gemini answer, in the envelope the API actually returns. */
const geminiSays = (payload: unknown) =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
    { headers: { "content-type": "application/json" } },
  );

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      handler(typeof input === "string" ? input : input.toString()),
    ),
  );
}

const jsonRequest = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const imageBody = { image: { base64: "AAAA", mimeType: "image/png" } };

interface AnalyzeResponse {
  ok: boolean;
  degraded: boolean;
  reason?: string;
  result: { detectedPlace: string | null; detectedPoiId: string | null };
  draft: TripIntentDraft;
}

interface ExtractResponse {
  ok: boolean;
  degraded: boolean;
  draft: TripIntentDraft;
  profile: TripProfile;
  trace?: Record<string, unknown>;
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
  vi.stubEnv("GROQ_API_KEY", "test-groq-key");
  // No real network: a case that does not stub fetch used to reach Gemini for real and
  // time out on a slow connection. Offline is the degraded path these cases assert anyway.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("network disabled in tests");
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("IMAGE — POST /api/analyze", () => {
  it("turns Hassan II evidence into a grounded, preselectable draft", async () => {
    stubFetch(() =>
      geminiSays({
        destination: "Casablanca",
        country: "Morocco",
        detectedPlace: "Hassan II Mosque",
        labels: ["minaret", "zellige", "atlantic"],
        ocrText: "Mosquée Hassan II",
        interestHints: ["culture", "art_creative"],
        activityHints: ["guided visit"],
        confidence: { detectedPlace: 0.94, destination: 0.96 },
      }),
    );

    const body = (await (await analyze(jsonRequest("/api/analyze", imageBody))).json()) as
      AnalyzeResponse;

    expect(body.ok).toBe(true);
    expect(body.degraded).toBe(false);
    expect(body.result.detectedPoiId).toBe("poi-hassan-ii");
    expect(body.draft.destination.detectedPoiId).toBe("poi-hassan-ii");
    expect(body.draft.interests).toEqual(["culture", "art_creative"]);
    expect(body.draft.band).toBe("high");
  });

  it("answers 200 with an empty draft on an image it cannot place", async () => {
    stubFetch(() =>
      geminiSays({ destination: null, detectedPlace: null, labels: [], confidence: {} }),
    );

    const body = (await (await analyze(jsonRequest("/api/analyze", imageBody))).json()) as
      AnalyzeResponse;

    expect(body.ok).toBe(true);
    expect(body.result.detectedPlace).toBeNull();
    expect(body.draft.band).toBe("low");
    expect(body.draft.candidates).toEqual([]);
  });

  it("degrades rather than fails when Gemini is unavailable", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await analyze(jsonRequest("/api/analyze", imageBody));
    const body = (await response.json()) as AnalyzeResponse;

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(true);
    expect(body.reason).toBe("unavailable");
    expect(body.draft.degraded).toBe(true);
    expect(body.draft.source).toBe("image");
  });

  it("degrades on an upstream error, a timeout and unparseable output alike", async () => {
    for (const failure of [
      () => new Response("boom", { status: 500 }),
      () => {
        throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
      },
      () => geminiSays("not an object at all"),
    ]) {
      stubFetch(failure as () => Response);
      const body = (await (await analyze(jsonRequest("/api/analyze", imageBody))).json()) as
        AnalyzeResponse;
      expect(body.ok).toBe(true);
      expect(body.draft.destination.detectedPoiId).toBeNull();
    }
  });

  it("still answers 200 when the upload itself is rejected", async () => {
    const body = (await (
      await analyze(jsonRequest("/api/analyze", { image: { base64: 1, mimeType: 2 } }))
    ).json()) as AnalyzeResponse;

    expect(body.ok).toBe(false);
    expect(body.reason).toBe("missing_file");
    expect(body.draft).toBeTruthy();
  });
});

describe("AUDIO — POST /api/transcribe, then extraction", () => {
  function audioRequest() {
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "v.webm", { type: "audio/webm" }));
    return new Request("http://localhost/api/transcribe", { method: "POST", body: form });
  }

  it("returns the transcript Whisper produced", async () => {
    stubFetch(() => new Response(JSON.stringify({ text: "  a half day in Casablanca  ", language: "en" })));
    const body = (await (await transcribe(audioRequest())).json()) as {
      degraded: boolean;
      text: string;
      detectedLocale: string | null;
    };

    expect(body.degraded).toBe(false);
    expect(body.text).toBe("a half day in Casablanca");
    expect(body.detectedLocale).toBe("en");
  });

  it("degrades to empty text when Groq is unavailable", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const response = await transcribe(audioRequest());
    const body = (await response.json()) as { degraded: boolean; text: string; reason: string };

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(true);
    expect(body.reason).toBe("unavailable");
    expect(body.text).toBe("");
  });

  it("understands a transcript in each of the three languages", async () => {
    const cases: [string, string, Record<string, unknown>][] = [
      [
        "en",
        "Half a day in Casablanca, culture and food, medium budget, not too much walking",
        { city: "Casablanca", interests: ["culture", "food"], timeAvailable: "half_day",
          budgetLevel: "medium", pace: null, avoidLongWalks: true, confidence: 0.9 },
      ],
      [
        "fr",
        "Je suis à Casablanca pour une demi-journée, j'aime la culture et la nourriture, budget moyen et pas trop de marche",
        { city: "Casablanca", interests: ["culture", "food"], timeAvailable: "half_day",
          budgetLevel: "medium", pace: null, avoidLongWalks: true, confidence: 0.92 },
      ],
      [
        "ar",
        "أنا في الدار البيضاء نصف يوم، أحب الثقافة والأكل، ميزانية متوسطة ومشي قليل",
        { city: "Casablanca", interests: ["culture", "food"], timeAvailable: "half_day",
          budgetLevel: "medium", pace: null, avoidLongWalks: true, confidence: 0.88 },
      ],
    ];

    for (const [locale, transcriptText, answer] of cases) {
      stubFetch(() => geminiSays(answer));
      const body = (await (
        await extract(
          jsonRequest("/api/extract", { source: "audio", transcript: transcriptText, locale }),
        )
      ).json()) as ExtractResponse;

      expect(body.degraded).toBe(false);
      expect(body.draft.source).toBe("audio");
      expect(body.draft.locale).toBe(locale);
      expect(body.draft.destination.city).toBe("Casablanca");
      expect(body.draft.interests).toEqual(["culture", "food"]);
      expect(body.draft.timeAvailable).toBe("half_day");
      expect(body.draft.budgetLevel).toBe("medium");
      expect(body.draft.mobility.avoidLongWalks).toBe(true);
      expect(body.draft.provenance.interests).toBe("voice");
      expect(body.profile.walkingPreference).toBe("minimal");
      expect(body.draft.band).toBe("high");
    }
  });

  it("falls back to the local keyword pass when Gemini is gone", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const body = (await (
      await extract(
        jsonRequest("/api/extract", {
          source: "audio",
          transcript: "demi-journée à Casablanca, culture et nourriture, pas trop de marche",
          locale: "fr",
        }),
      )
    ).json()) as ExtractResponse;

    expect(body.degraded).toBe(true);
    expect(body.draft.destination.city).toBe("Casablanca");
    expect(body.draft.timeAvailable).toBe("half_day");
    expect(body.draft.mobility.avoidLongWalks).toBe(true);
    // Degraded means we ask rather than assert.
    expect(body.draft.band).toBe("low");
    expect(body.profile.walkingPreference).toBe("minimal");
  });
});

describe("TEXT — POST /api/extract", () => {
  it("extracts the brief's Casablanca culture half-day", async () => {
    stubFetch(() =>
      geminiSays({
        city: "Casablanca",
        region: "Casablanca-Settat",
        detectedPlace: null,
        interests: ["culture"],
        timeAvailable: "half_day",
        budgetLevel: null,
        pace: null,
        avoidLongWalks: null,
        constraints: [],
        confidence: 0.85,
      }),
    );

    const body = (await (
      await extract(
        jsonRequest("/api/extract", { source: "text", text: "culture in Casablanca, half a day" }),
      )
    ).json()) as ExtractResponse;

    expect(body.draft.destination.city).toBe("Casablanca");
    expect(body.draft.interests).toEqual(["culture"]);
    expect(body.draft.timeAvailable).toBe("half_day");
    expect(body.draft.uncertainFields).toContain("budgetLevel");
    expect(body.profile.destination).toBe("Casablanca");
    expect(body.profile.sources).toEqual(["text"]);
  });

  it("keeps constraints as evidence without letting them become enum values", async () => {
    stubFetch(() =>
      geminiSays({
        city: "Casablanca",
        interests: ["food"],
        constraints: ["back before 18:00", "travelling with a toddler"],
        confidence: 0.7,
      }),
    );

    const body = (await (
      await extract(jsonRequest("/api/extract", { source: "text", text: "…" }))
    ).json()) as ExtractResponse;

    expect(body.draft.constraints).toEqual(["back before 18:00", "travelling with a toddler"]);
    expect(body.draft.pace).toBeNull();
  });

  it("never lets a manual choice be overwritten by the model", async () => {
    stubFetch(() =>
      geminiSays({
        city: "Oualidia",
        interests: ["coast_nature"],
        budgetLevel: "premium",
        confidence: 0.95,
      }),
    );

    const known: Partial<TripProfile> = {
      destination: "El Jadida",
      interests: ["food"],
      budgetLevel: "low",
    };
    const body = (await (
      await extract(jsonRequest("/api/extract", { source: "text", text: "…", known }))
    ).json()) as ExtractResponse;

    expect(body.draft.destination.city).toBe("El Jadida");
    expect(body.draft.interests).toEqual(["food"]);
    expect(body.draft.budgetLevel).toBe("low");
    expect(body.draft.provenance.city).toBe("manual");
    expect(body.profile.budgetLevel).toBe("low");
  });

  it("does not let a caller's whole current profile blank out what was understood", async () => {
    stubFetch(() =>
      geminiSays({
        city: "Casablanca",
        interests: ["culture", "food"],
        timeAvailable: "half_day",
        budgetLevel: "medium",
        avoidLongWalks: true,
        confidence: 0.9,
      }),
    );

    /* The composer sends the profile it is holding, and early on that profile is empty.
       Those nulls are "not chosen yet", not "chosen to be nothing". */
    const emptyProfile: Partial<TripProfile> = {
      destination: null,
      detectedPlace: null,
      detectedPoiId: null,
      interests: [],
      timeAvailable: null,
      budgetLevel: null,
      pace: null,
      walkingPreference: null,
      locale: "en",
      confidence: {},
      sources: [],
    };

    const body = (await (
      await extract(
        jsonRequest("/api/extract", { source: "text", text: "…", known: emptyProfile }),
      )
    ).json()) as ExtractResponse;

    expect(body.draft.interests).toEqual(["culture", "food"]);
    expect(body.profile.interests).toEqual(["culture", "food"]);
    expect(body.profile.timeAvailable).toBe("half_day");
    expect(body.profile.budgetLevel).toBe("medium");
    expect(body.profile.destination).toBe("Casablanca");
    expect(body.profile.walkingPreference).toBe("minimal");
  });

  it("treats a malformed body as an empty one rather than a 400", async () => {
    const response = await extract(
      new Request("http://localhost/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
    );
    const body = (await response.json()) as ExtractResponse;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.draft.band).toBe("low");
  });
});

describe("URL — POST /api/extract runs the chain, then understands it", () => {
  it("reads a TikTok link, analyses its thumbnail, and grounds the candidate", async () => {
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      if (url.includes("tiktok.com/oembed")) {
        return new Response(
          JSON.stringify({
            title: "Half a day in Casablanca #morocco",
            author_name: "traveller",
            thumbnail_url: "https://p16.tiktokcdn.com/thumb.jpg",
          }),
        );
      }
      if (url.includes("tiktokcdn")) {
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/jpeg" },
        });
      }
      return geminiSays({
        city: "Casablanca",
        detectedPlace: "Hassan II Mosque",
        interests: ["culture", "food"],
        timeAvailable: "half_day",
        confidence: 0.9,
      });
    });

    const body = (await (
      await extract(
        jsonRequest("/api/extract", {
          source: "url",
          url: "https://www.tiktok.com/@traveller/video/123",
        }),
      )
    ).json()) as ExtractResponse;

    expect(body.draft.source).toBe("url");
    expect(body.draft.destination.detectedPoiId).toBe("poi-hassan-ii");
    expect(body.draft.evidence.urlTitle).toContain("Casablanca");
    expect(body.draft.evidence.urlThumbnailUrl).toBe("https://p16.tiktokcdn.com/thumb.jpg");
    expect(body.draft.provenance.detectedPlace).toBe("url_thumbnail");
    expect(body.profile.social?.platform).toBe("tiktok");
    // The thumbnail was fetched and handed to the multimodal provider.
    expect(seen.some((url) => url.includes("tiktokcdn"))).toBe(true);
    expect(body.trace?.thumbnailAnalysed).toBe(true);
  });

  it("continues on the text metadata when the thumbnail cannot be fetched", async () => {
    stubFetch((url) => {
      if (url.includes("oembed")) {
        return new Response(
          JSON.stringify({
            title: "Oualidia oysters and the lagoon",
            author_name: "a",
            thumbnail_url: "https://p16.tiktokcdn.com/gone.jpg",
          }),
        );
      }
      if (url.includes("tiktokcdn")) return new Response("gone", { status: 404 });
      return geminiSays({ city: "Oualidia", interests: ["food", "coast_nature"], confidence: 0.8 });
    });

    const body = (await (
      await extract(
        jsonRequest("/api/extract", { source: "url", url: "https://www.tiktok.com/@a/video/1" }),
      )
    ).json()) as ExtractResponse;

    expect(body.degraded).toBe(false);
    expect(body.draft.destination.city).toBe("Oualidia");
    expect(body.draft.interests).toEqual(["food", "coast_nature"]);
    expect(body.trace?.thumbnailAnalysed).toBe(false);
  });

  it("uses the official YouTube API when a key is configured", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "yt-key");
    stubFetch((url) => {
      if (url.includes("youtube/v3/videos")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                snippet: {
                  title: "A full day in El Jadida",
                  description: "The Portuguese cistern and the ramparts.",
                  channelTitle: "Morocco Walks",
                  thumbnails: {},
                },
              },
            ],
          }),
        );
      }
      return geminiSays({ city: "El Jadida", timeAvailable: "full_day", confidence: 0.8 });
    });

    const body = (await (
      await extract(
        jsonRequest("/api/extract", {
          source: "url",
          url: "https://youtu.be/dQw4w9WgXcQ",
        }),
      )
    ).json()) as ExtractResponse;

    expect(body.trace?.urlProvider).toBe("youtube_api");
    expect(body.draft.evidence.urlAuthor).toBe("Morocco Walks");
    expect(body.draft.timeAvailable).toBe("full_day");
  });

  it("reads a generic page's OpenGraph tags", async () => {
    stubFetch((url) =>
      url.includes("generativelanguage")
        ? geminiSays({ city: "Mohammedia", interests: ["coast_nature"], confidence: 0.7 })
        : new Response('<meta property="og:title" content="Mohammedia beaches" />', {
            headers: { "content-type": "text/html" },
          }),
    );

    const body = (await (
      await extract(
        jsonRequest("/api/extract", { source: "url", url: "https://example.ma/mohammedia" }),
      )
    ).json()) as ExtractResponse;

    expect(body.trace?.urlProvider).toBe("opengraph");
    expect(body.draft.evidence.urlTitle).toBe("Mohammedia beaches");
    expect(body.profile.social?.platform).toBe("other");
  });

  it("does not block on an invalid URL", async () => {
    stubFetch(() => geminiSays({}));
    const body = (await (
      await extract(jsonRequest("/api/extract", { source: "url", url: "not a link" }))
    ).json()) as ExtractResponse;

    expect(body.ok).toBe(true);
    expect(body.trace?.urlProvider).toBe("invalid_url");
    expect(body.draft.band).toBe("low");
  });

  it("does not block when metadata times out", async () => {
    stubFetch((url) => {
      if (url.includes("generativelanguage")) return geminiSays({ confidence: 0.1 });
      throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
    });

    const body = (await (
      await extract(
        jsonRequest("/api/extract", { source: "url", url: "https://www.tiktok.com/@a/video/1" }),
      )
    ).json()) as ExtractResponse;

    expect(body.ok).toBe(true);
    expect(body.trace?.urlProvider).toBe("platform_only");
    expect(body.profile.social?.platform).toBe("tiktok");
  });

  it("still reads the link when Gemini is gone, and says the draft is degraded", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    stubFetch(() =>
      new Response(
        JSON.stringify({
          title: "Half a day in Casablanca — Mosquée Hassan II and street food",
          author_name: "traveller",
          thumbnail_url: null,
        }),
      ),
    );

    const body = (await (
      await extract(
        jsonRequest("/api/extract", { source: "url", url: "https://www.tiktok.com/@a/video/1" }),
      )
    ).json()) as ExtractResponse;

    expect(body.degraded).toBe(true);
    expect(body.trace?.urlProvider).toBe("tiktok_oembed");
    // Real metadata, degraded understanding: the link still grounded a candidate.
    expect(body.draft.destination.detectedPoiId).toBe("poi-hassan-ii");
    expect(body.draft.timeAvailable).toBe("half_day");
    expect(body.draft.band).toBe("low");
  });
});

describe("the providers themselves", () => {
  it("never lets the model author a POI id or an itinerary", async () => {
    stubFetch(() =>
      geminiSays({
        city: "Casablanca",
        detectedPlace: "Hassan II Mosque",
        detectedPoiId: "poi-whatever-i-want",
        interests: ["culture", "teleportation"],
        stops: [{ name: "invented stop", lat: 0, lng: 0 }],
        confidence: 2,
      }),
    );

    const draft = await new GeminiIntentProvider("k", "gemini-2.5-flash").extractIntent({
      source: "text",
      locale: "en",
      text: "a day in Casablanca",
    });

    expect(draft.destination.detectedPoiId).toBe("poi-hassan-ii");
    expect(draft.interests).toEqual(["culture"]);
    expect(draft).not.toHaveProperty("stops");
    expect(draft.confidence).toBeLessThanOrEqual(1);
  });

  it("keeps the AIProvider contract working through the same extractor", async () => {
    stubFetch(() =>
      geminiSays({ city: "Azemmour", interests: ["art_creative"], confidence: 0.8 }),
    );

    const profile = await new GeminiProvider("k").extractTripProfile({
      locale: "fr",
      sources: ["text"],
      text: "street art à Azemmour",
    });

    expect(profile.destination).toBe("Azemmour");
    expect(profile.interests).toEqual(["art_creative"]);
    expect(profile.locale).toBe("fr");
    expect(profile.sources).toEqual(["text"]);
  });
});
