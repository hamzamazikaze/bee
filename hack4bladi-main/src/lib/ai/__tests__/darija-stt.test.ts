/**
 * Darija voice, end to end minus the microphone.
 *
 * The SSE cases are the ones already proven against the live MoulSot Space in the
 * Checkmate project, kept verbatim in behaviour so a protocol change breaks a test rather
 * than a demo. The rest covers what this app adds: engine order, fallback, and the fact
 * that a Darija sentence has to come out of the far end as a TripProfile the local engine
 * can build four stops from — with no second LLM call anywhere in the chain.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSSE, prefersDarija, transcribeDarija } from "@/lib/ai/darija-stt";
import { POST as transcribe } from "@/app/api/transcribe/route";
import { POST as extract } from "@/app/api/extract/route";
import { buildTrip } from "@/features/onboarding/build-trip";
import { draftToProfile } from "@/lib/intent";
import { parseTripIntentDraft } from "@/lib/intent";
import { TRIP_STOP_COUNT } from "@/types/trip";
import type { TripIntentDraft } from "@/types/intent";
import type { TripProfile } from "@/types/profile";

/** The sentence the demo is scripted around. */
const DARIJA = "أنا فكازا نهار كامل، كيعجبني التراث والماكلة، وما بغيتش نمشي بزاف";

/** What the live Space actually returned for the checked-in sample. */
const REAL_FRAME =
  'event: complete\ndata: ["\\u0627\\u0644\\u0644\\u0647\\u0645 \\u0635\\u0644 \\u0648\\u0633\\u0644\\u0645 \\u0648\\u0628\\u0627\\u0631\\u0643 \\u0641\\u064a\\u0643"]';

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      handler(typeof input === "string" ? input : input.toString()),
    ),
  );
}

/** The three-call Gradio protocol, answering with `frames` at the end. */
function stubSpace(frames: string, options: { uploadStatus?: number; callStatus?: number } = {}) {
  stubFetch((url) => {
    if (url.endsWith("/gradio_api/upload")) {
      return options.uploadStatus && options.uploadStatus !== 200
        ? new Response("no", { status: options.uploadStatus })
        : new Response(JSON.stringify(["/tmp/gradio/abc/audio.webm"]));
    }
    if (url.endsWith("/gradio_api/call/transcribe")) {
      return options.callStatus && options.callStatus !== 200
        ? new Response("no", { status: options.callStatus })
        : new Response(JSON.stringify({ event_id: "evt-1" }));
    }
    return new Response(frames);
  });
}

