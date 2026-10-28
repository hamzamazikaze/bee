import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { boundedSignal, orFallback } from "@/lib/ai/http";
import { transcribe } from "@/lib/ai/openai-client";
import { readAudioUpload } from "@/lib/ai/upload";

/** One short meal request: ~30 s of Opus is well under this. Longer clips are refused. */
const MAX_BYTES = 1_500_000;

const EXTENSION: Record<string, string> = { "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/wav": "wav" };

/**
 * POST /api/benna/transcribe — OpenAI gpt-4o-transcribe only, for M3AK.
 * The transcript goes back into the text box so the person can correct it before asking.
 */
export async function POST(request: Request) {
  const key = serverEnv.openai.apiKey;
  if (!key) return Response.json({ text: "", error: "La saisie vocale n'est pas disponible. Écrivez votre demande." });

  const upload = await readAudioUpload(request);
  if (!upload.ok) return Response.json({ text: "", error: "Enregistrement illisible. Réessayez ou écrivez." });
  if (upload.value.data.byteLength > MAX_BYTES) {
    return Response.json({ text: "", error: "Enregistrement trop long. Dites votre demande en une phrase." });
  }

  const file = new Blob([upload.value.data], { type: upload.value.mimeType });
  const result = await orFallback(
    () =>
      transcribe(
        key,
        serverEnv.openai.transcriptionModel,
        file,
        `request.${EXTENSION[upload.value.mimeType] ?? "webm"}`,
        undefined,
        boundedSignal(TIMEOUTS.transcriptionMs, request.signal),
        "Commande de repas au bureau, en darija marocaine, français ou arabe : tajine, couscous, harira, djaj, lkhodra, bla, budget en DH.",
      ),
    null,
  );
  const text = result?.text?.trim() ?? "";
  return Response.json(text ? { text } : { text: "", error: "Nous n'avons pas entendu. Réessayez ou écrivez." });
}
