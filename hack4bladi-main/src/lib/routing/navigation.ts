/**
 * External navigation hand-off. Siyaha has no turn-by-turn: we open the map app the
 * traveller already trusts, with the destination and travel mode pre-filled.
 */
import type { Coordinates } from "@/types/common";
import type { TravelMode } from "@/types/trip";

/** Apple devices get Apple Maps; everything else (including Android) gets Google Maps. */
export function prefersAppleMaps(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent);
}

export function navigationUrl(
  destination: Coordinates,
  mode: TravelMode,
  userAgent = "",
  label?: string,
): string {
  const point = `${destination.lat},${destination.lng}`;

  if (prefersAppleMaps(userAgent)) {
    const params = new URLSearchParams({ daddr: point, dirflg: mode === "car" ? "d" : "w" });
    if (label) params.set("q", label);
    return `https://maps.apple.com/?${params.toString()}`;
  }

  const params = new URLSearchParams({
    api: "1",
    destination: point,
    travelmode: mode === "car" ? "driving" : "walking",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
