/**
 * `SocialContext` for a pasted link — the shape the TripProfile has always carried.
 *
 * The extraction itself now lives in @/lib/ai/url, which runs the real provider chain
 * (TikTok oEmbed → YouTube Data API → OpenGraph). This file is the thin adapter from that
 * chain's `UrlMetadata` to the profile's `SocialContext`, so there is one metadata path
 * in the app rather than two that drift.
 *
 * Failure is silent by contract: we still hand back the platform and the URL.
 */
import { TIMEOUTS } from "@/config/app";
import { boundedSignal } from "@/lib/ai/http";
import { extractUrlMetadata, parseUrl, type UrlMetadata } from "@/lib/ai/url";
import type { SocialContextProvider } from "@/lib/ai/types";
import type { SocialContext } from "@/types/profile";

export function toSocialContext(metadata: UrlMetadata): SocialContext {
  return {
    platform: metadata.platform,
    url: metadata.url,
    author: metadata.author,
    title: metadata.title,
    caption: metadata.description,
    hashtags: metadata.hashtags,
    thumbnailUrl: metadata.thumbnailUrl,
  };
}

export class UrlChainSocialProvider implements SocialContextProvider {
  readonly name = "url-chain";

  constructor(private readonly youtubeApiKey?: string) {}

  async extractSocialContext(url: string, signal?: AbortSignal): Promise<SocialContext | null> {
    if (!parseUrl(url)) return null;
    const metadata = await extractUrlMetadata(url, {
      signal: signal ?? boundedSignal(TIMEOUTS.socialContextMs),
      youtubeApiKey: this.youtubeApiKey,
    });
    return metadata.provider === "invalid_url" ? null : toSocialContext(metadata);
  }
}

export const socialContextProvider: SocialContextProvider = new UrlChainSocialProvider();
