import type { Metadata } from "next";
import { APP } from "@/config/app";
import { GROUP, WORKPLACES } from "@/features/benna/data";
import { JoinScreen } from "@/features/benna/join-screen";

type Props = { params: Promise<{ code: string }> };

/** The unfurl a chat app shows for a shared invite link. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const place = WORKPLACES.find((entry) => entry.code === code.toUpperCase());
  const title = place
    ? `Rejoignez la commande de ${GROUP.host} · ${place.name}`
    : "BENNA · Le goût de la maison, là où vous travaillez.";
  const description = `Plats marocains faits maison, livraison groupée à ${GROUP.delivery}.`;
  const image = new URL("/images/benna/couscous-7-legumes.webp", APP.url).toString();
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1024, height: 1024 }], type: "website", siteName: APP.name },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function Page({ params }: Props) {
  const { code } = await params;
  return <JoinScreen code={code} />;
}
