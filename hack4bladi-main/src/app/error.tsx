"use client";

import { AppHeader } from "@/components/app-header";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Route-level boundary: a crash keeps the shell and offers one recovery, never a white screen. */
export default function ErrorScreen({ reset }: { reset: () => void }) {
  const { t } = useTranslation();

  return (
    <PageShell
      header={<AppHeader backHref="/" title={t("common.appName")} />}
      className="px-5"
    >
      <p className="text-muted-foreground text-sm text-pretty">{t("errors.generic")}</p>
      <Button className="mt-5" onClick={reset}>
        {t("common.retry")}
      </Button>
    </PageShell>
  );
}
