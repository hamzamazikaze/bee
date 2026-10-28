import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  /* `server-only` throws by design when imported outside an RSC. Stubbing it is what
     lets the suite test the real route handlers and providers instead of copies. */
  "server-only": fileURLToPath(new URL("./vitest.server-only.ts", import.meta.url)),
};

/**
 * Two projects, one command.
 *
 * `logic` is the existing business suite and stays exactly as it was — node
 * environment, .test.ts only. `render` is the smoke floor added for the redesign:
 * jsdom, .test.tsx only. Keeping them apart means a UI dependency can never leak
 * into the engine tests, and `pnpm test` still runs everything.
 */
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "logic",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "render",
          environment: "jsdom",
          /* localStorage needs a real origin; jsdom's default about:blank is
             opaque, and src/lib/storage is on every screen's path. */
          environmentOptions: { jsdom: { url: "http://localhost:3000/" } },
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
