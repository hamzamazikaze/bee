/**
 * Routing contracts. Lead-owned; implementations belong to the Trip/Map worker.
 * React components must never see a provider's raw response shape.
 */
import type { Coordinates } from "@/types/common";
import type { RouteSegment, TravelMode } from "@/types/trip";

export interface SegmentRequest {
  from: Coordinates;
  to: Coordinates;
  mode: TravelMode;
}

/** A RouteSegment without trip-local identifiers — the provider does not know about stops. */
export type SegmentResult = Omit<RouteSegment, "id" | "fromStopId" | "toStopId">;

export interface RoutingProvider {
  readonly name: string;
  calculateSegment(request: SegmentRequest, signal?: AbortSignal): Promise<SegmentResult>;
  /** Batched; must return one result per request, in order, never a short array. */
  calculateRoute(requests: SegmentRequest[], signal?: AbortSignal): Promise<SegmentResult[]>;
}
