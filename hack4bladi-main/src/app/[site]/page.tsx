import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GROUP, workplaceById } from "@/features/benna/data";
import { OnboardScreen } from "@/features/benna/onboard-screen";
import { SITES } from "@/features/benna/sites";

type Props = { params: Promise<{ site: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(SITES).map((site) => ({ site }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const workplace = workplaceById(SITES[(await params).site] ?? null);
  return {
    title: workplace ? `BENNA · ${workplace.name.split(" · ")[0]}` : "BENNA",
    description: `Plats marocains faits maison, livraison groupée à ${GROUP.delivery}.`,
  };
}

export default async function Page({ params }: Props) {
  const workplace = workplaceById(SITES[(await params).site] ?? null);
  if (!workplace) notFound();
  return <OnboardScreen workplaceId={workplace.id} />;
}
