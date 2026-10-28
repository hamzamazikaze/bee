/**
 * The multimodal understanding layer, client-safe.
 *
 * Image, voice, text and URL all produce a TripIntentDraft; the traveller confirms it;
 * `draftToProfile` hands the engine a TripProfile. Nothing here fetches anything —
 * the providers live in @/lib/ai and are server-only.
 */
export {
  CONFIDENCE_BANDS,
  bandOf,
  clampConfidence,
  createEmptyDraft,
  parseTripIntentDraft,
  shouldPreselect,
  tripIntentDraftSchema,
  DRAFT_FIELDS,
} from "./schema";
export {
  buildDraft,
  mergeKnown,
  pickInterests,
  scoreDraft,
  uncertainFieldsOf,
  walkingPreferenceOf,
  type BuildDraftInput,
  type RawIntent,
} from "./normalize";
export {
  draftFromImageAnalysis,
  draftFromLocalText,
  draftFromUrlMetadata,
} from "./sources";
export { localExtract } from "./local-extract";
export { SOURCE_OF, addSource, draftToProfile, type ConfirmOptions } from "./confirm";
