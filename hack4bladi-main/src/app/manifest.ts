import type { MetadataRoute } from "next";
import { APP } from "@/config/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP.name} · Fait maison au bureau`,
    short_name: APP.name,
    description: APP.tagline,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#a8060f",
    icons: [
      { src: "/icons/benna-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/benna-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
