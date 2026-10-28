"use client";

import { useEffect, useState } from "react";
import { CaretDown, Check, CircleNotch, Copy, Sparkle, WhatsappLogo } from "@phosphor-icons/react";
import { AppHeader } from "@/components/app-header";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import { GROUP, PARTICIPANTS, workplaceById } from "./data";
import { useCart, useCartHydration } from "./cart";
import type { InviteLanguage } from "./assistant";
import { AvatarStack } from "./ui";

const LANGUAGES: { id: InviteLanguage; label: string }[] = [
  { id: "fr", label: "Français" },
  { id: "darija", label: "Darija" },
  { id: "ar", label: "العربية" },
];

export function InviteScreen() {
  useCartHydration();
  const workplace = workplaceById(useCart((state) => state.workplaceId));
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [language, setLanguage] = useState<InviteLanguage>("fr");
  const [draft, setDraft] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setOrigin(window.location.origin), 0);
    return () => window.clearTimeout(id);
  }, []);

  const code = workplace?.code ?? "";
  const link = origin && code ? `${origin}/rejoindre/${code}` : "";
  const fallback = `Je commande le déjeuner sur BENNA, livraison à ${GROUP.delivery} au ${workplace?.pickup ?? "bureau"}. Rejoins la commande :\n{LINK}`;
  const template = draft ?? fallback;
  const message = template.replace("{LINK}", link);

  const write = async (next: InviteLanguage) => {
    if (!workplace) return;
    setLanguage(next);
    setShowMessage(true);
    setWriting(true);
    try {
      const response = await fetch("/api/benna/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: next, workplaceId: workplace.id }),
      });
      const data = (await response.json()) as { message?: string };
      if (data.message) setDraft(data.message);
    } catch {
      // The default message stays; nothing to lose.
    } finally {
      setWriting(false);
    }
  };

  const copy = async (what: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? link : code);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
    }
  };

  const copyButton = (what: "link" | "code", value: string) => (
    <button
      type="button"
      onClick={() => void copy(what)}
      disabled={!value}
      aria-label={what === "link" ? "Copier le lien" : "Copier le code"}
      className="pressable hover:bg-surface-muted grid size-10 shrink-0 place-items-center rounded-full"
    >
      {copied === what ? <Check aria-hidden className="text-primary-ink size-5" weight="bold" /> : <Copy aria-hidden className="size-5" />}
    </button>
  );

  return (
    <PageShell nav header={<AppHeader backHref="/groupe" title="Inviter au groupe" />} className="space-y-5 px-5 pb-8">
      {/* The people first: who is already in, then the one thing to pass on. */}
      <section className="flex flex-col items-center pt-2 text-center">
        <AvatarStack people={PARTICIPANTS} max={5} size="md" />
        <p className="text-muted-foreground mt-2 text-[0.8125rem]">
          <span className="text-foreground font-semibold tabular-nums">{PARTICIPANTS.length}</span> collègues déjà dans le groupe de {GROUP.host}
        </p>
        <div className="mt-4 flex items-center gap-1">
          <p dir="ltr" className="font-mono text-[2.25rem] leading-none font-semibold tracking-[0.18em]">
            {code}
          </p>
          {copyButton("code", code)}
        </div>
        <p className="text-muted-foreground mt-1.5 text-xs">Le code du groupe, à saisir sur « Où travaillez-vous ? »</p>
      </section>

      <a
        href={link ? `https://wa.me/?text=${encodeURIComponent(message)}` : undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!link}
        className="pressable bg-primary text-primary-foreground hover:bg-primary-hover flex h-12 items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold"
      >
        <WhatsappLogo aria-hidden className="size-5" weight="fill" />
        Partager sur WhatsApp
      </a>

      <section>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Langue du message" className="flex flex-1 gap-1.5">
            {LANGUAGES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => void write(entry.id)}
                disabled={writing}
                aria-pressed={draft !== null && language === entry.id}
                className={cn(
                  "pressable h-10 rounded-full border px-3.5 text-[0.75rem] font-medium disabled:opacity-60",
                  draft !== null && language === entry.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface",
                )}
              >
                {writing && language === entry.id ? (
                  <>
                    <CircleNotch aria-hidden className="size-4 animate-spin motion-reduce:animate-none" weight="bold" />
                    <span className="sr-only">{entry.label}</span>
                  </>
                ) : (
                  entry.label
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowMessage((open) => !open)}
            aria-expanded={showMessage}
            aria-controls="invite-message"
            className="text-muted-foreground flex shrink-0 items-center gap-1 text-[0.75rem] font-medium"
          >
            <Sparkle aria-hidden className="size-3.5" weight="fill" />
            Voir le message
            <CaretDown aria-hidden className={cn("size-3.5 transition-transform", showMessage && "rotate-180")} />
          </button>
        </div>
        {showMessage ? (
          <>
            <label htmlFor="invite-message" className="sr-only">
              Message
            </label>
            <textarea
              id="invite-message"
              name="invite-message"
              rows={5}
              dir="auto"
              value={message}
              onChange={(event) => setDraft(link ? event.target.value.replace(link, "{LINK}") : event.target.value)}
              className="card focus:border-primary mt-2 w-full resize-none px-4 py-3 text-[0.875rem] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </>
        ) : null}
      </section>

      <div className="card flex h-12 items-center gap-2 ps-4 pe-1">
        <span dir="ltr" className="min-w-0 flex-1 truncate text-[0.875rem]">
          {link.replace(/^https?:\/\//, "")}
        </span>
        {copyButton("link", link)}
      </div>
      <p className="sr-only" aria-live="polite">
        {copied === "link" ? "Lien copié" : copied === "code" ? "Code copié" : ""}
      </p>
    </PageShell>
  );
}
