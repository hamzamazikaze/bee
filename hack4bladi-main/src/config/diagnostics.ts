/**
 * Whether the developer laboratories under /test-ai, /test-ai-darija and /test-openai are
 * reachable.
 *
 * They are genuinely useful — /test-openai answers "is this key live and which speech
 * models can it reach", which is faster than guessing from a failing screen, and
 * DEPLOY.md tells you to open it before presenting. They are also six unauthenticated
 * endpoints that spend the project's API credits and enumerate what an account can reach.
 * On a laptop that is a tool; on a public URL it is a bill.
 *
 * So: on wherever you are developing, off wherever you have deployed, and one environment
 * variable to have them back when you actually want them.
 *
 * Deliberately free of the `server-only` import in @/config/env — this is read by
 * `src/proxy.ts` and by server layouts, and it holds no secret.
 */
export const DIAGNOSTICS_ENV_VAR = "ENABLE_DIAGNOSTICS";

export function diagnosticsEnabled(): boolean {
  if (process.env[DIAGNOSTICS_ENV_VAR] === "1") return true;
  return process.env.NODE_ENV !== "production";
}

/** The three laboratory pages and the six routes behind them. */
export function isDiagnosticPath(pathname: string): boolean {
  return (
    pathname.startsWith("/test-ai") ||
    pathname.startsWith("/test-openai") ||
    pathname.startsWith("/api/test-ai") ||
    pathname.startsWith("/api/test-openai")
  );
}
