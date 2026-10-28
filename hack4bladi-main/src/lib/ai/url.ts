/**
 * The URL provider chain: a pasted link → the metadata a platform will actually give us.
 *
 * Order matters and each step is deliberate:
 *
 *   TikTok  → the official public oEmbed endpoint. No key, no scraping, no login.
 *   YouTube → the official Data API when a key is configured, OpenGraph otherwise.
 *   Anything else → the page's own OpenGraph tags.
 *
 * What this is NOT: a scraper. No headless browser, no private API, no video download,
 * no rate-limit dance. Those are brittle on a good day and a liability on stage.
 *
 * Every step is bounded and every failure degrades one level rather than throwing. The
 * worst case still returns the platform and the URL the traveller pasted, because URL
 * extraction is enrichment — it must never be a hard dependency of the trip.
 *
 * `metascraper` was considered for the generic branch and passed over: it pulls a
 * cheerio-based dependency tree for the four tags this app reads, and the extractor below
 * was already in the repository doing the same job. One less thing to install on the
 * morning of a demo.
 *
 * Deliberately free of `server-only` so the chain stays unit-testable with a stubbed fetch.
 */
import { TIMEOUTS, UPLOAD } from "@/config/app";
import { boundedSignal } from "@/lib/ai/http";
import type { ImageInput } from "@/lib/ai/types";
import type { SocialPlatform } from "@/types/profile";

/** Which branch of the chain answered. Internal — never shown to a traveller. */
export type UrlProvider =
  | "tiktok_oembed"
  | "youtube_api"
  | "opengraph"
  | "platform_only"
  | "invalid_url";

export interface UrlMetadata {
  url: string;
  platform: SocialPlatform;
  provider: UrlProvider;
  title: string | null;
  description: string | null;
  author: string | null;
  publisher: string | null;
  thumbnailUrl: string | null;
  hashtags: string[];
  /** True when we learned nothing beyond the platform and the URL itself. */
  degraded: boolean;
}

export function platformOf(hostname: string): SocialPlatform {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  if (host.includes("tiktok")) return "tiktok";
  if (host.includes("instagram") || host.includes("instagr.am")) return "instagram";
  if (host.includes("facebook") || host.includes("fb.watch")) return "facebook";
  if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
  return "other";
}

/** Anything of the form `scheme:` at the very start. */
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/**
 * Hosts this server will not fetch on a stranger's behalf.
 *
 * A pasted link is untrusted input that we then go and request *from inside our own
 * network*, and hand two fields of the answer back to whoever pasted it. Without this,
 * `{"url": "http://169.254.169.254/…"}` reads a cloud instance's metadata service, and
 * anything on the deployment's private network is one request away. It costs nothing on a
 * laptop and is a real hole the moment this is deployed.
 *
 * Every obfuscated spelling of an address is already handled for us: WHATWG URL parsing
 * canonicalises `0177.0.0.1`, `0x7f.1` and `2130706433` all to `127.0.0.1` before this
 * ever sees them, so matching the canonical form is enough.
 *
 * NOT covered, and worth being honest about: DNS rebinding. A name that resolves to a
 * public address here and a private one when `fetch` connects would pass. Closing that
 * needs resolution and connection to be the same act — an agent that pins the socket —
 * which is well past what this is for.
 */
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "instance-data"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

function isBlockedIPv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  // Canonical dotted quad only; anything else is a name, not an address.
  if (!parts.every((part) => /^\d{1,3}$/.test(part))) return false;
  const [a, b] = parts.map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, and every cloud metadata service
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return a >= 224; // multicast and reserved
}

export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  if (host.includes(":")) {
    if (host === "::1" || host === "::") return true;
    const mapped = host.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (mapped) return isBlockedIPv4(mapped[1]);
    const head = Number.parseInt(host.split(":")[0] || "0", 16);
    if (Number.isNaN(head)) return false;
    if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    return false;
  }

  return isBlockedIPv4(host);
}

