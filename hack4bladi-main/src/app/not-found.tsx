"use client";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A jury clicking freely can reach a route that never shipped. Same shell, one way home. */
export default function NotFound() {
  return (
    <PageShell header={<AppHeader backHref="/" title="Page introuvable" />} className="px-5">
      <p className="text-muted-foreground text-sm text-pretty">Cette page n&apos;existe pas. Le menu du jour, lui, vous attend.</p>
      <Link href="/" className={cn(buttonVariants({ size: "md" }), "mt-5")}>
        Voir le menu du jour
      </Link>
    </PageShell>
  );
}