const audioRequest = (locale?: string) => {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "v.webm", { type: "audio/webm" }));
  if (locale) form.append("locale", locale);
  return new Request("http://localhost/api/transcribe", { method: "POST", body: form });
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("parseSSE — the Gradio frames MoulSot actually sends", () => {
  it("reads the real completion frame and preserves Arabic", () => {
    expect(parseSSE(REAL_FRAME)).toBe("اللهم صل وسلم وبارك فيك");
  });

  it("keeps the last frame when the Space streams partials", () => {
    expect(parseSSE('event: generating\ndata: ["a"]\n\nevent: complete\ndata: ["b"]')).toBe("b");
  });

  it("raises the Space's own reason on an error frame", () => {
    expect(() => parseSSE("event: error\ndata: boom")).toThrow(/boom/);
    expect(() => parseSSE("event: error\ndata: ")).toThrow(/transcription service failed/);
  });

  it("rejects malformed and heartbeat-only streams rather than returning junk", () => {
    expect(() => parseSSE(": ping")).toThrow(/unexpected response/);
    expect(() => parseSSE("")).toThrow(/unexpected response/);
    expect(() => parseSSE("event: complete\ndata: {not json")).toThrow();
  });

  it("unwraps a bare string as readily as the usual array", () => {
    expect(parseSSE('event: complete\ndata: "سلام"')).toBe("سلام");
  });

  it("does not mangle Arabic through the whole transport", async () => {
    stubSpace(REAL_FRAME);
    const result = await transcribeDarija(new Blob([new Uint8Array([1])], { type: "audio/webm" }));
    expect(result.text).toBe("اللهم صل وسلم وبارك فيك");
    expect(result.provider).toBe("moulsot");
    expect(result.language).toBe("ar");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("fails loudly at each step so the route can fall through", async () => {
    const blob = new Blob([new Uint8Array([1])], { type: "audio/webm" });

    stubSpace(REAL_FRAME, { uploadStatus: 503 });
    await expect(transcribeDarija(blob)).rejects.toThrow(/upload failed/);

    stubSpace(REAL_FRAME, { callStatus: 500 });
    await expect(transcribeDarija(blob)).rejects.toThrow(/transcription refused/);

    stubSpace('event: complete\ndata: [""]');
    await expect(transcribeDarija(blob)).rejects.toThrow(/empty transcript/);

    stubFetch(() => {
      throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
    });
    await expect(transcribeDarija(blob)).rejects.toThrow();
  });
});

describe("POST /api/transcribe — MoulSot leads for Darija, Whisper for the rest", () => {
  it("prefers MoulSot for Arabic", () => {
    expect(prefersDarija("ar")).toBe(true);
    expect(prefersDarija("fr")).toBe(false);
    expect(prefersDarija("en")).toBe(false);
  });

  it("transcribes Darija through the Space and names the provider", async () => {
    stubSpace(REAL_FRAME);
    const body = (await (await transcribe(audioRequest("ar"))).json()) as {
      degraded: boolean;
      text: string;
      provider: string;
    };

    expect(body.degraded).toBe(false);
    expect(body.text).toBe("اللهم صل وسلم وبارك فيك");
    expect(body.provider).toBe("moulsot");
  });

  it("falls back to Groq when the Space is asleep", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    stubFetch((url) => {
      if (url.includes("hf.space")) return new Response("sleeping", { status: 503 });
      return new Response(JSON.stringify({ text: "نهار كامل فكازا", language: "ar" }));
    });

    const body = (await (await transcribe(audioRequest("ar"))).json()) as {
      degraded: boolean;
      text: string;
      provider: string;
    };

    expect(body.degraded).toBe(false);
    expect(body.provider).toBe("groq");
    expect(body.text).toBe("نهار كامل فكازا");
  });

  /*
   * This asserted the opposite until the default changed, and the assertion was right for
   * the policy it was written under: French audio had no business waiting on a Darija
   * model. The product is a Moroccan one whose visitors mostly speak Darija, so the
   * default now buys certainty with the twenty seconds instead of inferring its way to
   * speed — and the French speaker pays for it. `VOICE_ENGINE=auto` is the other trade,
   * and the test below still holds it to the old behaviour.
   */
  it("asks both engines by default, so Darija is never missed", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      if (url.includes("hf.space")) return new Response("no", { status: 500 });
      return new Response(JSON.stringify({ text: "une demi-journée", language: "fr" }));
    });

    const body = (await (await transcribe(audioRequest("fr"))).json()) as { provider: string };
    /* The Space was asked and refused, so Whisper's answer stands — the point is that it
       was asked at all, with no interface language consulted to decide. */
    expect(seen.some((url) => url.includes("hf.space"))).toBe(true);
    expect(body.provider).toBe("groq");
  });

  it("under VOICE_ENGINE=auto, French audio never reaches the Darija engine", async () => {
    vi.stubEnv("VOICE_ENGINE", "auto");
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      if (url.includes("hf.space")) return new Response("no", { status: 500 });
      return new Response(JSON.stringify({ text: "une demi-journée", language: "fr" }));
    });

    const body = (await (await transcribe(audioRequest("fr"))).json()) as { provider: string };
    expect(body.provider).toBe("groq");
    // Whisper answered in French, so there was nothing to re-run and the Space was spared.
    expect(seen.some((url) => url.includes("hf.space"))).toBe(false);
  });

  it("degrades to empty text — never a hang — when both engines are gone", async () => {
    stubFetch(() => new Response("down", { status: 500 }));
    const response = await transcribe(audioRequest("ar"));
    const body = (await response.json()) as { degraded: boolean; text: string; reason: string };

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(true);
    expect(body.reason).toBe("unavailable");
    expect(body.text).toBe("");
  });

  it("still rejects a non-audio upload before either engine runs", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" }));
    const body = (await (
      await transcribe(new Request("http://localhost/api/transcribe", { method: "POST", body: form }))
    ).json()) as { ok: boolean; reason: string };

    expect(body.ok).toBe(false);
    expect(body.reason).toBe("unsupported_type");
  });
});

