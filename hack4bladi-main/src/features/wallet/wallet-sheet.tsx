"use client";

/**
 * The Khotwa Wallet — balance, the partner offers it can unlock, and what earned it.
 *
 * A sheet rather than a tab: the wallet is something you check, not somewhere you live,
 * and the bottom navigation is already full. It opens from Profile.
 *
 * A loyalty ledger, not money. Nothing here charges anyone: unlocking an offer spends
 * coins and shows the traveller what to say at the door — they still pay the host.
 */
import { Drawer } from "vaul";
import { Coins, HandCoins, Lock } from "@phosphor-icons/react";
import { POIS } from "@/data/pois";
import { Button } from "@/components/ui/button";
import { useLocalized, useTranslation } from "@/lib/i18n/use-translation";
import { useAppStore } from "@/lib/store";
import { poiName } from "@/data/poi-utils";
import { discountLabel, isRedeemed } from "@/lib/wallet";
import type { MessageKey } from "@/lib/i18n";

/** Every curated experience that carries an offer, best value first. */
const OFFERS = POIS.filter((poi) => poi.experience?.discount).sort(
  (a, b) =>
    (a.experience!.discount!.minimumCoins ?? 0) - (b.experience!.discount!.minimumCoins ?? 0),
);

export function WalletSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useTranslation();
  const localized = useLocalized();
  const wallet = useAppStore((state) => state.wallet);
  const redeem = useAppStore((state) => state.redeem);

  return (
    <Drawer.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="app-anchored z-40 bg-black/45" />
        <Drawer.Content
          className="bg-background border-border fixed z-50 mx-auto flex max-h-[88%] flex-col overflow-hidden rounded-t-2xl border-t outline-none [&::after]:hidden"
          style={{
            insetInline: 0,
            width: "var(--app-w)",
            maxWidth: "100%",
            bottom: "var(--app-inset-block)",
          }}
        >
          <div aria-hidden className="bg-border mx-auto mt-3 h-1 w-10 rounded-full" />

          <div className="overflow-y-auto px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <Drawer.Title className="sr-only">{t("wallet.title")}</Drawer.Title>

            <div className="text-center">
              <p className="font-display text-saffron text-5xl leading-none tabular-nums">
                {wallet.balance}
              </p>
              <p className="text-muted-foreground mt-1.5 text-sm">{t("wallet.coins")}</p>
              {wallet.lifetimeEarned > 0 ? (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t("wallet.lifetime", { count: wallet.lifetimeEarned })}
                </p>
              ) : null}
            </div>

            <section className="mt-6">
              <p className="eyebrow text-muted-foreground">{t("wallet.rewards")}</p>
              <ul className="mt-2.5 space-y-2.5">
                {OFFERS.map((poi) => {
                  const discount = poi.experience!.discount!;
                  const unlocked = isRedeemed(wallet, poi.id);
                  const short = Math.max(0, discount.minimumCoins - wallet.balance);
                  return (
                    <li
                      key={poi.id}
                      className="border-border bg-surface rounded-lg border p-3.5"
                    >
                      <p className="text-foreground text-sm font-semibold">
                        {poiName(poi, locale)}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {localized(poi.experience?.host?.displayName) ??
                          poi.experience?.host?.name}
                      </p>

                      {unlocked ? (
                        <p className="text-saffron mt-2.5 flex items-center gap-1.5 text-sm font-semibold">
                          <HandCoins aria-hidden className="size-4" weight="fill" />
                          {t("wallet.unlocked")}
                        </p>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="mt-2.5"
                            disabled={wallet.balance < discount.minimumCoins}
                            onClick={() => redeem(poi.id)}
                          >
                            <Lock aria-hidden className="size-3.5" />
                            {t("wallet.unlock", {
                              discount: discountLabel(discount),
                              coins: discount.minimumCoins,
                            })}
                          </Button>
                          {short > 0 ? (
                            <p className="text-muted-foreground mt-1.5 text-xs">
                              {t("wallet.needMore", { count: short })}
                            </p>
                          ) : null}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="mt-6">
              <p className="eyebrow text-muted-foreground">{t("wallet.history")}</p>
              {wallet.transactions.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">{t("wallet.emptyBody")}</p>
              ) : (
                <ul className="divide-border mt-1.5 divide-y">
                  {[...wallet.transactions]
                    .reverse()
                    .slice(0, 20)
                    .map((entry) => (
                      <li key={entry.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <Coins
                          aria-hidden
                          className={entry.amount > 0 ? "text-saffron size-4" : "text-muted-foreground size-4"}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground block truncate">{entry.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {t(`wallet.tx.${entry.type}` as MessageKey)}
                          </span>
                        </span>
                        <span
                          dir="ltr"
                          className={
                            entry.amount > 0
                              ? "text-saffron font-semibold tabular-nums"
                              : "text-muted-foreground font-semibold tabular-nums"
                          }
                        >
                          {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </section>

            <Button variant="outline" block className="mt-6" onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