/** Accepts a bare "tiktok.com/@a/video/1" as well as a full URL. Rejects everything else. */
export function parseUrl(raw: string): URL | null {
  const value = raw.trim();
  if (!value) return null;

  /* Prefix https:// only when there is no scheme at all. Prefixing blindly turns
     "mailto:someone@example.com" into a valid https URL with `mailto` as the username
     and example.com as the host — a link we would then go and fetch. */
  const scheme = value.match(SCHEME)?.[1]?.toLowerCase();
  if (scheme && scheme !== "http" && scheme !== "https") return null;

  let url: URL;
  try {
    url = new URL(scheme ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname.includes(".")) return null;
  if (isBlockedHost(url.hostname)) return null;
  return url;
}

/** Hard ceiling on a redirect chain. Three is more than any real link needs. */
const MAX_REDIRECTS = 3;

/**
 * `fetch`, with every hop of the redirect chain checked against `isBlockedHost`.
 *
 * Validating only the URL the traveller pasted is not enough on its own: a page we are
 * perfectly happy to read can answer `302 Location: http://169.254.169.254/`, and
 * `redirect: "follow"` would take us there without asking. So the chain is walked by hand
 * and every destination goes through the same gate as the first one.
 */
async function guardedFetch(
  url: URL,
  init: RequestInit & { signal?: AbortSignal },
): Promise<Response | null> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (isBlockedHost(current.hostname)) return null;

    const response = await fetch(current.toString(), { ...init, redirect: "manual" });
    if (response.status < 300 || response.status > 399) return response;

    const location = response.headers.get("location");
    if (!location) return response;

    /* Cancel the body of the redirect before leaving it: an undrained response holds the
       socket open for as long as the runtime lets it. */
    void response.body?.cancel().catch(() => {});

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      return null;
    }
    if (next.protocol !== "https:" && next.protocol !== "http:") return null;
    current = next;
  }

  return null;
}

export function hashtagsIn(text: string | null | undefined): string[] {
  if (!text) return [];
  return [...text.matchAll(/#([\p{L}\p{N}_]{2,30})/gu)].map((match) => match[1]).slice(0, 8);
}

/**
 * Named entities, then any numeric one.
 *
 * The numeric branch is not thoroughness for its own sake: Instagram encodes ordinary
 * punctuation this way, and a caption arrived reading "(&#064;storm.syaha) &#x2022;" —
 * `@` and `•` left raw on the confirmation screen for a jury to read, because the list
 * here happened to cover `&#39;` and `&#x27;` and nothing else. Decoding the whole form
 * once is smaller than the list it replaces.
 *
 * `&amp;` is unescaped first so a double-encoded `&amp;#64;` still lands on `@`.
 */
function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (whole, code: string) => {
      const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
      /* Anything outside Unicode, or a lone surrogate, is left exactly as it arrived —
         a mangled caption beats String.fromCodePoint throwing inside the URL chain. */
      if (!Number.isFinite(point) || point <= 0 || point > 0x10ffff) return whole;
      if (point >= 0xd800 && point <= 0xdfff) return whole;
      return String.fromCodePoint(point);
    });
}

/** One meta tag, whichever order the attributes happen to be in. */
export function metaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const forward = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const reversed = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
    "i",
  );
  const match = html.match(forward) ?? html.match(reversed);
  return match?.[1] ? decodeHtml(match[1]) : null;
}

/** First non-empty of a list of meta properties. */
function firstMeta(html: string, properties: string[]): string | null {
  for (const property of properties) {
    const value = metaContent(html, property);
    if (value && value.trim()) return value.trim();
  }
  return null;
}

function titleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
  return match?.[1] ? decodeHtml(match[1]).trim() || null : null;
}

function base(url: URL): UrlMetadata {
  return {
    url: url.toString(),
    platform: platformOf(url.hostname),
    provider: "platform_only",
    title: null,
    description: null,
    author: null,
    publisher: null,
    thumbnailUrl: null,
    hashtags: [],
    degraded: true,
  };
}

/** The eleven-character id, from every YouTube URL shape people actually paste. */
export function youtubeVideoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const id =
    host === "youtu.be"
      ? url.pathname.slice(1).split("/")[0]
      : (url.searchParams.get("v") ??
        url.pathname.match(/\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1] ??
        null);
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal,
    headers: { accept: "application/json" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`upstream ${response.status}`);
  return response.json();
}

/**
 * TikTok's official oEmbed. Public, documented, no key: title, author and thumbnail for
 * any public video. Private or deleted videos answer 4xx and we fall through.
 */
