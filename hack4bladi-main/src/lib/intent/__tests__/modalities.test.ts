/**
 * One draft, four on-ramps. These are the end-to-end cases from the brief, run against
 * the real adapters with no network: image evidence, the three languages the app speaks,
 * a pasted link's metadata, and the confirmation step that turns a draft into a profile.
 */
import { describe, expect, it } from "vitest";
import {
  draftFromImageAnalysis,
  draftFromLocalText,
  draftFromUrlMetadata,
  draftToProfile,
  localExtract,
} from "@/lib/intent";
import type { ImageAnalysisResult } from "@/lib/ai/types";
import type { UrlMetadata } from "@/lib/ai/url";

const HASSAN_II_ANALYSIS: ImageAnalysisResult = {
  destination: "Casablanca",
  country: "Morocco",
  detectedPlace: "Hassan II Mosque",
  detectedPoiId: "poi-hassan-ii",
  labels: ["minaret", "zellige", "atlantic", "marble"],
  ocrText: "Mosquée Hassan II — Casablanca",
  interestHints: ["culture", "art_creative"],
  activityHints: ["guided visit", "sunset walk along the sea"],
  confidence: { detectedPlace: 0.93, destination: 0.95 },
};

const UNKNOWN_ANALYSIS: ImageAnalysisResult = {
  destination: null,
  country: null,
  detectedPlace: null,
  detectedPoiId: null,
  labels: [],
  ocrText: null,
  interestHints: [],
  activityHints: [],
  confidence: {},
};

describe("IMAGE → candidate POI → draft", () => {
  it("grounds known Hassan II evidence on the curated id", () => {
    const draft = draftFromImageAnalysis(HASSAN_II_ANALYSIS, { locale: "en" });

    expect(draft.source).toBe("image");
    expect(draft.destination.detectedPoiId).toBe("poi-hassan-ii");
    expect(draft.destination.city).toBe("Casablanca");
    expect(draft.interests).toEqual(["culture", "art_creative"]);
    expect(draft.candidates[0]?.poiId).toBe("poi-hassan-ii");
    expect(draft.band).toBe("high");
    expect(draft.provenance.detectedPlace).toBe("image_visual");
    expect(draft.evidence.visualClues).toContain("minaret");
  });

  it("says it does not know, on an image it cannot place", () => {
    const draft = draftFromImageAnalysis(UNKNOWN_ANALYSIS, { locale: "en" });

    expect(draft.destination.detectedPlace).toBeNull();
    expect(draft.destination.detectedPoiId).toBeNull();
    expect(draft.candidates).toEqual([]);
    expect(draft.band).toBe("low");
    expect(draft.uncertainFields).toContain("city");
  });

  it("carries a low model score through to a low band", () => {
    const draft = draftFromImageAnalysis(
      { ...HASSAN_II_ANALYSIS, detectedPoiId: null, detectedPlace: "an old white building",
        confidence: { detectedPlace: 0.2 }, interestHints: [], activityHints: [] },
      { locale: "en" },
    );
    expect(draft.band).toBe("low");
    expect(draft.confidence).toBeLessThan(0.5);
  });

  it("is degraded but still shaped when Gemini is unavailable", () => {
    const draft = draftFromImageAnalysis(UNKNOWN_ANALYSIS, { locale: "fr", degraded: true });
    expect(draft.degraded).toBe(true);
    expect(draft.locale).toBe("fr");
    expect(draft.evidence.provider).toBeNull();
    expect(draft.band).toBe("low");
  });

  it("reads a place out of the caption when the model saw no landmark", () => {
    const draft = draftFromImageAnalysis(
      { ...UNKNOWN_ANALYSIS, ocrText: "3 days at the Cité Portugaise, El Jadida" },
      { locale: "en" },
    );
    expect(draft.destination.detectedPoiId).toBe("poi-cite-portugaise");
    expect(draft.provenance.detectedPlace ?? draft.provenance.detectedPoiId).toBe("image_ocr");
  });
});

