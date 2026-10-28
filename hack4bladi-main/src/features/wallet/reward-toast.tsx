"use client";

/**
 * The reward moment. A line that slides in, says what was earned, and leaves.
 *
 * Restrained on purpose: finishing a workshop is satisfying on its own, and a confetti
 * explosion would turn a travel app into a slot machine. It uses the same motion language
 * as the rest of the product and clears itself after a few seconds.
 */
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Coins } from "@phosphor-icons/react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useAppStore } from "@/lib/store";

const VISIBLE_MS = 3200;

export function RewardToast() {
  const { t } = useTranslation();
  const reward = useAppStore((state) => state.lastReward);
  const clearReward = useAppStore((state) => state.clearReward);

  useEffect(() => {
    if (!reward) return;
    const timer = setTimeout(clearReward, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [reward, clearReward]);

  return (
    <AnimatePresence>
      {reward ? (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center px-4"
        >
          <span className="bg-primary text-primary-foreground flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg">
            <Coins aria-hidden className="size-4" weight="fill" />
            {t(reward.kind === "day" ? "wallet.earnedDay" : "wallet.earnedStop", {
              count: reward.amount,
            })}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
