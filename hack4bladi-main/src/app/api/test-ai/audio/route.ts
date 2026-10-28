/**
 * POST /api/test-ai/audio — TEST 1. multipart/form-data with `file` (audio/webm from
 * MediaRecorder). Two server-side steps, no browser heuristics anywhere:
 *   1. gemini-3.5-transcribe transcribes, detecting the spoken language on its own.
 *   2. gemini-3.5-flash-lite names that language, because the transcription response
 *      format carries the text only.
 * Nothing is written to disk; the audio lives in memory for the length of the request.
 */
import { MODELS, failure, parseJson, text, transcribe } from "../_gemini";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ success: false, error: { message: "no `file` part in the form" } });
    }
    if (file.size === 0) {
      return Response.json({ success: false, error: { message: "empty audio file" } });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({
        success: false,
        error: { message: `audio too large: ${file.size} bytes (max ${MAX_BYTES})` },
      });
    }

    // MediaRecorder appends codec parameters, e.g. `audio/webm;codecs=opus`.
    const mimeType = (file.type || "audio/webm").split(";")[0].trim();
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    const transcript = await transcribe(base64, mimeType);

    // Step 2 — the language, named by the model rather than guessed from the characters.
    let detectedLanguage: string | null = null;
    try {
      const raw = await text(
        `Identify the language of the text below.
Return ONLY JSON: {"language": string, "bcp47": string}
"language" is the English name of the language, e.g. "French", "Arabic", "English", "Moroccan Arabic (Darija)".
Do not translate the text. Do not add commentary.

Text:
${transcript}`,
      );
      const parsed = parseJson(raw) as { language?: unknown; bcp47?: unknown };
      if (typeof parsed.language === "string" && parsed.language.trim()) {
        detectedLanguage =
          typeof parsed.bcp47 === "string" && parsed.bcp47.trim()
            ? `${parsed.language} (${parsed.bcp47})`
            : parsed.language;
      }
    } catch {
      // The transcript is the point of this test; a failed language step must not lose it.
      detectedLanguage = null;
    }

    return Response.json({
      success: true,
      transcript,
      detectedLanguage,
      provider: "gemini",
      model: MODELS.transcribe,
      languageModel: MODELS.text,
      bytes: file.size,
      receivedMimeType: file.type || null,
    });
  } catch (error) {
    return failure(error);
  }
}
