import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * A self-contained server bundle in .next/standalone, with only the node_modules it
   * actually imports. It exists for the container: the alternative is shipping the whole
   * dependency tree, which turns a ~200 MB image into a multi-gigabyte one on a box that
   * is already running eight of them on 3.8 GB of RAM.
   *
   * Off on Vercel (VERCEL=1 at build): Next 16.3 runs Vercel's onBuildComplete adapter
   * before the standalone step, and the two together fail on next-server.js.nft.json.
   */
  output: process.env.VERCEL ? undefined : "standalone",
  /**
   * The dev overlay renders a fixed portal in the bottom-left corner — exactly where the
   * Home tab sits — and swallows the tap. The demo may well run on `next dev`, so the
   * indicator has to go rather than the tab.
   */
  devIndicators: false,
  /**
   * Open the dev server from a phone on the same Wi-Fi (http://<laptop-ip>:3000). Without
   * this, Next serves the HTML but blocks its scripts for any origin but localhost, so the
   * page shows and nothing responds to a tap.
   */
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local", "*.trycloudflare.com"],
  /** Screens left from the travel app this repo started as; a typed URL lands on BENNA. */
  redirects() {
    return ["explore", "trip", "passport", "chat", "onboarding", "experience", "saved"].map((page) => ({
      source: `/${page}/:rest*`,
      destination: "/",
      permanent: false,
    }));
  },
};

export default nextConfig;
