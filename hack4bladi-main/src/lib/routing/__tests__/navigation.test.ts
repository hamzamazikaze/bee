import { describe, expect, it } from "vitest";
import { navigationUrl, prefersAppleMaps } from "@/lib/routing/navigation";

const HASSAN_II = { lat: 33.60847, lng: -7.6326 };

describe("navigation links", () => {
  it("sends Apple devices to Apple Maps with the right mode flag", () => {
    const url = navigationUrl(HASSAN_II, "walking", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)");
    expect(url.startsWith("https://maps.apple.com/?")).toBe(true);
    expect(url).toContain("daddr=33.60847%2C-7.6326");
    expect(url).toContain("dirflg=w");
  });

  it("sends everything else to Google Maps", () => {
    const url = navigationUrl(HASSAN_II, "car", "Mozilla/5.0 (Linux; Android 14)");
    expect(url.startsWith("https://www.google.com/maps/dir/?")).toBe(true);
    expect(url).toContain("travelmode=driving");
  });

  it("defaults to Google Maps when the user agent is unknown (SSR, no window)", () => {
    expect(prefersAppleMaps("")).toBe(false);
    expect(navigationUrl(HASSAN_II, "walking")).toContain("google.com");
  });
});
