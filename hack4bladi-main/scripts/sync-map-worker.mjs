/**
 * Copies MapLibre's tile-parsing worker into public/.
 *
 * Turbopack does not emit maplibre's `new Worker(new URL(...))` correctly: the worker URL
 * resolved to the HTML page, the worker failed with a MIME-type error, no tile was ever
 * parsed and the map rendered blank with zero markers. Serving the worker as a static
 * asset and pointing setWorkerUrl() at it is the supported escape hatch.
 *
 * Run from predev/prebuild so the copy can never drift from the installed version.
 */
import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json"));
/*
 * Both files, and they must stay siblings: maplibre-gl-worker.mjs opens with
 * `import {...} from "./maplibre-gl-shared.mjs"`. Ship the worker alone and that
 * relative import 404s to the HTML page, which is the "non-JavaScript MIME type"
 * error that left the map blank.
 */
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

for (const file of FILES) {
  copyFileSync(join(dist, "dist", file), join(process.cwd(), "public", file));
  console.log(`[map-worker] public/${file}`);
}
