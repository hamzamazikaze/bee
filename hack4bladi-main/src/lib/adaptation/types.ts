/**
 * Adaptation contract. Lead-owned; implementations belong to the Trip/Map worker.
 * All four adapters implement it for real.
 */
import type { AdaptationRequest, AdaptationResult, AdaptationType } from "@/types/adaptation";

export interface Adapter {
  readonly type: AdaptationType;
  /** Never throws. If it cannot improve the day it returns applied:false with a reason. */
  apply(request: AdaptationRequest, signal?: AbortSignal): Promise<AdaptationResult>;
}
