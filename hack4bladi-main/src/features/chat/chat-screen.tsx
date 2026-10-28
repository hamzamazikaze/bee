"use client";

/**
 * The guide screen: the app with its logic turned the other way round.
 *
 * Everywhere else, the traveller answers four questions and the engine writes the day.
 * Here they talk, the guide answers anything, and the day arrives as a card in the
 * conversation with a button on it. The engine is still what builds that day — it just
 * stops being what decides it.
 *
 * All of that lives in `GuideConversation`, because onboarding now opens the same thing in
 * a sheet. What is left here is the page: a header, a sticky composer, and the column.
 */
import { AppHeader } from "@/components/app-header";
import { PageShell } from "@/components/page-shell";
import { useTranslation } from "@/lib/i18n/use-translation";
import { GuideConversation } from "./guide-conversation";

export function ChatScreen() {
  const { t } = useTranslation();

  return (
    <GuideConversation>
      {({ composer, thread }) => (
        <PageShell
          nav
          header={<AppHeader eyebrow={t("chat.eyebrow")} title={t("chat.title")} backHref="/" />}
          footer={composer}
          className="px-4 pb-4"
        >
          {thread}
        </PageShell>
      )}
    </GuideConversation>
  );
}
