import { describe, expect, it } from "vitest";
import { pickOption, toText } from "../twilio-text";

describe("Twilio text rendering", () => {
  it("numbers a list and maps a bare number back to its row id", () => {
    const { body, options } = toText({
      kind: "list", body: "Khtar plat:", button: "Menu",
      rows: [{ id: "dish:rfissa", title: "Rfissa", description: "38 MAD" }, { id: "change-place", title: "Bdel l'blasa" }],
    });
    expect(body).toContain("1. Rfissa · 38 MAD\n2. Bdel l'blasa");
    expect(pickOption(" 2 ", options)).toBe("change-place");
    expect(pickOption("3", options)).toBeUndefined();
    expect(pickOption("2 tajines", options)).toBeUndefined();
  });

  it("does not repeat choices the body already numbers", () => {
    const { body } = toText({ kind: "buttons", body: "Salam!\n\n1. Menu\n2. Commandi", buttons: [{ id: "menu", title: "Menu" }, { id: "order", title: "Commandi" }] });
    expect(body.match(/1\. Menu/g)).toHaveLength(1);
  });
});
