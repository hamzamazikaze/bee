/**
 * The URL provider chain, with the network stubbed.
 *
 * Every branch has to degrade rather than throw, because a pasted link is enrichment and
 * a dead platform must never cost the traveller their trip.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractUrlMetadata,
  fetchRemoteImage,
  parseUrl,
  platformOf,
  youtubeVideoId,
} from "@/lib/ai/url";

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** Replaces global fetch for one test and restores it afterwards. */
function stubFetch(handler: Handler) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init);
  }));
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html" } });

afterEach(() => vi.unstubAllGlobals());

describe("URL parsing", () => {
  it("accepts what people actually paste", () => {
    expect(parseUrl("https://www.tiktok.com/@a/video/1")?.hostname).toBe("www.tiktok.com");
    expect(parseUrl("tiktok.com/@a/video/1")?.protocol).toBe("https:");
    expect(parseUrl("  https://youtu.be/abc  ")?.hostname).toBe("youtu.be");
  });

  it("rejects what is not a link", () => {
    expect(parseUrl("")).toBeNull();
    expect(parseUrl("not a url")).toBeNull();
    expect(parseUrl("javascript:alert(1)")).toBeNull();
    expect(parseUrl("mailto:someone@example.com")).toBeNull();
  });

  it("names the platform", () => {
    expect(platformOf("www.tiktok.com")).toBe("tiktok");
    expect(platformOf("youtu.be")).toBe("youtube");
    expect(platformOf("instagr.am")).toBe("instagram");
    expect(platformOf("fb.watch")).toBe("facebook");
    expect(platformOf("visitcasablanca.ma")).toBe("other");
  });

  it("finds the video id in every YouTube URL shape", () => {
    const id = (raw: string) => youtubeVideoId(new URL(raw));
    expect(id("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(id("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(id("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(id("https://www.youtube.com/embed/dQw4w9WgXcQ?start=3")).toBe("dQw4w9WgXcQ");
    expect(id("https://www.youtube.com/results?search_query=casablanca")).toBeNull();
  });
});

describe("TIKTOK — the official oEmbed endpoint", () => {
  it("reads title, author and thumbnail without scraping", async () => {
    stubFetch((url) => {
      expect(url).toContain("tiktok.com/oembed");
      return json({
        title: "Half a day in Casablanca #morocco #travel",
        author_name: "traveller",
        thumbnail_url: "https://p16.tiktokcdn.com/thumb.jpg",
        provider_name: "TikTok",
      });
    });

    const metadata = await extractUrlMetadata("https://www.tiktok.com/@traveller/video/123");

    expect(metadata.provider).toBe("tiktok_oembed");
    expect(metadata.platform).toBe("tiktok");
    expect(metadata.title).toContain("Casablanca");
    expect(metadata.author).toBe("traveller");
    expect(metadata.thumbnailUrl).toBe("https://p16.tiktokcdn.com/thumb.jpg");
    expect(metadata.hashtags).toEqual(["morocco", "travel"]);
    expect(metadata.degraded).toBe(false);
  });

  it("falls through to OpenGraph when the video is private or gone", async () => {
    stubFetch((url) =>
      url.includes("oembed")
        ? new Response("", { status: 403 })
        : html('<meta property="og:title" content="TikTok" />'),
    );

    const metadata = await extractUrlMetadata("https://www.tiktok.com/@a/video/1");
    expect(metadata.provider).toBe("opengraph");
    expect(metadata.platform).toBe("tiktok");
  });
});

describe("YOUTUBE — the Data API when a key exists, OpenGraph when it does not", () => {
  const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

  it("uses videos.list and takes the best thumbnail", async () => {
    stubFetch((url) => {
      expect(url).toContain("youtube/v3/videos");
      expect(url).toContain("key=test-key");
      return json({
        items: [
          {
            snippet: {
              title: "48 hours in El Jadida",
              description: "The Portuguese cistern, the ramparts, and where to eat.",
              channelTitle: "Morocco Walks",
              thumbnails: {
                default: { url: "https://i.ytimg.com/default.jpg" },
                maxres: { url: "https://i.ytimg.com/maxres.jpg" },
              },
            },
          },
        ],
      });
    });

    const metadata = await extractUrlMetadata(videoUrl, { youtubeApiKey: "test-key" });

    expect(metadata.provider).toBe("youtube_api");
    expect(metadata.title).toBe("48 hours in El Jadida");
    expect(metadata.author).toBe("Morocco Walks");
    expect(metadata.thumbnailUrl).toBe("https://i.ytimg.com/maxres.jpg");
    expect(metadata.publisher).toBe("YouTube");
  });

  it("never calls the API without a key, and reads the page instead", async () => {
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      return html('<meta property="og:title" content="48 hours in El Jadida" />');
    });

    const metadata = await extractUrlMetadata(videoUrl);

    expect(seen.some((url) => url.includes("googleapis"))).toBe(false);
    expect(metadata.provider).toBe("opengraph");
    expect(metadata.title).toBe("48 hours in El Jadida");
  });

  it("falls back when the key is rejected or the video is missing", async () => {
    stubFetch((url) =>
      url.includes("googleapis")
        ? new Response("forbidden", { status: 403 })
        : html("<title>Some video</title>"),
    );

    const metadata = await extractUrlMetadata(videoUrl, { youtubeApiKey: "bad-key" });
    expect(metadata.provider).toBe("opengraph");
    expect(metadata.title).toBe("Some video");
  });
});

describe("GENERIC — OpenGraph, then the twitter card, then the title tag", () => {
  it("reads the tags a normal page carries", async () => {
    stubFetch(() =>
      html(`
        <meta property="og:title" content="Oualidia lagoon guide" />
        <meta property="og:description" content="Oysters, birds and a calm lagoon." />
        <meta property="og:image" content="https://example.ma/lagoon.jpg" />
        <meta property="og:site_name" content="Visit Casablanca-Settat" />
        <meta name="author" content="Karima" />
      `),
    );

    const metadata = await extractUrlMetadata("https://example.ma/oualidia");

    expect(metadata.provider).toBe("opengraph");
    expect(metadata.platform).toBe("other");
    expect(metadata.title).toBe("Oualidia lagoon guide");
    expect(metadata.description).toContain("Oysters");
    expect(metadata.thumbnailUrl).toBe("https://example.ma/lagoon.jpg");
    expect(metadata.publisher).toBe("Visit Casablanca-Settat");
    expect(metadata.author).toBe("Karima");
  });

  it("handles attributes in either order and decodes entities", async () => {
    stubFetch(() =>
      html('<meta content="Rick&#39;s Caf&amp;eacute;" property="og:title" /><meta property="og:description" content="d" />'),
    );
    const metadata = await extractUrlMetadata("https://example.ma/x");
    expect(metadata.title).toBe("Rick's Caf&eacute;");
  });

  it("falls back to twitter tags and then to <title>", async () => {
    stubFetch(() => html('<title>Plage de Mohammedia</title>'));
    const metadata = await extractUrlMetadata("https://example.ma/plage");
    expect(metadata.title).toBe("Plage de Mohammedia");
  });
});

describe("failure is never a rejection", () => {
  it("marks an unparseable string rather than throwing", async () => {
    const metadata = await extractUrlMetadata("not a link at all");
    expect(metadata.provider).toBe("invalid_url");
    expect(metadata.degraded).toBe(true);
    expect(metadata.title).toBeNull();
  });

  it("returns the platform and the URL when every provider fails", async () => {
    stubFetch(() => new Response("nope", { status: 500 }));
    const metadata = await extractUrlMetadata("https://www.tiktok.com/@a/video/1");

    expect(metadata.provider).toBe("platform_only");
    expect(metadata.platform).toBe("tiktok");
    expect(metadata.url).toBe("https://www.tiktok.com/@a/video/1");
    expect(metadata.degraded).toBe(true);
  });

  it("survives a timeout the same way", async () => {
    stubFetch(() => {
      throw Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" });
    });
    const metadata = await extractUrlMetadata("https://example.ma/slow");
    expect(metadata.provider).toBe("platform_only");
    expect(metadata.degraded).toBe(true);
  });

  it("survives a page that is valid HTML but carries no metadata", async () => {
    stubFetch(() => html("<html><body><p>hello</p></body></html>"));
    const metadata = await extractUrlMetadata("https://example.ma/bare");
    expect(metadata.provider).toBe("platform_only");
  });
});

describe("thumbnail fetching is an upload boundary like any other", () => {
  it("returns base64 for a real image", async () => {
    stubFetch(
      () =>
        new Response(new Uint8Array([1, 2, 3, 4]), {
          headers: { "content-type": "image/jpeg" },
        }),
    );
    const image = await fetchRemoteImage("https://i.ytimg.com/maxres.jpg");
    expect(image?.mimeType).toBe("image/jpeg");
    expect(image?.base64).toBe(Buffer.from([1, 2, 3, 4]).toString("base64"));
  });

  it("refuses anything that is not an accepted image type", async () => {
    stubFetch(
      () => new Response("<html>", { headers: { "content-type": "text/html" } }),
    );
    expect(await fetchRemoteImage("https://example.ma/not-an-image")).toBeNull();
  });

  it("refuses an oversized payload before reading it", async () => {
    stubFetch(
      () =>
        new Response(new Uint8Array([1]), {
          headers: { "content-type": "image/png", "content-length": String(50 * 1024 * 1024) },
        }),
    );
    expect(await fetchRemoteImage("https://example.ma/huge.png")).toBeNull();
  });

  it("refuses a plain-http or malformed thumbnail URL", async () => {
    stubFetch(() => new Response(new Uint8Array([1]), { headers: { "content-type": "image/png" } }));
    expect(await fetchRemoteImage("http://example.ma/insecure.png")).toBeNull();
    expect(await fetchRemoteImage("nonsense")).toBeNull();
    expect(await fetchRemoteImage(null)).toBeNull();
  });

  it("returns null instead of throwing when the CDN is down", async () => {
    stubFetch(() => {
      throw new Error("ECONNRESET");
    });
    expect(await fetchRemoteImage("https://example.ma/thumb.jpg")).toBeNull();
  });
});

/**
 * SSRF. A pasted link is untrusted input that this server then requests from inside its
 * own network, handing two fields of the answer back to whoever pasted it. On a laptop
 * that reaches the LAN; on a deployment it reaches the cloud metadata service.
 *
 * These are the tests that must not be allowed to go green by accident, so each asserts
 * the *refusal* rather than a shape.
 */
describe("private hosts are never fetched on a stranger's behalf", () => {
  const BLOCKED = [
    "http://127.0.0.1/admin",
    "http://127.1.2.3/",
    "http://10.0.0.5/",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://100.64.0.1/",
    "http://0.0.0.0/",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://[::1]:3000/",
    "http://[fc00::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:169.254.169.254]/",
    "http://printer.local/",
    "http://db.internal/",
    "http://app.localhost/",
  ];

  it.each(BLOCKED)("refuses %s", (raw) => {
    expect(parseUrl(raw)).toBeNull();
  });

  /* WHATWG URL canonicalises every obfuscated spelling before we see it, which is why
     matching the dotted quad is enough — but only if that assumption keeps holding. */
  it.each([
    ["octal", "http://0177.0.0.1/"],
    ["hex", "http://0x7f.1/"],
    ["decimal", "http://2130706433/"],
  ])("refuses loopback written in %s", (_form, raw) => {
    expect(parseUrl(raw)).toBeNull();
  });

  it("still accepts the ordinary public links the product exists for", () => {
    for (const raw of [
      "https://www.tiktok.com/@someone/video/123",
      "https://youtu.be/dQw4w9WgXcQ",
      "tiktok.com/@a/video/1",
      "https://en.wikipedia.org/wiki/Casablanca",
      "https://172.32.0.1/",
      "https://11.0.0.1/",
    ]) {
      expect(parseUrl(raw), raw).not.toBeNull();
    }
  });

  it("answers a blocked link the same way it answers any unusable one", async () => {
    const metadata = await extractUrlMetadata("http://169.254.169.254/latest/meta-data/");
    expect(metadata.provider).toBe("invalid_url");
    expect(metadata.degraded).toBe(true);
    expect(metadata.title).toBeNull();
  });

  it("declines a thumbnail hosted on a private address", async () => {
    stubFetch(() => new Response("", { status: 200, headers: { "content-type": "image/png" } }));
    expect(await fetchRemoteImage("https://192.168.0.10/logo.png")).toBeNull();
  });

  /*
   * The half that a blocklist on the pasted URL alone does not cover: a host we are happy
   * to read can simply answer "302 Location: http://169.254.169.254/".
   */
  it("does not follow a public page's redirect into a private address", async () => {
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      if (url.includes("evil.example")) {
        return new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
        });
      }
      return new Response("<html><head><meta property=\"og:title\" content=\"leaked\"></head>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    });

    const metadata = await extractUrlMetadata("https://evil.example/redirect");
    expect(seen.some((url) => url.includes("169.254.169.254"))).toBe(false);
    expect(metadata.title).toBeNull();
    expect(metadata.degraded).toBe(true);
  });

  it("still follows an ordinary redirect between public hosts", async () => {
    stubFetch((url) => {
      if (url.includes("/short")) {
        return new Response(null, { status: 301, headers: { location: "https://real.example/full" } });
      }
      return new Response("<html><head><meta property=\"og:title\" content=\"Arrived\"></head>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    });

    const metadata = await extractUrlMetadata("https://short.example/short");
    expect(metadata.title).toBe("Arrived");
  });

  it("gives up rather than looping on a redirect chain that never lands", async () => {
    let hops = 0;
    stubFetch(() => {
      hops += 1;
      return new Response(null, {
        status: 302,
        headers: { location: `https://loop.example/${hops}` },
      });
    });

    const metadata = await extractUrlMetadata("https://loop.example/start");
    expect(hops).toBeLessThanOrEqual(8); // two user-agent attempts x the hop ceiling
    expect(metadata.provider).toBe("platform_only");
  });
});
