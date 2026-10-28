#!/usr/bin/env python3
"""
Generates the temporary art-directed placeholders as real .webp files at their final
paths, so replacing one with a photograph is a file drop and never a code change.

Each asset is a deep token-coloured field carrying the zellige/khatim geometry already
used in src/components/ornament.tsx, under a pointed-arch light wash. No text: the card
prints the name itself, and a lettered placeholder would have to be removed later.


Usage:  python3 scripts/generate-placeholders.py
Needs:  Google Chrome (headless renderer) and cwebp (`brew install webp`).

Replacing a placeholder with a real photograph is a file drop at the same path — this
script is only for regenerating or restyling the temporary set.
"""

import subprocess, pathlib, shutil, sys, tempfile

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = pathlib.Path(__file__).resolve().parent.parent / "public" / "images"
TMP = pathlib.Path(tempfile.gettempdir()) / "siyaha-placeholders"

# Token palette from src/app/globals.css — placeholders must sit inside the design system.
ATLANTIC   = ("#0e3c56", "#2b7ba3")
ATLANTIC_D = ("#0a2c40", "#17506e")
TERRACOTTA = ("#8f3f27", "#d1774f")
TERRA_WARM = ("#a84a2c", "#e09268")
GREEN      = ("#1f4438", "#4a8a72")
GREEN_D    = ("#16332a", "#2f5d4e")

# (subdir, filename, width, height, palette, motif scale, rotation)
ASSETS = [
    ("poi", "habous",            1200, 1500, TERRACOTTA, 92,  0),
    ("poi", "marche-central",    1200, 1500, GREEN,      78, 15),
    ("poi", "sacre-coeur",       1200, 1500, ATLANTIC,  104,  0),
    ("poi", "hassan-ii",         1200, 1500, ATLANTIC_D, 86, 22),

    ("vibes", "culture",          900, 1125, TERRACOTTA, 70,  0),
    ("vibes", "food",             900, 1125, TERRA_WARM, 60, 18),
    ("vibes", "coast",            900, 1125, ATLANTIC,   82,  0),
    ("vibes", "hidden-gems",      900, 1125, GREEN,      54, 30),
    ("vibes", "art",              900, 1125, ATLANTIC_D, 66, 12),
    ("vibes", "adventure",        900, 1125, GREEN_D,    74, 24),

    ("popular", "culture-casablanca", 1200, 750, ATLANTIC,   80,  0),
    ("popular", "atlantic-escape",    1200, 750, ATLANTIC_D, 68, 20),
    ("popular", "local-food-trail",   1200, 750, TERRA_WARM, 72, 10),
]

HTML = """<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{{margin:0;padding:0;width:{w}px;height:{h}px;overflow:hidden}}
  svg{{display:block}}
</style></head><body>
<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="{dark}"/>
      <stop offset="1" stop-color="{light}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.28" r="0.75">
      <stop offset="0" stop-color="#fbf7f0" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#fbf7f0" stop-opacity="0"/>
    </radialGradient>
    <!-- khatim: the eight-point star, drawn as two squares -->
    <pattern id="khatim" width="{s}" height="{s}" patternUnits="userSpaceOnUse"
             patternTransform="rotate({rot} {hs} {hs})">
      <rect x="{q}" y="{q}" width="{half}" height="{half}"
            fill="none" stroke="#fbf7f0" stroke-opacity="0.24" stroke-width="2.2"/>
      <rect x="{q}" y="{q}" width="{half}" height="{half}"
            fill="none" stroke="#fbf7f0" stroke-opacity="0.24" stroke-width="2.2"
            transform="rotate(45 {hs} {hs})"/>
      <circle cx="{hs}" cy="{hs}" r="{r}" fill="#fbf7f0" fill-opacity="0.13"/>
      <circle cx="{hs}" cy="{hs}" r="{r2}" fill="none" stroke="#fbf7f0"
              stroke-opacity="0.16" stroke-width="1.2"/>
    </pattern>
    <!-- the pointed arch that frames imagery across the product -->
    <clipPath id="arch">
      <path d="{archd} Z"/>
    </clipPath>
  </defs>

  <rect width="{w}" height="{h}" fill="url(#ground)"/>
  <rect width="{w}" height="{h}" fill="url(#khatim)"/>
  <g clip-path="url(#arch)">
    <rect width="{w}" height="{h}" fill="#fbf7f0" fill-opacity="0.07"/>
    <rect width="{w}" height="{h}" fill="url(#khatim)" opacity="0.9"/>
  </g>
  <rect width="{w}" height="{h}" fill="url(#glow)"/>
  <path d="{archd}" fill="none" stroke="#fbf7f0" stroke-opacity="0.34" stroke-width="3"/>
</svg></body></html>"""


def build(subdir, name, w, h, palette, scale, rot):
    dark, light = palette
    # Equilateral pointed arch: two circular arcs of radius = span, struck from the
    # opposite impost. Sized off the height so a 16:10 row keeps its point on-canvas.
    aw = min(h * 0.45, w * 0.62)
    ax = (w - aw) / 2
    ax2 = ax + aw
    abase = h * 0.92
    atip = h * 0.10
    aspring = atip + 0.866 * aw
    acx = w / 2

    archd = (
        f"M{ax:.1f} {abase:.1f} L{ax:.1f} {aspring:.1f} "
        f"A{aw:.1f} {aw:.1f} 0 0 1 {acx:.1f} {atip:.1f} "
        f"A{aw:.1f} {aw:.1f} 0 0 1 {ax2:.1f} {aspring:.1f} L{ax2:.1f} {abase:.1f}"
    )

    html = HTML.format(
        w=w, h=h, dark=dark, light=light, s=scale, hs=scale / 2, q=scale * 0.16,
        half=scale * 0.68, r=scale * 0.10, r2=scale * 0.30, rot=rot,
        archd=archd,
    )

    TMP.mkdir(parents=True, exist_ok=True)
    page = TMP / f"{subdir}-{name}.html"
    page.write_text(html)
    png = TMP / f"{subdir}-{name}.png"

    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
         f"--window-size={w},{h}", "--default-background-color=00000000",
         f"--screenshot={png}", f"file://{page}"],
        capture_output=True, check=True,
    )
    if not png.exists():
        raise RuntimeError(f"chrome produced no png for {name}")

    out = ROOT / subdir / f"{name}.webp"
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cwebp", "-q", "82", "-quiet", str(png), "-o", str(out)], check=True)
    return out, out.stat().st_size


if not pathlib.Path(CHROME).exists() or not shutil.which("cwebp"):
    sys.exit("need Chrome and cwebp")

total = 0
for spec in ASSETS:
    path, size = build(*spec)
    total += size
    print(f"  {path.relative_to(ROOT.parent.parent)}  {size // 1024} KB")
print(f"\n{len(ASSETS)} files, {total // 1024} KB total")
