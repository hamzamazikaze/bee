import { describe, expect, it } from "vitest";
import { UPLOAD } from "@/config/app";
import { parseJsonLoosely } from "@/lib/ai/http";
import { resolvePoiId } from "@/lib/ai/resolve-poi";
import { readAudioUpload, readImageUpload } from "@/lib/ai/upload";

describe("resolvePoiId — grounding model text in the curated dataset", () => {
  it("resolves the names a model actually produces", () => {
    expect(resolvePoiId("Hassan II Mosque")).toBe("poi-hassan-ii");
    expect(resolvePoiId("Mosquée Hassan II")).toBe("poi-hassan-ii");
    expect(resolvePoiId("مسجد الحسن الثاني")).toBe("poi-hassan-ii");
    expect(resolvePoiId("marche central")).toBe("poi-marche-central");
    expect(resolvePoiId("Quartier des Habous")).toBe("poi-habous");
    expect(resolvePoiId("cite portugaise de mazagan")).toBe("poi-cite-portugaise");
  });

  it("returns null rather than guessing", () => {
    expect(resolvePoiId(null)).toBeNull();
    expect(resolvePoiId("")).toBeNull();
    expect(resolvePoiId("a")).toBeNull();
    expect(resolvePoiId("Jemaa el-Fna, Marrakech")).toBeNull();
    expect(resolvePoiId("a beach somewhere")).toBeNull();
  });
});

describe("parseJsonLoosely", () => {
  it("survives the ways models mangle JSON", () => {
    expect(parseJsonLoosely('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonLoosely('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoosely('Sure! Here you go: {"a":1} — hope that helps')).toEqual({ a: 1 });
    expect(parseJsonLoosely("not json at all")).toBeNull();
    expect(parseJsonLoosely("")).toBeNull();
  });
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function fileRequest(file: File, field = "file"): Request {
  const form = new FormData();
  form.append(field, file);
  return new Request("http://localhost/api/analyze", { method: "POST", body: form });
}

describe("upload trust boundary", () => {
  it("accepts a well-formed multipart image", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" });
    const result = await readImageUpload(fileRequest(file));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.mimeType).toBe("image/jpeg");
  });

  it("accepts a JSON body and strips a data: prefix", async () => {
    const result = await readImageUpload(
      jsonRequest({ image: { base64: "data:image/png;base64,AAAA", mimeType: "image/png" } }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.base64).toBe("AAAA");
  });

  it("rejects an unsupported type", async () => {
    const file = new File([new Uint8Array([1])], "a.pdf", { type: "application/pdf" });
    const result = await readImageUpload(fileRequest(file));
    expect(result).toEqual({ ok: false, reason: "unsupported_type" });
  });

  it("rejects a file over UPLOAD.maxBytes", async () => {
    const big = new File([new Uint8Array(UPLOAD.maxBytes + 1)], "a.jpg", { type: "image/jpeg" });
    const result = await readImageUpload(fileRequest(big));
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("rejects a missing part and an unreadable body", async () => {
    expect(await readImageUpload(jsonRequest({}))).toEqual({ ok: false, reason: "missing_file" });
    const broken = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(await readImageUpload(broken)).toEqual({ ok: false, reason: "unreadable_body" });
  });

  it("accepts audio with codec parameters on the MIME type", async () => {
    const file = new File([new Uint8Array([1, 2])], "a.webm", { type: "audio/webm;codecs=opus" });
    const result = await readAudioUpload(fileRequest(file));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.mimeType).toBe("audio/webm");
  });

  it("rejects a non-audio upload on the transcription route", async () => {
    const file = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    expect(await readAudioUpload(fileRequest(file))).toEqual({
      ok: false,
      reason: "unsupported_type",
    });
  });
});
