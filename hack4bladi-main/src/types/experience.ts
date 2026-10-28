import type { LocalizedText } from "./common";

export interface PassportStamp {
  poiId: string;
  poiName: string;
  city: string;
  /** ISO 8601 */
  visitedAt: string;
  tripId?: string;
  imageUrl?: string;
}

export interface Passport {
  stamps: PassportStamp[];
  updatedAt: string;
}

export type ProcessingStepId = "analyzing" | "matching" | "optimizing";
export type ProcessingStepStatus = "pending" | "active" | "done" | "failed";

export interface ProcessingStep {
  id: ProcessingStepId;
  status: ProcessingStepStatus;
}

export interface ProcessingState {
  steps: ProcessingStep[];
  startedAt: number;
  /** Set when we fell back; the UI still completes, it never dead-ends. */
  usedFallback?: boolean;
  error?: string;
}

export type WeatherCondition = "sunny" | "cloudy" | "rain" | "wind" | "unknown";

export interface WeatherSummary {
  city: string;
  temperatureC: number;
  condition: WeatherCondition;
  label: LocalizedText;
}
