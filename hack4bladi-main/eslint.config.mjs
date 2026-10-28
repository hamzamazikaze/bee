import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored MapLibre worker copies (scripts/sync-map-worker.mjs). Not our source.
    "public/**",
    // Throwaway demo/screenshot drivers, not app source.
    "scripts/jury/**",
    /* Git worktrees live inside the repo, so a second full checkout — its .next output
       included — is sitting under here. `.next/**` above only covers our own. Linting a
       sibling checkout's build chunks reported hundreds of errors in generated code and
       failed `pnpm verify` on a tree where nothing was wrong. */
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
