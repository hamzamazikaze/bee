/**
 * Server-side AI surface. Route handlers import from here, never from a vendor module.
 * Every factory can return null; that is the no-key path, and it is a supported path.
 */
import "server-only";

export { createGeminiProvider, fallbackProfile, EMPTY_ANALYSIS } from "./gemini";
export { createIntentProvider, GeminiIntentProvider } from "./intent";
export { createTranscriptionProvider } from "./groq";
export { socialContextProvider, toSocialContext, UrlChainSocialProvider } from "./social";
export { boundedSignal, orFallback } from "./http";
export { resolvePoiCandidates, resolvePoiId, CURATED_PLACE_NAMES } from "./resolve-poi";
export {
  extractUrlMetadata,
  fetchRemoteImage,
  parseUrl,
  platformOf,
  youtubeVideoId,
  type UrlExtractionOptions,
  type UrlMetadata,
  type UrlProvider,
} from "./url";
export type {
  AIProvider,
  ExtractProfileInput,
  ImageAnalysisResult,
  ImageInput,
  IntentExtractionInput,
  IntentExtractionProvider,
  SocialContextProvider,
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
} from "./types";