describe("DEMO — Darija transcript to a day the local engine builds", () => {
  /** What Gemini returns for the scripted sentence; captured from a live call. */
  const geminiAnswer = {
    city: "Casablanca",
    region: "Casablanca-Settat",
    detectedPlace: null,
    interests: ["culture", "food"],
    timeAvailable: "full_day",
    budgetLevel: null,
    pace: null,
    avoidLongWalks: true,
    constraints: [],
    confidence: 0.85,
  };

  const geminiSays = (payload: unknown) =>
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
      }),
    );

  async function draftFor(known?: Partial<TripProfile>): Promise<TripIntentDraft> {
    const body = (await (
      await extract(
        new Request("http://localhost/api/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source: "audio", transcript: DARIJA, locale: "ar", known }),
        }),
      )
    ).json()) as { draft: unknown };
    return parseTripIntentDraft(body.draft, "audio", "ar");
  }

  it("understands the scripted Darija sentence", async () => {
    stubFetch(() => geminiSays(geminiAnswer));
    const draft = await draftFor();

    expect(draft.destination.city).toBe("Casablanca");
    expect(draft.interests).toEqual(["culture", "food"]);
    expect(draft.timeAvailable).toBe("full_day");
    expect(draft.mobility.avoidLongWalks).toBe(true);
    // The Arabic is kept as evidence, untranslated.
    expect(draft.evidence.transcript).toBe(DARIJA);
    expect(draft.locale).toBe("ar");
  });

  it("hands the local engine a profile it builds exactly four stops from", async () => {
    stubFetch(() => geminiSays(geminiAnswer));
    const profile = draftToProfile(await draftFor());

    expect(profile.destination).toBe("Casablanca");
    expect(profile.timeAvailable).toBe("full_day");
    // "ما بغيتش نمشي بزاف" — the engine's own word for it.
    expect(profile.walkingPreference).toBe("minimal");
    expect(profile.sources).toEqual(["voice"]);

    /* From here on there is no model in the loop: matching, ordering and scheduling are
       local and deterministic. `buildTrip` only reaches for the network for map geometry,
       which is stubbed away here and is allowed to fail anyway. */
    vi.unstubAllGlobals();
    stubFetch(() => new Response("no routing in tests", { status: 500 }));

    const trip = await buildTrip(profile);
    expect(trip.stops).toHaveLength(TRIP_STOP_COUNT);
    expect(trip.stops.every((stop) => stop.poi.coordinates.lat && stop.poi.coordinates.lng)).toBe(true);
    expect(trip.stops.every((stop) => stop.arrivalTime)).toBe(true);
    expect(trip.segments).toHaveLength(TRIP_STOP_COUNT - 1);
  });

  it("lets an explicit manual choice outrank what the voice implied", async () => {
    stubFetch(() => geminiSays(geminiAnswer));
    // The traveller tapped "Happy to walk" and "Half day" by hand.
    const draft = await draftFor({ walkingPreference: "plenty", timeAvailable: "half_day" });

    expect(draft.mobility.avoidLongWalks).toBe(false);
    expect(draft.timeAvailable).toBe("half_day");
    expect(draft.provenance.mobility).toBe("manual");
    expect(draftToProfile(draft).walkingPreference).toBe("normal");
  });

  it("still understands the sentence with no Gemini at all", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const draft = await draftFor();

    expect(draft.degraded).toBe(true);
    expect(draft.destination.city).toBe("Casablanca");
    expect(draft.timeAvailable).toBe("full_day");
    expect(draft.mobility.avoidLongWalks).toBe(true);
    expect(draft.evidence.transcript).toBe(DARIJA);
  });
});