async function fromTikTok(url: URL, signal: AbortSignal): Promise<UrlMetadata | null> {
  const payload = (await fetchJson(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`,
    signal,
  )) as {
    title?: unknown;
    author_name?: unknown;
    thumbnail_url?: unknown;
    provider_name?: unknown;
  };
  const title = typeof payload.title === "string" ? payload.title : null;
  if (!title && typeof payload.author_name !== "string") return null;

  return {
    ...base(url),
    provider: "tiktok_oembed",
    // A TikTok caption is the description as much as the title; it is one field upstream.
    title,
    description: title,
    author: typeof payload.author_name === "string" ? payload.author_name : null,
    publisher: typeof payload.provider_name === "string" ? payload.provider_name : "TikTok",
    thumbnailUrl: typeof payload.thumbnail_url === "string" ? payload.thumbnail_url : null,
    hashtags: hashtagsIn(title),
    degraded: false,
  };
}

/** YouTube Data API v3 `videos.list`. Only when a key is configured. */
async function fromYouTube(
  url: URL,
  apiKey: string,
  signal: AbortSignal,
): Promise<UrlMetadata | null> {
  const id = youtubeVideoId(url);
  if (!id) return null;

  const payload = (await fetchJson(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${encodeURIComponent(apiKey)}`,
    signal,
  )) as {
    items?: {
      snippet?: {
        title?: string;
        description?: string;
        channelTitle?: string;
        thumbnails?: Record<string, { url?: string }>;
      };
    }[];
  };

  const snippet = payload.items?.[0]?.snippet;
  if (!snippet?.title) return null;

  const thumbnails = snippet.thumbnails ?? {};
  const thumbnailUrl =
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    null;

  const description = snippet.description?.slice(0, 1200) ?? null;
  return {
    ...base(url),
    provider: "youtube_api",
    title: snippet.title,
    description,
    author: snippet.channelTitle ?? null,
    publisher: "YouTube",
    thumbnailUrl,
    hashtags: hashtagsIn(`${snippet.title} ${description ?? ""}`),
    degraded: false,
  };
}

/**
 * Who we say we are when reading a page.
 *
 * Two identities, because the web is split on this. The social platforms serve their
 * OpenGraph tags to `facebookexternalhit` and an empty JavaScript shell to everyone else.
 * Plenty of ordinary sites do the opposite and refuse a UA that claims to be someone
 * else's crawler — Wikipedia answers it with a flat 403.
 *
 * So we try the identity most likely to work for the host first, then the other one.
 * Two bounded requests at worst, and one for almost every real link.
 */
const CRAWLER_UA = "facebookexternalhit/1.1";
const BROWSER_UA =
  "Mozilla/5.0 (compatible; KhotwaBot/1.0; +https://khotwa.ma/bot) AppleWebKit/537.36";

/** Hard ceiling on how much of a page we will read looking for its `<head>`. */
const MAX_HEAD_BYTES = 2 * 1024 * 1024;

/**
 * Reads a page only as far as `</head>`, then stops and drops the connection.
 *
 * A flat byte cap was the obvious way to bound this and it was wrong: YouTube's head
 * alone runs past 256 KB of inline script, so its perfectly ordinary `og:title` sat just
 * beyond the cut and every YouTube link came back empty. Streaming to the end of the head
 * finds the tags wherever they are while still never reading a whole 1.8 MB page.
 */
async function readHead(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return (await response.text()).slice(0, MAX_HEAD_BYTES);

  const decoder = new TextDecoder();
  let html = "";
  let bytes = 0;
  try {
    while (bytes < MAX_HEAD_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (html.includes("</head>")) break;
    }
  } finally {
    // We asked for a page and read a head; let the socket go rather than drain it.
    void reader.cancel().catch(() => {});
  }
  return html;
}

