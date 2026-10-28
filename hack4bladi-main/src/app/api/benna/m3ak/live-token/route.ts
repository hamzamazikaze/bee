import { serverEnv } from "@/config/env";
import { LIVE_TOOL_DECLARATION, liveSystemPrompt } from "@/features/benna/m3ak-live-setup";

const LIVE_MODEL = process.env.BENNA_LIVE_MODEL ?? "gemini-3.8-live";
const LIVE_VOICE = process.env.BENNA_LIVE_VOICE ?? "Charon";

/**
 * POST /api/benna/m3ak/live-token → { token, model }
 *
 * A one-use Gemini Live token, valid 1 min to open and 30 min to talk. Model, voice,
 * instructions and tool are sealed into it (`bidiGenerateContentSetup`), so the API key
 * never reaches the browser and the browser cannot repurpose the session.
 */
export async function POST() {
  const apiKey = serverEnv.gemini.apiKey;
  if (!apiKey) return Response.json({ error: "La voix en direct n'est pas configurée." }, { status: 503 });

  const now = Date.now();
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      uses: 1,
      expireTime: new Date(now + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 60_000).toISOString(),
      bidiGenerateContentSetup: {
        model: `models/${LIVE_MODEL}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_VOICE } } },
        },
        systemInstruction: { parts: [{ text: liveSystemPrompt() }] },
        tools: [{ functionDeclarations: [LIVE_TOOL_DECLARATION] }],
        // Slower to decide someone started talking: a speaker's own voice leaking into the mic
        // should not count as an interruption.
        realtimeInputConfig: {
          automaticActivityDetection: { startOfSpeechSensitivity: "START_SENSITIVITY_LOW", prefixPaddingMs: 200 },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    }),
  }).catch(() => null);

  const data = (await response?.json().catch(() => null)) as { name?: string } | null;
  if (!response?.ok || !data?.name) {
    console.error("[benna/m3ak/live-token] token refused:", response?.status);
    return Response.json({ error: "La voix en direct est indisponible. Réessayez dans un instant." }, { status: 502 });
  }
  return Response.json({ token: data.name, model: LIVE_MODEL });
}
