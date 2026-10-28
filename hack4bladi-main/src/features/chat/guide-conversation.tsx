"use client";

/**
 * The conversation itself, with no opinion about the screen it is on.
 *
 * It exists as its own component because the guide now has two front doors — the `/chat`
 * screen and a sheet inside onboarding — and two copies of a chat that mutates the profile
 * and builds trips would diverge on the first fix. Everything specific to a surface (the
 * page shell, the sheet, where you land afterwards) is a prop.
 *
 * The conversation lives here and nowhere else: not in the store, not on the server. A
 * chat about a Tuesday in Casablanca is not state the app should still hold tomorrow, and
 * keeping it local is what lets `/api/chat` stay stateless and a refresh be a clean start
 * rather than a stale one.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowUp, ChatCircleDots, Sparkle } from "@phosphor-icons/react";
import { rise } from "@/components/motion";
import { getPoiById } from "@/data/pois";
import { poiName } from "@/data/poi-utils";
import { buildTrip, readExtraPois, type CuratorPick } from "@/features/onboarding/build-trip";
import { ProvenanceBadge } from "@/features/trip/provenance-badge";
import type { PoiProvenance } from "@/features/trip/provenance";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { POI } from "@/types/poi";
import type { TripProfile } from "@/types/profile";

/** Stable reference, and the only state this card interrupts for. */
const AI_ONLY: readonly PoiProvenance[] = ["ai_suggested"];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Present only on the turn where the guide actually proposed a day. */
  picks?: CuratorPick[];
  headline?: string;
  /** Guide-authored stops behind those picks, when the catalogue had none. */
  pois?: POI[];
}

/** The three things a traveller opens this on wanting, in their own words. */
const OPENERS = ["chat.opener1", "chat.opener2", "chat.opener3"] as const;

export interface GuideConversationHandle {
  /** The composer, so a surface can put it in its own footer. */
  composer: React.ReactNode;
  /** The transcript and the day card. */
  thread: React.ReactNode;
}

/**
 * Renders the thread and the composer through a child function, so the two surfaces can
 * place them differently — `/chat` puts the composer in the page's sticky footer, the
 * sheet puts it at the bottom of the sheet — without either of them owning the logic.
 */
