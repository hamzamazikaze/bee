"use client";

import { IconContext } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/**
 * The icon rule: FILLED by default, outline only where the glyph needs its interior.
 *
 * The generic-interface look does not come from which icon library is installed — every
 * outline set draws the same 1.5px stroke, which is why swapping Lucide for Phosphor for
 * Material changed nothing. It comes from every glyph in the app being a wireframe.
 * Solid shapes read as objects, the way a native tab bar does.
 *
 * The exceptions are meaning, not taste: a filled magnifying glass has no lens, a filled
 * spinner is a dot, a filled crosshair has no centre. Those call sites pass
 * `weight="bold"` explicitly, and a per-icon weight always beats this default.
 */
export function IconProvider({ children }: { children: ReactNode }) {
  return (
    <IconContext.Provider value={{ weight: "fill", size: 20 }}>
      {children}
    </IconContext.Provider>
  );
}