/** Reads one page and pulls its metadata out, or null if there is none worth having. */
async function readMetadata(
  url: URL,
  userAgent: string,
  signal: AbortSignal,
): Promise<UrlMetadata | null> {
  const response = await guardedFetch(url, {
    signal,
    headers: { "user-agent": userAgent, accept: "text/html" },
  });
  if (!response || !response.ok) return null;

  const html = await readHead(response);
  const title = firstMeta(html, ["og:title", "twitter:title"]) ?? titleTag(html);
  const description = firstMeta(html, ["og:description", "twitter:description", "description"]);
  if (!title && !description) return null;

  return {
    ...base(url),
    provider: "opengraph",
    title,
    description,
    author: firstMeta(html, ["article:author", "twitter:creator", "author"]),
    publisher: firstMeta(html, ["og:site_name", "application-name"]),
    thumbnailUrl: firstMeta(html, ["og:image", "og:image:secure_url", "twitter:image"]),
    hashtags: hashtagsIn(description),
    degraded: false,
  };
}

/** The page's own OpenGraph tags, under whichever identity the host will talk to. */
async function fromOpenGraph(url: URL, signal: AbortSignal): Promise<UrlMetadata | null> {
  const social = platformOf(url.hostname) !== "other";
  const agents = social ? [CRAWLER_UA, BROWSER_UA] : [BROWSER_UA, CRAWLER_UA];

  for (const agent of agents) {
    const metadata = await attempt(() => readMetadata(url, agent, signal));
    if (metadata) return metadata;
  }
  return null;
}

async function attempt(task: () => Promise<UrlMetadata | null>): Promise<UrlMetadata | null> {
  try {
    return await task();
  } catch {
    return null;
  }
}

export interface UrlExtractionOptions {
  signal?: AbortSignal;
  /** YouTube Data API key. Absent means the YouTube branch degrades to OpenGraph. */
  youtubeApiKey?: string;
}

/**
 * Run the chain. Always resolves — never throws, never rejects a trip.
 *
 * An unparseable string comes back as `provider: "invalid_url"`, which is the caller's
 * cue to ask rather than to guess.
 */
export async function extractUrlMetadata(
  raw: string,
  options: UrlExtractionOptions = {},
): Promise<UrlMetadata> {
  const url = parseUrl(raw);
  if (!url) {
    return {
      url: raw.trim(),
      platform: "other",
      provider: "invalid_url",
      title: null,
      description: null,
      author: null,
      publisher: null,
      thumbnailUrl: null,
      hashtags: [],
      degraded: true,
    };
  }

  const signal = options.signal ?? boundedSignal(TIMEOUTS.socialContextMs);
  const platform = platformOf(url.hostname);

  if (platform === "tiktok") {
    const tiktok = await attempt(() => fromTikTok(url, signal));
    if (tiktok) return tiktok;
  }

  if (platform === "youtube" && options.youtubeApiKey) {
    const youtube = await attempt(() => fromYouTube(url, options.youtubeApiKey!, signal));
    if (youtube) return youtube;
  }

  const opengraph = await attempt(() => fromOpenGraph(url, signal));
  if (opengraph) return opengraph;

  // Silent by contract: we still know the platform and the URL the traveller pasted.
  return base(url);
}

/**
 * A link's thumbnail, ready to hand to the multimodal provider.
 *
 * This is how a TikTok URL becomes a *visual* signal and not just a caption: oEmbed gives
 * a thumbnail, the thumbnail goes to the image analyser, and the analyser's answer grounds
 * against the curated dataset like any screenshot would.
 *
 * Bounded, size-capped and MIME-checked against the same UPLOAD limits a browser upload
 * faces — a thumbnail URL is untrusted input like any other. Returns null on anything
 * unexpected, and null simply means "continue with the text metadata".
 */
export async function fetchRemoteImage(
  url: string | null | undefined,
  signal?: AbortSignal,
): Promise<ImageInput | null> {
  const parsed = url ? parseUrl(url) : null;
  if (!parsed || parsed.protocol !== "https:") return null;

  try {
    const response = await guardedFetch(parsed, {
      signal: signal ?? boundedSignal(TIMEOUTS.socialContextMs),
      headers: { accept: "image/*" },
    });
    if (!response || !response.ok) return null;

    const mimeType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    const accepted: readonly string[] = UPLOAD.acceptedMimeTypes;
    if (!accepted.includes(mimeType)) return null;

    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > UPLOAD.maxBytes) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > UPLOAD.maxBytes) return null;

    return { base64: Buffer.from(bytes).toString("base64"), mimeType };
  } catch {
    return null;
  }
}
