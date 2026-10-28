/**
 * The gate in front of /api. Two jobs, both of which only matter once this is on a URL
 * somebody else can reach.
 *
 *   1. Rate limiting. Every model route here is unauthenticated and spends real money per
 *      call: /api/chat forwards up to 20 turns of attacker-controlled text to OpenAI,
 *      /api/curate sends the whole catalogue, /api/analyze sends an uploaded photo to a
 *      vision model. On localhost that is a demo. On a public URL with no gate it is an
 *      open LLM proxy on the project's billing.
 *
 *   2. Turning the developer laboratories off in production — see @/config/diagnostics.
 *
 * `proxy.ts`, not `middleware.ts`: the convention was renamed in Next.js 16 and the old
 * name is deprecated. It runs on the Node.js runtime by default in this version, which is
 * what makes the counter below possible at all.
 *
 * WHAT THIS IS NOT. The counter lives in the memory of one server instance. Vercel will
 * happily run several, and each keeps its own tally, so the real ceiling is the limit
 * times the number of warm instances, and it resets whenever one is recycled. That is a
 * best-effort brake on a script, not a quota system. A real one needs a shared store
 * (Upstash, Redis) and is the right next step if this ever outlives the demo — but the
 * gap between "no limit at all" and "this" is the whole of the exposure, and the gap
 * between "this" and a perfect one is a rounding error on a hackathon budget.
 */
import { NextResponse, type NextRequest } from "next/server";
import { diagnosticsEnabled, isDiagnosticPath } from "@/config/diagnostics";
import { SITES } from "@/features/benna/sites";

const WINDOW_MS = 10 * 60_000;

/**
 * Two tiers, because the routes are not equally expensive.
 *
 * `model` is anything that reaches a paid provider. 60 per ten minutes is deliberately
 * generous: a whole trip build costs two model calls, so a jury room sharing one NAT'd
 * address still gets around twenty-five days out of it before anyone notices a limit.
 * A script hits it in seconds.
 *
 * `standard` covers /api/route and /api/weather, which call free public services.
 */
const LIMIT = { model: 60, standard: 300 } as const;

/** Routes that cost money per request. */
const MODEL_ROUTES = [
  "/api/analyze",
  "/api/chat",
  "/api/curate",
  "/api/extract",
  "/api/transcribe",
  /* BENNA M3AK, the assistant, the invite writer and the voice route all reach a model. */
  "/api/benna",
  /* The laboratories are off in production, but when they are deliberately switched on
     they are the most expensive surface in the app — one of them races every speech
     engine on a single clip. */
  "/api/test-ai",
  "/api/test-openai",
] as const;

function tierOf(pathname: string): keyof typeof LIMIT {
  return MODEL_ROUTES.some((route) => pathname.startsWith(route)) ? "model" : "standard";
}

/**
 * Who is asking.
 *
 * `x-forwarded-for` is set by Vercel and by every reverse proxy worth the name; its first
 * entry is the client. Everything falls back to one shared bucket, which is the safe
 * direction to be wrong in — an unidentifiable caller gets rationed with the others rather
 * than exempted.
 */
function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** key → hit timestamps inside the current window. */
const hits = new Map<string, number[]>();

/**
 * Bound on distinct keys held at once. A flood from spoofed `x-forwarded-for` values must
 * not turn the brake into the memory leak that takes the instance down — which would be a
 * denial of service we built ourselves.
 */
const MAX_TRACKED_KEYS = 5_000;

function prune(now: number): void {
  for (const [key, times] of hits) {
    const live = times.filter((at) => now - at < WINDOW_MS);
    if (live.length === 0) hits.delete(key);
    else hits.set(key, live);
  }
}

/** Records a hit. Returns null when allowed, or the seconds to wait when not. */
function rateLimit(key: string, limit: number): number | null {
  const now = Date.now();

  /* Cheap amortised cleanup: sweep when the map is getting large rather than on every
     request. */
  if (hits.size > MAX_TRACKED_KEYS) {
    prune(now);
    if (hits.size > MAX_TRACKED_KEYS) hits.clear();
  }

  const times = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (times.length >= limit) {
    const oldest = times[0];
    hits.set(key, times);
    return Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
  }

  times.push(now);
  hits.set(key, times);
  return null;
}