export function GuideConversation({
  children,
  onBuilt,
}: {
  children: (parts: GuideConversationHandle) => React.ReactNode;
  /** Fires once the trip is built and stored, before navigation. Lets a sheet close. */
  onBuilt?: () => void;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const profile = useAppStore((state) => state.profile);
  const patchProfile = useAppStore((state) => state.patchProfile);
  const setTrip = useAppStore((state) => state.setTrip);
  const trip = useAppStore((state) => state.trip);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [building, setBuilding] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  /* The newest turn is the one being read, so the column follows it down. */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;

    const outgoing: Message = { id: `m-${Date.now()}`, role: "user", content };
    const history = [...messages, outgoing];
    setMessages(history);
    setDraft("");
    setPending(true);
    setUnavailable(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: history.map(({ role, content: line }) => ({ role, content: line })),
          locale,
          profile,
          currentPoiIds: trip?.stops.map((stop) => stop.poiId) ?? [],
        }),
      });
      const data = (await response.json()) as {
        degraded?: boolean;
        reply?: string;
        picks?: CuratorPick[];
        headline?: string;
        profile?: Partial<TripProfile>;
        pois?: unknown;
      };

      if (data.degraded || !data.reply) {
        setUnavailable(true);
        return;
      }

      /* What the guide understood travels straight into the profile the engine reads, so
         a day built after ten turns of conversation is built from the conversation. */
      const understood = data.profile ?? {};
      const patch: Partial<TripProfile> = Object.fromEntries(
        Object.entries(understood).filter(
          ([, value]) =>
            value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0),
        ),
      );
      if (Object.keys(patch).length > 0) patchProfile(patch);

      setMessages((current) => [
        ...current,
        {
          id: `m-${Date.now()}-a`,
          role: "assistant",
          content: data.reply ?? "",
          picks: data.picks?.length ? data.picks : undefined,
          headline: data.headline,
          pois: readExtraPois(data.pois),
        },
      ]);
    } catch {
      setUnavailable(true);
    } finally {
      setPending(false);
    }
  }

  /**
   * The hand-off. The guide chose the stops; the engine still schedules them, routes them
   * and repairs the day against opening hours and the budget — which is why this goes
   * through `buildTrip` rather than writing a trip object here.
   */
  async function buildDay(picks: CuratorPick[], pois: POI[] = []) {
    if (building) return;
    setBuilding(true);
    try {
      const built = await buildTrip({ ...useAppStore.getState().profile, locale }, picks, pois);
      setTrip(built);
      onBuilt?.();
      router.push("/trip");
    } finally {
      setBuilding(false);
    }
  }

  const empty = messages.length === 0;

  const composer = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void send(draft);
      }}
      className="flex items-end gap-2"
    >
      <label htmlFor="guide-input" className="sr-only">
        {t("chat.placeholder")}
      </label>
      <input
        id="guide-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={t("chat.placeholder")}
        autoComplete="off"
        className="border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-primary h-12 min-w-0 flex-1 rounded-2xl border px-4 text-[0.9375rem] outline-none transition"
      />
      <button
        type="submit"
        disabled={pending || draft.trim().length === 0}
        aria-label={t("chat.send")}
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable grid size-12 shrink-0 place-items-center rounded-2xl transition disabled:opacity-40"
      >
        <ArrowUp aria-hidden className="size-5" weight="bold" />
      </button>
    </form>
  );

  const thread = (
    <>
      {empty ? (
        <section className="flex flex-col items-center pt-10 text-center">
          <span className="border-border text-primary-ink grid size-14 place-items-center rounded-full border">
            <ChatCircleDots aria-hidden className="size-6" weight="light" />
          </span>
          <h2 className="font-display mt-6 text-[1.5rem] leading-tight text-balance">
            {t("chat.emptyTitle")}
          </h2>
          <p className="text-muted-foreground mt-2.5 max-w-[20rem] text-[0.875rem] leading-relaxed text-pretty">
            {t("chat.emptyBody")}
          </p>
          <ul className="mt-7 flex w-full max-w-sm flex-col gap-2">
            {OPENERS.map((key, index) => (
              <motion.li key={key} {...rise(index)}>
                <button
                  type="button"
                  onClick={() => void send(t(key))}
                  className="border-border bg-surface hover:border-primary pressable w-full rounded-2xl border px-4 py-3 text-start text-[0.875rem] leading-snug transition"
                >
                  {t(key)}
                </button>
              </motion.li>
            ))}
          </ul>
        </section>
      ) : (
        <ol className="flex flex-col gap-3 pt-2">
          {messages.map((message) => (
            <li
              key={message.id}
              className={cn("flex flex-col", message.role === "user" ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border-border bg-surface border",
                )}
              >
                {message.content}
              </div>
              {message.picks ? (
                <DayCard
                  picks={message.picks}
                  pois={message.pois ?? []}
                  headline={message.headline}
                  building={building}
                  onBuild={() => void buildDay(message.picks ?? [], message.pois)}
                />
              ) : null}
            </li>
          ))}
          {pending ? (
            <li className="text-muted-foreground px-1 text-[0.8125rem]">{t("chat.thinking")}</li>
          ) : null}
        </ol>
      )}

      {unavailable ? (
        <p className="text-muted-foreground mt-4 text-center text-[0.8125rem]">
          {t("chat.unavailable")}
        </p>
      ) : null}

      <div ref={endRef} />
    </>
  );

  return <>{children({ composer, thread })}</>;
}

/**
 * The day, inside the conversation.
 *
 * It lists the stops the guide chose with the line it chose each of them for, and nothing
 * else — no times, no distance, no cost. Those are the engine's answers and it has not
 * been asked yet; printing a guess here and a real number on `/trip` is how two screens
 * come to disagree.
 */
function DayCard({
  picks,
  pois,
  headline,
  building,
  onBuild,
}: {
  picks: CuratorPick[];
  pois: POI[];
  headline?: string;
  building: boolean;
  onBuild: () => void;
}) {
  const { t, locale } = useTranslation();

  return (
    <div className="border-border bg-surface mt-2 w-full max-w-[85%] rounded-2xl border p-4">
      <p className="text-primary-ink eyebrow">{t("chat.dayEyebrow")}</p>
      {headline ? (
        <p className="font-display mt-1 text-[1.0625rem] leading-snug text-balance">{headline}</p>
      ) : null}
      <ol className="mt-3 flex flex-col gap-2.5">
        {picks.map((pick, index) => {
          const poi = getPoiById(pick.poiId) ?? pois.find((entry) => entry.id === pick.poiId);
          if (!poi) return null;
          return (
            <li key={pick.poiId} className="flex gap-2.5">
              <span className="border-border text-muted-foreground mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[0.6875rem] font-semibold">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[0.875rem] font-semibold">{poiName(poi, locale)}</p>
                {pick.reason ? (
                  <p className="text-muted-foreground text-[0.8125rem] leading-snug">
                    {pick.reason}
                  </p>
                ) : null}
                {/* Marked here, at the moment it is offered, rather than only after the
                    day is built. The guide may answer for a city the catalogue does not
                    cover — that is deliberate, and refusing would be worse — but a stop it
                    wrote itself must never arrive looking like one of ours. */}
                <ProvenanceBadge poi={poi} only={AI_ONLY} className="mt-1 flex" />
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={onBuild}
        disabled={building}
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[0.875rem] text-[0.9375rem] font-semibold transition disabled:opacity-60"
      >
        <Sparkle aria-hidden className="size-4" weight="fill" />
        {building ? t("chat.building") : t("chat.build")}
      </button>
    </div>
  );
}
