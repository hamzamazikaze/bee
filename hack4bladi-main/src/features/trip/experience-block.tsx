"use client";

/**
 * The part of a place sheet that only an experience has: who hosts it, what you will
 * actually do, what it costs, what it earns — and the partner offer the wallet can unlock.
 *
 * Deliberately a block inside the existing sheet rather than a second detail screen. A
 * workshop and a mosque are the same kind of thing to this app: a stop on a day. Only the
 * middle of the sheet differs.
 */
import { useRef, useState } from "react";
import {
  Coins,
  HandCoins,
  Lock,
  Pause,
  Play,
  Sparkle,
  Storefront,
  UserSound,
  Users,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useLocalized, useTranslation } from "@/lib/i18n/use-translation";
import { useAppStore } from "@/lib/store";
import {
  basePriceMad,
  discountLabel,
  discountedPriceMad,
  isRedeemed,
  kindOf,
  rewardFor,
} from "@/lib/wallet";
import type { MessageKey } from "@/lib/i18n";
import type { POI } from "@/types/poi";

const LABEL = "text-muted-foreground text-[0.6875rem] font-bold tracking-[0.14em] uppercase";

export function ExperienceBlock({ poi }: { poi: POI }) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const wallet = useAppStore((state) => state.wallet);
  const redeem = useAppStore((state) => state.redeem);
  const [failure, setFailure] = useState<string | null>(null);

  const meta = poi.experience;
  if (!meta || kindOf(poi) === "place") return null;

  const host = meta.host ? (localized(meta.host.displayName) ?? meta.host.name) : null;
  const price = basePriceMad(poi);
  const discount = meta.discount;
  const unlocked = isRedeemed(wallet, poi.id);
  const after = discount ? discountedPriceMad(poi) : null;
  const short = discount ? Math.max(0, discount.minimumCoins - wallet.balance) : 0;

  function unlock() {
    const result = redeem(poi.id);
    if (!result.ok) {
      setFailure(
        result.reason === "insufficient_balance"
          ? t("wallet.needMore", { count: short })
          : t("wallet.unlocked"),
      );
    }
  }

  return (
    <section className="border-border bg-surface mt-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-[0.625rem] font-bold tracking-wide uppercase">
          {t(`activity.kind.${kindOf(poi)}` as MessageKey)}
        </span>
        {/* The one line that says this is not another place card. */}
        {host ? (
          <span className="border-primary/40 text-primary-ink rounded-full border px-2.5 py-1 text-[0.625rem] font-bold tracking-wide uppercase">
            {t("activity.meetSomeone")}
          </span>
        ) : null}
        <span className="text-muted-foreground text-xs">
          {poi.baseDurationMinutes} {t("common.minutes")}
        </span>
        {price !== null ? (
          <span className="text-muted-foreground text-xs">
            · {t(meta.price?.min ? "activity.from" : "activity.price", { price })}
          </span>
        ) : null}
      </div>

      {host ? (
        <p className="text-foreground mt-2.5 text-sm font-medium">
          {t("activity.with", { host })}
        </p>
      ) : null}

      {poi.media.hostAudio ? <HostVoice src={poi.media.hostAudio} host={host} /> : null}

      {meta.includes?.length ? (
        <div className="mt-3.5">
          <p className={LABEL}>{t("activity.youWillDo")}</p>
          <ul className="mt-1.5 space-y-1">
            {meta.includes.map((line, index) => (
              <li key={index} className="text-foreground flex gap-2 text-sm">
                <Sparkle aria-hidden className="text-primary-ink mt-0.5 size-3.5 shrink-0" />
                <span>{localized(line)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {meta.skills?.length ? (
        <div className="mt-3.5">
          <p className={LABEL}>{t("activity.youWillLearn")}</p>
          <p className="text-foreground mt-1.5 text-sm">
            {meta.skills.map((skill) => localized(skill)).join(" · ")}
          </p>
        </div>
      ) : null}

      <div className="text-muted-foreground mt-3.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {meta.capacity ? (
          <span className="flex items-center gap-1.5">
            <Users aria-hidden className="size-3.5" />
            {t("activity.capacity", { count: meta.capacity })}
          </span>
        ) : null}
        {meta.supportsLocalBusiness ? (
          <span className="flex items-center gap-1.5">
            <Storefront aria-hidden className="size-3.5" />
            {t("activity.supportsLocal")}
          </span>
        ) : null}
      </div>

      {/* What finishing it is worth. */}
      <p className="text-primary-ink mt-3.5 flex items-center gap-1.5 text-sm font-semibold">
        <Coins aria-hidden className="size-4" weight="fill" />
        {t("activity.reward", { count: rewardFor(poi) })}
      </p>

      {discount ? (
        <div className="border-border-strong mt-3.5 rounded-md border border-dashed p-3">
          {unlocked ? (
            <>
              <p className="text-primary-ink flex items-center gap-1.5 text-sm font-semibold">
                <HandCoins aria-hidden className="size-4" weight="fill" />
                {t("wallet.unlocked")}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">{t("wallet.unlockedBody")}</p>
              {price !== null && after !== null ? (
                <p className="mt-1.5 text-sm">
                  <span className="text-muted-foreground line-through">
                    {t("wallet.was", { price })}
                  </span>{" "}
                  <span className="text-foreground font-semibold">
                    {t("wallet.now", { price: after })}
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-foreground flex items-center gap-1.5 text-sm font-semibold">
                <Lock aria-hidden className="size-4" />
                {t("wallet.unlock", {
                  discount: discountLabel(discount),
                  coins: discount.minimumCoins,
                })}
              </p>
              <Button
                size="sm"
                className="mt-2.5"
                onClick={unlock}
                disabled={wallet.balance < discount.minimumCoins}
              >
                {t("wallet.unlock", {
                  discount: discountLabel(discount),
                  coins: discount.minimumCoins,
                })}
              </Button>
              {wallet.balance < discount.minimumCoins ? (
                <p className="text-muted-foreground mt-1.5 text-xs">
                  {t("wallet.needMore", { count: short })}
                </p>
              ) : null}
              {failure ? (
                <p role="alert" className="text-danger mt-1.5 text-xs font-semibold">
                  {failure}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {/* Honesty: our own curated content, not a signed commercial partnership. */}
      {meta.partnerStatus === "demo" ? (
        <p className="text-muted-foreground mt-3 text-[0.6875rem]">{t("activity.demoPartner")}</p>
      ) : null}
    </section>
  );
}

/**
 * The host, in their own voice.
 *
 * A deliberate answer to narrated tourism apps rather than a copy of one: this is not a
 * guide reading a description over the product, it is the person you are about to meet
 * saying what happens in their workshop. That distinction is the reason the control is
 * gated on `media.hostAudio` and nothing else — no recording, no button, no substitute.
 * We do not synthesise a voice for a real person, and we do not narrate on their behalf.
 *
 * One element, no library: `<audio preload="none">` fetches nothing until it is played.
 */
function HostVoice({ src, host }: { src: string; host: string | null }) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }

  return (
    <div className="border-primary/30 bg-primary-soft mt-3 flex items-center gap-3 rounded-md border p-2.5">
      <Button
        size="icon"
        className="rounded-full"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={t("activity.hearHost")}
      >
        {playing ? (
          <Pause aria-hidden className="size-4" weight="fill" />
        ) : (
          <Play aria-hidden className="size-4" weight="fill" />
        )}
      </Button>
      <p className="min-w-0 flex-1 text-sm font-semibold">
        <span className="flex items-center gap-1.5">
          <UserSound aria-hidden className="text-primary-ink size-4" />
          {t("activity.hearHost")}
        </span>
        {host ? <span className="text-muted-foreground block text-xs font-normal">{host}</span> : null}
      </p>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