/**
 * The dev server is reachable by anyone on the same Wi-Fi (that is how the phone opens it).
 * With BENNA_DEV_PASS set, only devices that opened `?pass=<value>` once get in; the pass is
 * then kept in an httpOnly cookie for 30 days. A secret, not an IP list: Next fills
 * x-forwarded-for only when the caller did not send one, so an address can be faked.
 * Applies to any build where the pass is set: the dev server, a production build on this Mac,
 * the full app deployed for the demo. Never to the jury deployment (scope=jury): the QR path
 * must open for anyone who scans it.
 */
const DEV_COOKIE = "benna_dev_pass";

function devGate(request: NextRequest): NextResponse | null {
  const pass = process.env.BENNA_DEV_PASS;
  if (!pass || process.env.NEXT_PUBLIC_BENNA_SCOPE === "jury") return null;
  if (request.cookies.get(DEV_COOKIE)?.value === pass) return null;

  if (request.nextUrl.searchParams.get("pass") === pass) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("pass");
    const response = NextResponse.redirect(clean);
    response.cookies.set(DEV_COOKIE, pass, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "private" }, { status: 403 });
  }
  return new NextResponse(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BENNA</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#a8060f;color:#fff4e6;font:600 18px system-ui;text-align:center"><p>BENNA · accès privé</p></body>',
    { status: 403, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

/**
 * NEXT_PUBLIC_BENNA_SCOPE=jury publishes only the QR order path (a site page, the cart, the order)
 * and sends everything else — the menu and the rest of the app included — back to /casanearshore. The only /api
 * left open is /api/live (relays a first name and dishes to /live); nothing public can reach a model.
 */
function juryScope(request: NextRequest): NextResponse | null {
  if (process.env.NEXT_PUBLIC_BENNA_SCOPE !== "jury") return null;
  const { pathname } = request.nextUrl;
  const open =
    Object.hasOwn(SITES, pathname.slice(1)) ||
    pathname === "/panier" ||
    pathname.startsWith("/commande/") ||
    // The presenter's board (token-guarded) and the relay feeding it — no model behind either.
    pathname === "/live" ||
    pathname === "/api/live";
  if (open) return null;
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.redirect(new URL("/casanearshore", request.url));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const gate = devGate(request);
  if (gate) return gate;

  const scope = juryScope(request);
  if (scope) return scope;

  try {
    /* The laboratories, when they are switched off. The pages return the app's own
       not-found through their layouts; only the routes are answered here, and as JSON,
       because that is what their callers parse. */
    if (isDiagnosticPath(pathname) && !diagnosticsEnabled()) {
      if (!pathname.startsWith("/api/")) return NextResponse.next();
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (!pathname.startsWith("/api/")) return NextResponse.next();

    const tier = tierOf(pathname);
    const retryAfter = rateLimit(`${tier}:${clientKey(request)}`, LIMIT[tier]);
    if (retryAfter === null) return NextResponse.next();

    /*
     * 429 rather than a quiet 200, and every caller already copes: the client treats a
     * non-ok answer from any of these exactly as it treats a timeout — an empty draft, an
     * uncurated day, "the guide is unavailable". Nothing dead-ends, which is the contract
     * the whole app is written to.
     */
    return NextResponse.json(
      { ok: false, degraded: true, reason: "rate_limited" },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  } catch {
    /* Fail open. A bug in the brake must never be the reason a day cannot be built. */
    return NextResponse.next();
  }
}

export const config = {
  /* Every page and route (the dev gate), minus static files. The rate limit and the
     laboratory switch still only act on /api and the test pages, as before. */
  matcher: ["/((?!_next/static|_next/image|images/|icons/|fonts/|favicon.ico|manifest.webmanifest).*)"],
};
