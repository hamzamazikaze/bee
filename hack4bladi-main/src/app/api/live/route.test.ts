import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const post = (body: unknown) => POST(new Request("https://benna.test/api/live", { method: "POST", body: JSON.stringify(body) }));
const order = { name: "Abdo", workplaceId: "casanearshore-2b", dishes: [{ id: "harira-dattes", qty: 2 }] };

describe("POST /api/live", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does nothing without a topic", async () => {
    vi.stubEnv("BENNA_LIVE_TOPIC", "");
    expect((await post(order)).status).toBe(204);
  });

  it("relays first name, dishes and a server-computed total — never a phone", async () => {
    vi.stubEnv("BENNA_LIVE_TOPIC", "benna-live-test");
    const relay = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", relay);
    expect((await post({ ...order, phone: "0612345678", total: 1 })).status).toBe(202);
    const sent = JSON.parse(String((relay.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent).toMatchObject({ name: "Abdo", total: 36, dishes: [{ id: "harira-dattes", qty: 2 }] });
    expect(JSON.stringify(sent)).not.toContain("0612345678");
  });

  it("refuses an unknown site, an unknown dish or too many portions", async () => {
    vi.stubEnv("BENNA_LIVE_TOPIC", "benna-live-test");
    vi.stubGlobal("fetch", vi.fn());
    for (const bad of [{ ...order, workplaceId: "nowhere" }, { ...order, dishes: [{ id: "nope", qty: 1 }] }, { ...order, dishes: [{ id: "harira-dattes", qty: 9 }] }]) {
      expect((await post(bad)).status).toBe(400);
    }
  });
});
