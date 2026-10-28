/**
 * The switch that keeps six unauthenticated, credit-spending endpoints off a public URL.
 *
 * The important assertion is the default, not the override: a laboratory that is only
 * closed when someone remembers to close it is open.
 */
import { afterEach, describe, expect, it } from "vitest";
import { DIAGNOSTICS_ENV_VAR, diagnosticsEnabled, isDiagnosticPath } from "@/config/diagnostics";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  delete process.env[DIAGNOSTICS_ENV_VAR];
  setNodeEnv(originalNodeEnv);
});

/* `process.env` refuses a property descriptor, so NODE_ENV is written the ordinary way
   and the type is widened for the one assignment vitest's own typing forbids. */
function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("diagnosticsEnabled", () => {
  it("is off in production unless it is asked for", () => {
    setNodeEnv("production");
    expect(diagnosticsEnabled()).toBe(false);
  });

  it("comes back in production only for an explicit opt-in", () => {
    setNodeEnv("production");
    process.env[DIAGNOSTICS_ENV_VAR] = "1";
    expect(diagnosticsEnabled()).toBe(true);
  });

  it("treats anything other than the exact opt-in as off", () => {
    setNodeEnv("production");
    for (const value of ["", "0", "true", "yes", "please"]) {
      process.env[DIAGNOSTICS_ENV_VAR] = value;
      expect(diagnosticsEnabled(), value).toBe(false);
    }
  });

  it("stays on where the work happens", () => {
    setNodeEnv("development");
    expect(diagnosticsEnabled()).toBe(true);
  });
});

describe("isDiagnosticPath", () => {
  it("covers all three laboratories and the routes behind them", () => {
    for (const path of [
      "/test-ai",
      "/test-ai-darija",
      "/test-openai",
      "/api/test-ai/status",
      "/api/test-ai/translate",
      "/api/test-openai/status",
      "/api/test-openai/transcribe",
    ]) {
      expect(isDiagnosticPath(path), path).toBe(true);
    }
  });

  it("leaves the product alone", () => {
    for (const path of ["/", "/trip", "/chat", "/api/chat", "/api/curate", "/api/route"]) {
      expect(isDiagnosticPath(path), path).toBe(false);
    }
  });
});
