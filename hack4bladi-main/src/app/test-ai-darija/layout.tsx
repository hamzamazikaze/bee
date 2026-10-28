/**
 * The root layout puts every screen inside a phone frame. A developer laboratory wants
 * the whole window, so this layout escapes the frame with a fixed overlay rather than
 * touching anything the production shell owns.
 *
 * Off wherever this is deployed. A laboratory that spends the project's API credits
 * should not be reachable from a public URL by default — see @/config/diagnostics for
 * the switch that brings it back.
 */
import { notFound } from "next/navigation";
import { diagnosticsEnabled } from "@/config/diagnostics";

export default function TestAiDarijaLayout({ children }: LayoutProps<"/test-ai-darija">) {
  if (!diagnosticsEnabled()) notFound();

  return (
    <div className="fixed inset-0 z-[9999] overflow-auto bg-[#0b0d10] text-[#d7dde5]">
      {children}
    </div>
  );
}
