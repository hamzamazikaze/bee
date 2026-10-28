import { afterEach, describe, expect, it, vi } from "vitest";
import { todaysDishes, workplaceById } from "@/features/benna/data";
import { loadOpenGroup, loadTodaysMenu } from "./menu-source";

describe("menu without a database", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("serves today's rotation from data.ts", async () => {
    vi.stubEnv("BENNA_SUPABASE_URL", "");
    vi.stubEnv("BENNA_SUPABASE_ANON_KEY", "");
    const rows = await loadTodaysMenu("casanearshore-2b");
    expect(rows.map((row) => row.id)).toEqual(todaysDishes(workplaceById("casanearshore-2b")).map((dish) => dish.id));
    expect(rows.length).toBeGreaterThan(0);
    expect(await loadTodaysMenu("nowhere")).toEqual([]);
    expect((await loadOpenGroup("casanearshore-2b"))?.host).toBe("Salma");
  });
});
