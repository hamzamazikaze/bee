import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

const visit = (path: string) => proxy(new NextRequest(new URL(path, "https://jury.benna.test")));

describe("NEXT_PUBLIC_BENNA_SCOPE=jury", () => {
  beforeEach(() => vi.stubEnv("BENNA_DEV_PASS", ""));
  afterEach(() => vi.unstubAllEnvs());

  it("opens only the QR order path", () => {
    vi.stubEnv("NEXT_PUBLIC_BENNA_SCOPE", "jury");
    for (const path of ["/casanearshore", "/technopark", "/panier", "/commande/BN-CASA2B-1234", "/live", "/api/live"]) {
      expect(visit(path).headers.get("location"), path).toBeNull();
    }
  });

  it("sends every other page to /casanearshore and closes /api", () => {
    vi.stubEnv("NEXT_PUBLIC_BENNA_SCOPE", "jury");
    for (const path of ["/", "/plat/harira-dattes", "/groupe", "/ai", "/compte", "/points", "/admin/commandes", "/constructor", "/bienvenue"]) {
      expect(visit(path).headers.get("location"), path).toBe("https://jury.benna.test/casanearshore");
    }
    expect(visit("/api/benna/m3ak").status).toBe(404);
  });

  it("changes nothing without the variable", () => {
    expect(visit("/groupe").headers.get("location")).toBeNull();
  });
});

describe("BENNA_DEV_PASS gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("guards the app, and lets the pass in once", () => {
    vi.stubEnv("BENNA_DEV_PASS", "secret");
    expect(visit("/groupe").status).toBe(403);
    const opened = visit("/groupe?pass=secret");
    expect(opened.headers.get("location")).toBe("https://jury.benna.test/groupe");
    expect(opened.cookies.get("benna_dev_pass")?.value).toBe("secret");
  });

  it("never touches the jury deployment", () => {
    vi.stubEnv("BENNA_DEV_PASS", "secret");
    vi.stubEnv("NEXT_PUBLIC_BENNA_SCOPE", "jury");
    expect(visit("/casanearshore").status).not.toBe(403);
    expect(visit("/casanearshore").headers.get("location")).toBeNull();
  });
});