describe("VOICE and TEXT → draft, without a model", () => {
  it("understands the brief's French sentence", () => {
    const draft = draftFromLocalText(
      "Je suis à Casablanca pour une demi-journée, j'aime la culture et la nourriture, budget moyen et pas trop de marche",
      { locale: "fr", source: "audio" },
    );

    expect(draft.source).toBe("audio");
    expect(draft.destination.city).toBe("Casablanca");
    expect(draft.interests).toEqual(expect.arrayContaining(["culture", "food"]));
    expect(draft.timeAvailable).toBe("half_day");
    expect(draft.budgetLevel).toBe("medium");
    expect(draft.mobility.avoidLongWalks).toBe(true);
    expect(draft.provenance.interests).toBe("voice");
    expect(draft.evidence.transcript).toContain("Casablanca");
  });

  it("understands the same day in English", () => {
    const draft = draftFromLocalText(
      "Half a day in Casablanca, I like culture and food, medium budget, not too much walking",
      { locale: "en", source: "text" },
    );
    expect(draft.destination.city).toBe("Casablanca");
    expect(draft.timeAvailable).toBe("half_day");
    expect(draft.budgetLevel).toBe("medium");
    expect(draft.mobility.avoidLongWalks).toBe(true);
    expect(draft.interests).toEqual(expect.arrayContaining(["culture", "food"]));
  });

  it("understands the same day in Arabic", () => {
    const draft = draftFromLocalText(
      "أنا في الدار البيضاء نصف يوم، أحب الثقافة والأكل، ميزانية متوسطة ومشي قليل",
      { locale: "ar", source: "audio" },
    );
    expect(draft.destination.city).toBe("Casablanca");
    expect(draft.timeAvailable).toBe("half_day");
    expect(draft.interests).toEqual(expect.arrayContaining(["culture", "food"]));
    expect(draft.mobility.avoidLongWalks).toBe(true);
  });

  it("extracts a budget on its own", () => {
    expect(localExtract("cheap eats only please").budgetLevel).toBe("low");
    expect(localExtract("un petit budget").budgetLevel).toBe("low");
    expect(localExtract("we want fine dining").budgetLevel).toBe("premium");
  });

  it("extracts the walking constraint on its own", () => {
    expect(localExtract("no long walks, my knees are bad").avoidLongWalks).toBe(true);
    expect(localExtract("we love walking everywhere").avoidLongWalks).toBe(false);
    expect(localExtract("a day in Casablanca").avoidLongWalks).toBeUndefined();
  });

  it("stays empty rather than guessing at an empty input", () => {
    const draft = draftFromLocalText("   ", { locale: "en", source: "text" });
    expect(draft.interests).toEqual([]);
    expect(draft.destination.city).toBeNull();
    expect(draft.band).toBe("low");
  });

  it("grounds a named place the dataset knows, and nothing it does not", () => {
    /* The keyword pass has no place index of its own — grounding is the shared token
       resolver, so a typed sentence and a model answer are matched the same way. */
    const known = draftFromLocalText("take me to the Quartier Habous", {
      locale: "en",
      source: "text",
    });
    expect(known.destination.detectedPoiId).toBe("poi-habous");
    expect(known.destination.detectedPlace).toBe("Quartier Habous");

    const elsewhere = draftFromLocalText("take me to the Eiffel Tower", {
      locale: "en",
      source: "text",
    });
    expect(elsewhere.destination.detectedPoiId).toBeNull();
    expect(elsewhere.destination.detectedPlace).toBeNull();
  });

  it("names a POI in the dataset's own words, in whichever language it was asked for", () => {
    const english = draftFromLocalText("I want to see the Hassan II Mosque", {
      locale: "en",
      source: "text",
    });
    expect(english.destination.detectedPoiId).toBe("poi-hassan-ii");
    expect(english.destination.detectedPlace).toBe("Mosquée Hassan II");

    const arabic = draftFromLocalText("أريد زيارة مسجد الحسن الثاني", {
      locale: "ar",
      source: "audio",
    });
    expect(arabic.destination.detectedPoiId).toBe("poi-hassan-ii");
  });
});

