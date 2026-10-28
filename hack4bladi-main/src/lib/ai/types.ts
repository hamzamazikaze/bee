/**
 * AI provider contracts. Lead-owned; implementations belong to the AI/Data worker.
 * Nothing here is allowed to invent coordinates — AI understands, the local engine decides.
 */
import type { ConfidenceMap, Locale } from "@/types/common";
import type { FieldProvenance, IntentEvidence, IntentSource, TripIntentDraft } from "@/types/intent";
import type { Interest, InputSource, SocialContext, TripProfile } from "@/types/profile";

export interface ImageInput {
  /** Raw base64, no data: prefix. */
  base64: string;
  mimeType: string;
}

export interface ImageAnalysisResult {
  /** The town. Named `destination` because that is what the TripProfile calls it. */
  destination: string | null;
  country: string | null;
  detectedPlace: string | null;
  /** Set only when the detected place resolves to a curated POI id. Never model-authored. */
  detectedPoiId: string | null;
  /** Visual clues: short tags for what is actually in the frame. */
  labels: string[];
  ocrText?: string | null;
  /** Categories the image suggests, from the app's six. Hints, not decisions. */
  interestHints: Interest[];
  /** What a traveller would do there, in plain words. Evidence for the extractor. */
  activityHints: string[];
  confidence: ConfidenceMap<"destination" | "detectedPlace">;
}

export interface ExtractProfileInput {
  image?: ImageInput;
  socialUrl?: string;
  transcript?: string;
  text?: string;
  /** Anything the user already picked in onboarding — never overwritten by the model. */
  known?: Partial<TripProfile>;
  locale: Locale;
  sources: InputSource[];
}

export interface AIProvider {
  readonly name: string;
  /**
   * Must resolve or reject within TIMEOUTS.imageAnalysisMs; callers pass an AbortSignal.
   *
   * `locale` is presentation only — the free-text labels come back in the traveller's
   * language, while place names, enums and confidence stay canonical. See
   * @/lib/ai/output-language.
   */
  analyzeImage(
    input: ImageInput,
    signal?: AbortSignal,
    locale?: Locale,
  ): Promise<ImageAnalysisResult>;
  /** Returns a fully-shaped TripProfile — validated with tripProfileSchema before use. */
  extractTripProfile(input: ExtractProfileInput, signal?: AbortSignal): Promise<TripProfile>;
}

export interface TranscriptionInput {
  /** Audio bytes as uploaded by the browser. */
  data: ArrayBuffer | Blob;
  mimeType: string;
  locale?: Locale;
}

export interface TranscriptionResult {
  text: string;
  detectedLocale?: Locale;
}

export interface TranscriptionProvider {
  readonly name: string;
  transcribeAudio(input: TranscriptionInput, signal?: AbortSignal): Promise<TranscriptionResult>;
}

/**
 * The one structured-extraction contract. Text, a transcript, URL metadata and an image
 * all arrive here; a validated TripIntentDraft always comes back.
 *
 * Nothing this returns has skipped Zod: an implementation that hands back a raw model
 * object is a bug, not a shortcut.
 */
export interface IntentExtractionInput {
  source: IntentSource;
  locale: Locale;
  /** Typed by the traveller. */
  text?: string;
  /** Spoken by the traveller, already transcribed. */
  transcript?: string;
  /** Everything else we know: OCR, a video title, a caption, visual clues. */
  evidence?: Partial<IntentEvidence>;
  /** A screenshot, or a link's thumbnail. Makes the extraction multimodal. */
  image?: ImageInput;
  /** Already chosen by hand. Never overwritten by the model. */
  known?: Partial<TripProfile>;
  /** How sure the modality was about the place before extraction ran. */
  placeConfidence?: number;
  provenance?: FieldProvenance;
  placeProvenance?: FieldProvenance;
}

export interface IntentExtractionProvider {
  readonly name: string;
  /** Must resolve or reject within TIMEOUTS.profileExtractionMs; callers pass a signal. */
  extractIntent(input: IntentExtractionInput, signal?: AbortSignal): Promise<TripIntentDraft>;
}

/** Optional enrichment. Failure here is always silent — never blocks trip generation. */
export interface SocialContextProvider {
  readonly name: string;
  extractSocialContext(url: string, signal?: AbortSignal): Promise<SocialContext | null>;
}
