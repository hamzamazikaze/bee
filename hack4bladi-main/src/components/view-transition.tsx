/// <reference types="react/canary" />
import { ViewTransition as ReactViewTransition, type ComponentProps } from "react";

/**
 * React's <ViewTransition> exists in the React build Next bundles, not in plain react
 * (vitest/jsdom). Where it is missing, children render as-is, without the animation.
 */
export function ViewTransition({ children, ...props }: ComponentProps<typeof ReactViewTransition>) {
  if (!ReactViewTransition) return <>{children}</>;
  return <ReactViewTransition {...props}>{children}</ReactViewTransition>;
}
