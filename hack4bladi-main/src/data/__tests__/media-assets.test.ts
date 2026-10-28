/**
 * Every local image path in the data layer must resolve to a file that actually ships.
 * A typo in a filename is invisible until a card is blank in front of a jury; this
 * catches it at build time instead.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POIS } from "@/data/pois";
import { GOLDEN_POIS } from "@/data/fixtures";
import { INTEREST_OPTIONS } from "@/features/onboarding/options";
import { MOODS, POPULAR } from "@/features/home/presets";

const PUBLIC = join(process.cwd(), "public");
const onDisk = (path: string) => existsSync(join(PUBLIC, path));

describe("local media assets", () => {
  it("ships a hero for each of the four golden POIs", () => {
    const missing = GOLDEN_POIS.filter((poi) => !onDisk(poi.media.heroImage));
    expect(missing.map((poi) => poi.media.heroImage)).toEqual([]);
  });

  it("ships every interest tile image", () => {
    const missing = INTEREST_OPTIONS.filter((option) => !onDisk(option.image));
    expect(missing.map((option) => option.image)).toEqual([]);
  });

  it("ships every Home card image", () => {
    const missing = [...MOODS, ...POPULAR].filter((preset) => !onDisk(preset.image));
    expect(missing.map((preset) => preset.image)).toEqual([]);
  });

  it("gives every POI in the dataset a fallback that exists", () => {
    const missing = POIS.filter((poi) => !onDisk(poi.media.fallbackImage));
    expect(missing.map((poi) => `${poi.slug} -> ${poi.media.fallbackImage}`)).toEqual([]);
  });

  it("keeps the packaged last-resort placeholder", () => {
    expect(onDisk("/images/placeholder.svg")).toBe(true);
  });
});
