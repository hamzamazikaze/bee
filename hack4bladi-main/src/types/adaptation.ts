import type { LocalizedText, MadRange } from "./common";
import type { Trip } from "./trip";

/** All four are implemented; each either changes the day or explains why it cannot. */
export type AdaptationType = "less_walking" | "less_time" | "spend_less" | "rainy_day";

export interface AdaptationRequest {
  type: AdaptationType;
  trip: Trip;
}

export interface AdaptationDelta {
  walkingMetersBefore: number;
  walkingMetersAfter: number;
  carMetersBefore: number;
  carMetersAfter: number;
  movementMinutesBefore: number;
  movementMinutesAfter: number;
  costBefore?: MadRange;
  costAfter?: MadRange;
  /** 0..100, rounded. */
  walkingReductionPercent: number;
  minutesSaved: number;
}

export interface AdaptationResult {
  type: AdaptationType;
  /** false → nothing improved; keep the original trip and show `reason`. */
  applied: boolean;
  trip: Trip;
  delta: AdaptationDelta;
  /** e.g. "77% less walking · ~40 min saved" */
  headline: LocalizedText;
  /** Segments whose mode or geometry changed — the map animates these. */
  changedSegmentIds: string[];
  reason?: LocalizedText;
}
