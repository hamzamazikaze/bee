/**
 * The upload trust boundary. Everything arriving from a browser is checked for size and
 * MIME against UPLOAD in @/config/app before a byte reaches a provider.
 *
 * This is validation, not a fallback path: an 80 MB file or a video/mp4 pretending to be
 * a photo is rejected here rather than forwarded and paid for.
 */
import { UPLOAD } from "@/config/app";
import type { ImageInput } from "@/lib/ai/types";

export type UploadFailure =
  | "missing_file"
  | "unsupported_type"
  | "too_large"
  | "unreadable_body";

export type UploadResult<T> = { ok: true; value: T } | { ok: false; reason: UploadFailure };

function bytesFromBase64(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function checkFile(file: File, accepted: readonly string[]): UploadFailure | null {
  if (!accepted.includes(file.type)) return "unsupported_type";
  if (file.size > UPLOAD.maxBytes) return "too_large";
  if (file.size === 0) return "missing_file";
  return null;
}

/**
 * Accepts either `multipart/form-data` with a `file` (or `image`) part, or a JSON body
 * `{ image: { base64, mimeType } }`. Both shapes exist because the composer uploads a
 * File while the processing screen may already hold base64 in the store.
 */
export async function readImageUpload(request: Request): Promise<UploadResult<ImageInput>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return { ok: false, reason: "unreadable_body" };
    }
    const file = form.get("file") ?? form.get("image");
    if (!(file instanceof File)) return { ok: false, reason: "missing_file" };
    const failure = checkFile(file, UPLOAD.acceptedMimeTypes);
    if (failure) return { ok: false, reason: failure };
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    return { ok: true, value: { base64, mimeType: file.type } };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, reason: "unreadable_body" };
  }
  const image = (body as { image?: { base64?: unknown; mimeType?: unknown } })?.image;
  if (!image || typeof image.base64 !== "string" || typeof image.mimeType !== "string") {
    return { ok: false, reason: "missing_file" };
  }
  // Tolerate a data: URL prefix; the provider contract wants raw base64.
  const base64 = image.base64.replace(/^data:[^,]*,/, "");
  if (!UPLOAD.acceptedMimeTypes.includes(image.mimeType as never)) {
    return { ok: false, reason: "unsupported_type" };
  }
  if (bytesFromBase64(base64) > UPLOAD.maxBytes) return { ok: false, reason: "too_large" };
  if (base64.length === 0) return { ok: false, reason: "missing_file" };

  return { ok: true, value: { base64, mimeType: image.mimeType } };
}

export async function readAudioUpload(
  request: Request,
): Promise<UploadResult<{ data: ArrayBuffer; mimeType: string; locale?: string }>> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, reason: "unreadable_body" };
  }
  const file = form.get("file") ?? form.get("audio");
  if (!(file instanceof File)) return { ok: false, reason: "missing_file" };
  // Browsers append codec parameters, e.g. `audio/webm;codecs=opus`.
  const mimeType = file.type.split(";")[0].trim();
  if (!UPLOAD.acceptedAudioMimeTypes.includes(mimeType as never)) {
    return { ok: false, reason: "unsupported_type" };
  }
  if (file.size > UPLOAD.maxBytes) return { ok: false, reason: "too_large" };
  if (file.size === 0) return { ok: false, reason: "missing_file" };

  /* The locale rides along so the route can pick which engine to try first — Darija
     goes to MoulSot, English and French to Whisper. */
  const locale = form.get("locale");

  return {
    ok: true,
    value: {
      data: await file.arrayBuffer(),
      mimeType,
      locale: typeof locale === "string" ? locale : undefined,
    },
  };
}
