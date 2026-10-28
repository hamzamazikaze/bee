import "server-only";

/**
 * Server-only secrets. Importing this from a client component is a build error.
 *
 * Nothing throws at import time: a missing key must degrade to the fallback path,
 * never break the build or the demo.
 *
 * Every value is a getter, read at the moment it is used rather than snapshotted when the
 * module is first imported. A container that injects its secrets after the bundle is
 * loaded — and a test that needs to run the no-key path — both see the truth this way.
 */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const serverEnv = {
  gemini: {
    get apiKey() {
      return optional("GEMINI_API_KEY");
    },
    /**
     * `gemini-2.5-flash` was the default here and is now a hard 404 for new keys —
     * "no longer available to new users" — which silently degraded every image and
     * intent call in the app. This model answers in under a second warm; the larger
     * `gemini-3.6-flash` also works but spends ~600 thinking tokens and ~14 s on a
     * structured extraction, which is well past TIMEOUTS.profileExtractionMs.
     * Override with GEMINI_MODEL when a key has access to something better.
     */
    get model() {
      return process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
    },
  },
  /**
   * OpenAI. Three jobs, all optional, none of them load-bearing:
   *   - the day curator (@/lib/ai/curator) — reads the traveller and the whole curated
   *     catalogue, places *and* experiences, and proposes which stops belong together;
   *   - Whisper, as a voice engine alongside Groq and MoulSot;
   *   - a second brain for intent/image when Gemini is slow or refuses.
   * Without the key every one of those paths is simply the path it was before.
   */
  /**
   * BENNA's menu and group orders. Local `supabase start` now, self-hosted later. Read on
   * the server only, through PostgREST with the anon key (the tables are read-only RLS).
   */
  supabase: {
    get url() {
      return optional("BENNA_SUPABASE_URL");
    },
    get anonKey() {
      return optional("BENNA_SUPABASE_ANON_KEY");
    },
    /** Writes orders and WhatsApp state. Bypasses RLS: never send it to a browser. */
    get serviceRoleKey() {
      return optional("BENNA_SUPABASE_SERVICE_ROLE_KEY");
    },
  },
  benna: {
    /** Guards /admin/commandes. Without it the page refuses everyone. */
    get adminToken() {
      return optional("BENNA_ADMIN_TOKEN");
    },
    /** Secret ntfy.sh topic the jury orders are relayed on, for /live. Without it nothing is sent. */
    get liveTopic() {
      return optional("BENNA_LIVE_TOPIC");
    },
    /** A human's WhatsApp number (international, digits only) for the bot's hand-off. */
    get supportPhone() {
      return optional("BENNA_SUPPORT_PHONE");
    },
  },
  /** Meta WhatsApp Cloud API. Without the token, replies are logged instead of sent. */
  whatsapp: {
    get enabled() {
      return (process.env.WHATSAPP_ENABLED ?? "true").toLowerCase() !== "false";
    },
    /**
     * "twilio" = Twilio WhatsApp Sandbox, "bridge" = scripts/whatsapp-bridge.mts (WhatsApp Web on a
     * spare number); both text only. Anything else is Meta Cloud API.
     */
    get provider() {
      const value = process.env.WHATSAPP_PROVIDER;
      return value === "twilio" || value === "bridge" ? value : ("meta" as const);
    },
    bridge: {
      get url() {
        return optional("WHATSAPP_BRIDGE_URL") ?? "http://127.0.0.1:3001";
      },
      /** Shared by the bridge and this server, both ways. */
      get secret() {
        return optional("WHATSAPP_BRIDGE_SECRET");
      },
    },
    twilio: {
      get accountSid() {
        return optional("TWILIO_ACCOUNT_SID");
      },
      get authToken() {
        return optional("TWILIO_AUTH_TOKEN");
      },
      /** The sandbox sender; a production Twilio number replaces it. */
      get from() {
        return optional("TWILIO_WHATSAPP_FROM") ?? "whatsapp:+14155238886";
      },
      /** The exact URL configured in Twilio, needed to check X-Twilio-Signature behind a tunnel. */
      get webhookUrl() {
        return optional("TWILIO_WEBHOOK_URL");
      },
    },
    /** Log replies instead of sending them, even with a token (terminal demo via the simulator). */
    get dryRun() {
      return process.env.WHATSAPP_DRY_RUN === "true";
    },
    get accessToken() {
      return optional("WHATSAPP_ACCESS_TOKEN");
    },
    get phoneNumberId() {
      return optional("WHATSAPP_PHONE_NUMBER_ID");
    },
    get verifyToken() {
      return optional("WHATSAPP_VERIFY_TOKEN");
    },
    get appSecret() {
      return optional("META_APP_SECRET");
    },
    /** v26.0 is current as of 2026-07-29 (developers.facebook.com/docs/graph-api/changelog). */
    get graphVersion() {
      return optional("META_GRAPH_API_VERSION") ?? "v26.0";
    },
  },
  openai: {
    get apiKey() {
      return optional("OPENAI_API_KEY");
    },
    /** Any chat model with JSON mode. Override when the key has access to something better. */
    get model() {
      return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    },
    /**
     * `whisper-1` was the default here and it cannot hear Moroccan Darija at all.
     *
     * Measured on /test-openai against one clip, all models given the identical bytes:
     * whisper-1 answered a real Darija recording with "شكرا على المشاهدة" — "thanks for
     * watching", a YouTube-subtitle artifact from its training data — and then repeated one
     * MSA sentence three times. That is not a bad transcription, it is the model
     * hallucinating because it has nothing to work with.
     *
     * `gpt-4o-transcribe` reads the same audio correctly, in a fifth of the time. It needs
     * `transcriptionPrompt` below to answer in Arabic script; without it the words come
     * back right but in Latin transliteration, which nothing downstream can read.
     */
    get transcriptionModel() {
      return process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe";
    },
  },
  /**
   * Voice engine policy.
   *
   * `darija` — the default — runs both engines at once and lets MoulSot's answer win
   * whenever it has one. It costs everyone the twenty seconds MoulSot takes, and it is
   * still the right default for this product: this is a Moroccan app for Moroccan places,
   * most people who speak to it speak Darija, and MoulSot is the only engine measured as
   * reliably landing the city the whole day gets built around.
   *
   * `auto` transcribes with Whisper first and re-runs on MoulSot only when the answer
   * looks Arabic or like transliterated Darija. A second instead of twenty for European
   * languages, and correct for Darija too — but by inference rather than by construction.
   * The right setting for a mixed audience, and the wrong one for a demo: a detection that
   * is right nine times in ten is a bad bet when the tenth is the one on stage.
   *
   * Deployed environments get whatever is set there, so the default is what ships. It is
   * `darija` so that a deployment nobody configured behaves like the machine it was built
   * and rehearsed on.
   */
  voice: {
    get darijaFirst() {
      return (process.env.VOICE_ENGINE ?? "darija").toLowerCase() !== "auto";
    },
  },
  groq: {
    get apiKey() {
      return optional("GROQ_API_KEY");
    },
    get model() {
      return process.env.GROQ_MODEL ?? "whisper-large-v3-turbo";
    },
  },
  /** Optional. Without it the YouTube branch of the URL chain falls back to OpenGraph. */
  youtube: {
    get apiKey() {
      return optional("YOUTUBE_API_KEY");
    },
  },
  routing: {
    get apiKey() {
      return optional("ROUTING_API_KEY");
    },
    get baseUrl() {
      return process.env.ROUTING_BASE_URL ?? "https://router.project-osrm.org";
    },
  },
  weather: {
    get baseUrl() {
      return process.env.WEATHER_BASE_URL ?? "https://api.open-meteo.com/v1";
    },
  },
} as const;

/** Feature availability, evaluated server-side. Drives graceful degradation. */
export const serverCapabilities = {
  get ai() {
    return Boolean(serverEnv.gemini.apiKey);
  },
  get transcription() {
    return Boolean(serverEnv.groq.apiKey || serverEnv.openai.apiKey);
  },
  /** The curator only runs with a key; the engine alone is the supported path without one. */
  get curation() {
    return Boolean(serverEnv.openai.apiKey);
  },
  get youtube() {
    return Boolean(serverEnv.youtube.apiKey);
  },
} as const;
