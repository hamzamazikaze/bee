/**
 * The guard decides which transcript a traveller's whole day gets built from, so it is
 * tested from both sides: the real hallucinations it must catch, and the real Darija it
 * must never throw away.
 */
import { describe, expect, it } from "vitest";
import {
  isMostlyArabic,
  looksHallucinated,
  needsDarijaEngine,
} from "@/lib/ai/transcript-quality";

describe("looksHallucinated", () => {
  it("catches the subtitle artifact whisper-1 returned for real Darija audio", () => {
    expect(
      looksHallucinated(
        "شكرا على المشاهدة. سأذهب اليوم إلى المنزل. أتمنى أن أجد شيء جيد هنا. أتمنى أن أجد شيء جيد هنا. أتمنى أن أجد شيء جيد هنا.",
      ),
    ).toBe(true);
  });

  it("catches the artifact and the loop independently", () => {
    expect(looksHallucinated("Thanks for watching!")).toBe(true);
    expect(
      looksHallucinated(
        "I would like to find something good. I would like to find something good. I would like to find something good.",
      ),
    ).toBe(true);
  });

  it("keeps real Darija, including the recording MoulSot got right", () => {
    for (const text of [
      "وبغينا واش غانديرو خويا غانتيستيو الواحد هو اللي صبر شوية حبيبنا والدنيا هي هادي",
      "سلام، بغيت نمشي ل كازابلانكا باش ناكل شي حاجة مزيانة",
      "أنا فكازا نهار كامل، كيعجبني التراث والماكلة، وما بغيتش نمشي بزاف",
    ]) {
      expect(looksHallucinated(text), text).toBe(false);
    }
  });

  it("keeps ordinary emphasis — a person repeating themselves is not a decoder loop", () => {
    expect(looksHallucinated("Yes. Yes. Yes.")).toBe(false);
    expect(looksHallucinated("لا. لا. لا.")).toBe(false);
    expect(looksHallucinated("I want food. I want culture. I want the sea.")).toBe(false);
  });

  it("says nothing about an empty transcript — that path is already handled", () => {
    expect(looksHallucinated("")).toBe(false);
    expect(looksHallucinated("   ")).toBe(false);
  });
});

describe("isMostlyArabic", () => {
  it("recognises Darija even when half the sentence is French", () => {
    expect(
      isMostlyArabic(
        "السلام عليكم كيدير les vlogs tout le temps إن شاء الله را بغيت نتحرك لكازا ونشوف شنو هما les plans لي نقدر ندير تما",
      ),
    ).toBe(true);
    expect(isMostlyArabic("سلام، بغيت نمشي لكازابلانكا باش ناكل شي حاجة مزيانة")).toBe(true);
  });

  it("leaves French and English alone — they must keep the fast engine", () => {
    expect(isMostlyArabic("Je veux passer une journée à Casablanca, plutôt tranquille")).toBe(false);
    expect(isMostlyArabic("I want a full day in Casablanca with good food")).toBe(false);
    // Transliterated Darija is still Latin script: nothing to re-route.
    expect(isMostlyArabic("Salam, bghit nemshi l Casablanca bach nakol shi haja mezyana")).toBe(false);
  });

  it("says nothing about a transcript too short to judge", () => {
    expect(isMostlyArabic("")).toBe(false);
    expect(isMostlyArabic("ok")).toBe(false);
  });
});

describe("needsDarijaEngine", () => {
  /* Takes no locale, on purpose: what someone speaks has nothing to do with the menu they
     picked, and every version of this that consulted the interface language was wrong. */
  it("catches Darija transliterated into Latin, however it was spelled", () => {
    for (const text of [
      "Salaam, biyit nimshi l Casablanca bak nakal shi haja mezayana.",
      "Sulaam, biët nimjiël Casablanca baak nakul shehajimëzayëna.",
      "Salam, bghit nemshi l Casablanca bach nakol shi haja mezyana",
    ]) {
      expect(needsDarijaEngine(text), text).toBe(true);
    }
  });

  it("catches Arabic script", () => {
    expect(needsDarijaEngine("سلام، بغيت نمشي لكازابلانكا باش ناكل شي حاجة مزيانة")).toBe(true);
  });

  it("leaves every European language we speak on the fast path", () => {
    for (const text of [
      "Je voudrais passer une journée tranquille à Casablanca avec de la bonne cuisine",
      "I want a full day in Casablanca with good food and not too much walking",
      "Quiero pasar un día tranquilo en Casablanca con buena comida",
      "Ich möchte einen ruhigen Tag in Casablanca mit gutem Essen",
      "Vorrei passare una giornata tranquilla a Casablanca con buon cibo",
      "Eu queria passar um dia tranquilo em Casablanca com boa comida",
    ]) {
      expect(needsDarijaEngine(text), text).toBe(false);
    }
  });

  it("carries on when the answer is too short to judge", () => {
    expect(needsDarijaEngine("Casablanca, aujourd'hui")).toBe(false);
    expect(needsDarijaEngine("ok")).toBe(false);
  });
});

describe("needsDarijaEngine · the transliterations that fooled the pooled version", () => {
  /* Every one of these was returned by OpenAI for the same Darija clip, and every one was
     waved through as European when all six vocabularies shared a single bag. */
  it("is not fooled by a stray el / me / she", () => {
    for (const text of [
      "Salaam, biët nimsi el Casablanca bak nakel she haj me zayena",
      "Salaam, bi yéenem ci El Casablanca bakkan akal ci hajum azaa",
      "Salaam, biyetnimshi el Casablanca bak nakhl shi haj mezayana",
    ]) {
      expect(needsDarijaEngine(text), text).toBe(true);
    }
  });
});