describe("URL metadata → draft, without a model", () => {
  const tiktok: UrlMetadata = {
    url: "https://www.tiktok.com/@traveller/video/123",
    platform: "tiktok",
    provider: "tiktok_oembed",
    title: "Half a day in Casablanca — Hassan II Mosque and the best street food #morocco",
    description: "Half a day in Casablanca — Hassan II Mosque and the best street food #morocco",
    author: "traveller",
    publisher: "TikTok",
    thumbnailUrl: "https://p16.tiktokcdn.com/thumb.jpg",
    hashtags: ["morocco"],
    degraded: false,
  };

  it("turns a caption into a day and a candidate", () => {
    const draft = draftFromUrlMetadata(tiktok, { locale: "en" });

    expect(draft.source).toBe("url");
    expect(draft.destination.detectedPoiId).toBe("poi-hassan-ii");
    expect(draft.destination.city).toBe("Casablanca");
    expect(draft.timeAvailable).toBe("half_day");
    expect(draft.interests).toContain("food");
    expect(draft.evidence.urlThumbnailUrl).toBe(tiktok.thumbnailUrl);
    expect(draft.evidence.provider).toBe("tiktok_oembed");
    expect(draft.provenance.detectedPlace).toBe("url_title");
    // No model ran, so it must not claim certainty however well the caption read.
    expect(draft.degraded).toBe(true);
    expect(draft.band).not.toBe("high");
  });

  it("still produces a usable draft when the platform told us nothing", () => {
    const draft = draftFromUrlMetadata(
      { ...tiktok, provider: "platform_only", title: null, description: null,
        thumbnailUrl: null, hashtags: [], degraded: true },
      { locale: "en" },
    );
    expect(draft.source).toBe("url");
    expect(draft.destination.detectedPoiId).toBeNull();
    expect(draft.band).toBe("low");
    expect(draft.uncertainFields).toContain("city");
  });
});

describe("CONFIRMATION — draft becomes the profile the engine builds from", () => {
  const draft = draftFromLocalText(
    "Half a day in Casablanca, culture and food, medium budget, not too much walking",
    { locale: "en", source: "text" },
  );

  it("translates every field into the profile's own vocabulary", () => {
    const profile = draftToProfile(draft);

    expect(profile.destination).toBe("Casablanca");
    expect(profile.timeAvailable).toBe("half_day");
    expect(profile.budgetLevel).toBe("medium");
    expect(profile.walkingPreference).toBe("minimal");
    expect(profile.interests).toEqual(expect.arrayContaining(["culture", "food"]));
    expect(profile.sources).toEqual(["text"]);
    expect(profile.locale).toBe("en");
    expect(profile.createdAt).toBeTruthy();
  });

  it("never carries a draft-only field into the profile", () => {
    const profile = draftToProfile(draft);
    expect(profile).not.toHaveProperty("candidates");
    expect(profile).not.toHaveProperty("band");
    expect(profile).not.toHaveProperty("uncertainFields");
    expect(profile).not.toHaveProperty("provenance");
  });

  it("lets the traveller's edits win over what we understood", () => {
    const profile = draftToProfile(draft, {
      edits: { budgetLevel: "premium", walkingPreference: "plenty" },
    });
    expect(profile.budgetLevel).toBe("premium");
    expect(profile.walkingPreference).toBe("plenty");
    // Untouched fields still come from the draft.
    expect(profile.timeAvailable).toBe("half_day");
  });

  it("does not clear something the profile already held", () => {
    const empty = draftFromLocalText("", { locale: "en", source: "text" });
    const profile = draftToProfile(empty, {
      base: {
        ...draftToProfile(draft),
        detectedPlace: "Quartier Habous",
        detectedPoiId: "poi-habous",
      },
    });
    expect(profile.detectedPoiId).toBe("poi-habous");
    expect(profile.budgetLevel).toBe("medium");
  });

  it("adds its source without duplicating one already there", () => {
    const first = draftToProfile(draft);
    const second = draftToProfile(draft, { base: first });
    expect(second.sources).toEqual(["text"]);
  });
});
