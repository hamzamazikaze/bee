"use client";

import { useRouter } from "next/navigation";
import { Play } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/use-translation";

/**
 * The planning -> experience gear change. Exported for the Trip/Map worker to mount on
 * /trip: it flips the store into experience mode and navigates, so the transition looks
 * the same wherever it is triggered from.
 */
export function StartTripButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const trip = useAppStore((state) => state.trip);
  const startTrip = useAppStore((state) => state.startTrip);

  if (!trip) return null;

  return (
    <div className={className}>
      <Button
        size="lg"
        block
        onClick={() => {
          startTrip();
          router.push("/experience");
        }}
      >
        <Play aria-hidden className="size-5" />
        {t("trip.startTrip")}
      </Button>
      <p className="text-muted-foreground mt-2 text-center text-xs">
        {t("experience.startTripHint")}
      </p>
    </div>
  );
}
