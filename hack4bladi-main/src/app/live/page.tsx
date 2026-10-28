import type { Metadata } from "next";
import { serverEnv } from "@/config/env";
import { LiveBoard } from "@/features/benna/live-board";

export const metadata: Metadata = { title: "BENNA · En direct", robots: { index: false } };

/** /live?token=… — the presenter's screen: the jury's orders as they land. */
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; demo?: string }> }) {
  const { token, demo } = await searchParams;
  // Local design check only: /live?demo=1 plays fake orders, never in a deployed build.
  if (process.env.NODE_ENV === "development" && demo) return <LiveBoard topic="" demo />;
  const topic = serverEnv.benna.liveTopic;
  if (!serverEnv.benna.adminToken || token !== serverEnv.benna.adminToken) {
    return <main className="p-6 text-sm">Accès refusé. Ouvrez /live?token=… (BENNA_ADMIN_TOKEN).</main>;
  }
  if (!topic) return <main className="p-6 text-sm">BENNA_LIVE_TOPIC manquant : rien à écouter.</main>;
  return <LiveBoard topic={topic} />;
}
