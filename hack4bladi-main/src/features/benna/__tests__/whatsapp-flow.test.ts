import { describe, expect, it } from "vitest";
import { detectLang, respond, type FlowDeps, type Inbound, type Reply, type Session } from "../whatsapp-flow";
import type { MenuRow } from "../m3ak";

const dish = (id: string, name: string, price: number, slot: MenuRow["slot"] = "lunch"): MenuRow => ({
  id, name, description: "", slot, group_price_mad: price, solo_price_mad: price + 10, ingredients: [], tag: null,
  image: "", kitchen_name: "Dar Zineb", allergens: [],
});

function fakeDeps(overrides: Partial<FlowDeps> = {}) {
  const placed: unknown[] = [];
  const deps: FlowDeps = {
    workplaces: async () => [{ id: "casa", name: "Casanearshore 2B", code: "CASA2B", pickup: "Hall" }],
    menu: async () => [dish("rfissa", "Rfissa au poulet", 38), dish("baghrir", "Baghrir", 13, "breakfast")],
    slots: async () => [{ id: "g1", name: "Déjeuner du jour", delivery: "12:30", cutoffAt: "2026-10-21T10:30:00Z" }],
    placeOrder: async (order) => {
      placed.push(order);
      return { ok: true, reference: "BN-CASA2B-TEST", total: 76 };
    },
    recentOrders: async () => [],
    ...overrides,
  };
  return { deps, placed };
}

async function chat(deps: FlowDeps, turns: Partial<Inbound>[]) {
  let session: Session | null = null;
  const replies: Reply[][] = [];
  for (const [index, turn] of turns.entries()) {
    const out = await respond(session, { from: "212600000000", messageId: `m${index}`, text: "", ...turn }, deps);
    session = out.session;
    replies.push(out.replies);
  }
  return { session: session!, replies };
}

describe("BENNA WhatsApp flow", () => {
  it("orders end to end from the database's menu and price, saved as pending", async () => {
    const { deps, placed } = fakeDeps();
    const { replies, session } = await chat(deps, [
      { text: "Salam BENNA!" },
      { replyId: "menu" },
      { replyId: "wp:casa" },
      { replyId: "dish:rfissa" },
      { text: "2" },
      { replyId: "slot:g1" },
      { replyId: "confirm" },
    ]);
    expect(replies[0][0].body).toContain("Marhba bik f BENNA");
    const menu = replies[2][0];
    expect(menu.kind === "list" && menu.rows.map((row) => row.id)).toEqual(["dish:rfissa", "change-place"]); // no breakfast
    expect(replies[5][0].body).toContain("38 DH × 2 = *76 DH*");
    expect(placed).toEqual([{ phone: "212600000000", name: undefined, workplaceId: "casa", dishId: "rfissa", qty: 2, groupId: "g1", key: "m6" }]);
    expect(replies[6][0].body).toContain("BN-CASA2B-TEST");
    expect(replies[6][0].body).not.toMatch(/confirmée|qblatha/);
    expect(session.step).toBe("idle");
  });

  it("re-asks on nonsense, refuses an out-of-range quantity, and reports a missed cutoff", async () => {
    const { deps } = fakeDeps({ placeOrder: async () => ({ ok: false, reason: "closed" }) });
    const { replies } = await chat(deps, [
      { text: "Bonjour" },
      { text: "blabla" },
      { replyId: "order" },
      { text: "casa2b" },
      { text: "1" },
      { text: "50" },
      { text: "1" },
      { text: "1" },
      { replyId: "confirm" },
    ]);
    expect(replies[1][0].body).toContain("Je n'ai pas compris");
    expect(replies[5][0].body).toContain("1–10");
    expect(replies[8][0].body).toContain("heure limite");
  });

  it("hands off to a human and stays quiet until menu", async () => {
    const { deps } = fakeDeps({ supportPhone: "212611111111" });
    const { replies } = await chat(deps, [{ text: "salam" }, { text: "bghit insan" }, { text: "fin wsla?" }, { text: "menu" }]);
    expect(replies[1][0].body).toContain("https://wa.me/212611111111");
    expect(replies[2]).toEqual([]);
    expect(replies[3][0].body).toContain("Marhba");
  });

  it("detects the four languages", () => {
    expect(detectLang("السلام عليكم")).toBe("ar");
    expect(detectLang("Salam BENNA")).toBe("dr");
    expect(detectLang("Bonjour")).toBe("fr");
    expect(detectLang("Hi there")).toBe("en");
  });
});
