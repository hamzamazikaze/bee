"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { ViewTransition } from "@/components/view-transition";
import { cn } from "@/lib/utils";
import { BottomNav } from "./bottom-nav";
import { OrnamentDefs } from "./ornament";

/**
 * How deep a route sits. Deeper = forward (slides in from the end), shallower = back,
 * same level = the tabs (crossfade). Browser back works too: direction comes from the
 * pair of paths, not from which link was tapped.
 */
function depth(path: string): number {
  if (path === "/bienvenue" || path.startsWith("/rejoindre")) return 0;
  if (path === "/" || path === "/groupe" || path === "/sondage" || path === "/commandes" || path === "/compte") return 1;
  if (path.startsWith("/commande")) return 3;
  return 2;
}

let lastPath: string | null = null;

/** Runs during render: the transition's CSS reads it before the new snapshot animates. */
function markDirection(pathname: string) {
  if (typeof document === "undefined" || lastPath === null || lastPath === pathname) return;
  const from = depth(lastPath);
  const to = depth(pathname);
  document.documentElement.dataset.nav = to > from ? "forward" : to < from ? "back" : "fade";
}

/**
 * Every screen sits in here. It owns the column, the reduced-motion contract, the SVG
 * defs the ornaments clip against, and the bottom stack — the sticky action bar above
 * the tab bar.
 *
 * Route changes run through React's <ViewTransition>: the page slides by depth (see
 * `depth`), while the tab bar stays anchored and the action pill morphs between screens
 * (named groups in globals.css). Browsers without the View Transitions API just cut.
 */
export function PageShell({
  header,
  footer,
  nav = false,
  children,
  className,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  /** Show the bottom navigation. */
  nav?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  markDirection(pathname);
  useEffect(() => {
    lastPath = pathname;
  }, [pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <ViewTransition enter="page" exit="page" default="none">
        <div className="bg-background relative flex min-h-full flex-col">
          <OrnamentDefs />
          {header}
          <main className={cn("flex-1", className)}>{children}</main>
          {footer || nav ? (
            <div className="sticky bottom-0 z-20 mt-auto">
              {footer ? (
                <div
                  style={{ viewTransitionName: "page-footer" }}
                  className={cn(
                    "border-border bg-background/95 border-t px-4 pt-2.5 backdrop-blur",
                    nav ? "pb-4" : "pb-[max(0.625rem,env(safe-area-inset-bottom))]",
                  )}
                >
                  {footer}
                </div>
              ) : null}
              {nav ? (
                <div style={{ viewTransitionName: "tab-bar" }}>
                  <BottomNav />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </ViewTransition>
    </MotionConfig>
  );
}
