#!/usr/bin/env python3
"""
Real photography for the POI cards, sourced from Wikimedia Commons.

Three phases, each a separate subcommand so selection stays a human/visual step
rather than "take result #1":

  search   query the Commons API for every target, write candidates.json
  sheets   build a numbered contact sheet per target so candidates can be eyeballed
  build    download the chosen originals, crop 4:5, encode WebP, write the manifest

Nothing here touches product code: it only writes public/images/poi/*.webp and the
two source-manifest files next to them.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "SiyahaHackathon/1.0 (https://github.com/; naitamin33@gmail.com) python-urllib"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Per-target search plans. Several variants per subject: English, French, historical
# and transliterated names, plus the Commons category when one is known to exist.
TARGETS = {
    "place-mohammed-v": {
        "subject": "Place Mohammed V, Casablanca",
        "queries": ["Place Mohammed V Casablanca", "Mohammed V Square Casablanca",
                    "Place des Nations Unies Casablanca fountain", "Casablanca wilaya place"],
        "cats": ["Place Mohammed V (Casablanca)"],
    },
    "boulevard-mohammed-v": {
        "subject": "Boulevard Mohammed V, Casablanca (Art Deco)",
        "queries": ["Boulevard Mohammed V Casablanca", "Art Deco Casablanca architecture",
                    "Casablanca art déco immeuble", "Casablanca Mauresque architecture"],
        "cats": ["Boulevard Mohammed V (Casablanca)", "Art Deco architecture in Casablanca"],
    },
    "cinema-rialto": {
        "subject": "Cinéma Rialto, Casablanca",
        "queries": ["Cinema Rialto Casablanca", "Rialto Casablanca", "Cinéma Rialto"],
        "cats": ["Cinéma Rialto"],
    },
    "villa-des-arts": {
        "subject": "Villa des Arts, Casablanca",
        "queries": ["Villa des Arts Casablanca", "Villa des Arts Maroc", "Villa des Arts"],
        "cats": ["Villa des Arts (Casablanca)"],
    },
    "fondation-abderrahman-slaoui": {
        "subject": "Fondation Abderrahman Slaoui, Casablanca",
        "queries": ["Fondation Abderrahman Slaoui", "Musee Abderrahman Slaoui Casablanca",
                    "Abderrahman Slaoui"],
        "cats": ["Musée de la Fondation Abderrahman Slaoui"],
    },
    "musee-du-judaisme-marocain": {
        "subject": "Musée du Judaïsme Marocain, Casablanca",
        "queries": ["Museum of Moroccan Judaism", "Musee du judaisme marocain Casablanca",
                    "Moroccan Jewish Museum Casablanca", "synagogue Casablanca"],
        "cats": ["Museum of Moroccan Judaism"],
    },
    "parc-ligue-arabe": {
        "subject": "Parc de la Ligue Arabe, Casablanca",
        "queries": ["Parc de la Ligue Arabe Casablanca", "Arab League Park Casablanca",
                    "Parc Ligue Arabe", "Casablanca park palm"],
        "cats": ["Parc de la Ligue Arabe"],
    },
    "phare-el-hank": {
        "subject": "Phare d'El Hank, Casablanca",
        "queries": ["El Hank Lighthouse", "Phare El Hank Casablanca", "Phare d'El Hank"],
        "cats": ["El Hank Lighthouse"],
    },
    "marina-casablanca": {
        "subject": "Marina de Casablanca",
        "queries": ["Casablanca Marina", "Marina de Casablanca", "Casablanca waterfront",
                    "port de Casablanca bateaux", "Casablanca corniche mosquee mer",
                    "Casablanca skyline sea"],
        "cats": ["Casablanca Marina"],
    },
    "la-sqala": {
        "subject": "La Sqala, bastion of Casablanca's old medina",
        "queries": ["Sqala Casablanca", "Bastion Sqala Casablanca", "La Sqala Casablanca",
                    "Casablanca medina ramparts cannon"],
        "cats": ["Sqala (Casablanca)"],
    },
    "sindibad-park": {
        "subject": "Sindibad Park, Casablanca",
        "queries": ["Sindibad Park Casablanca", "Parc Sindibad", "Sindibad Casablanca",
                    "Casablanca zoo animals", "manege parc attraction Maroc",
                    "roller coaster Morocco park"],
        "cats": ["Sindibad Park"],
    },
    "plage-ain-diab": {
        "subject": "Plage Aïn Diab, Casablanca",
        "queries": ["Ain Diab Casablanca", "Plage Ain Diab", "Aïn Diab beach Casablanca",
                    "Casablanca corniche beach"],
        "cats": ["Aïn Diab"],
    },
    "plage-deauville": {
        "subject": "Plage Deauville, Mohammedia",
        "queries": ["Mohammedia beach Morocco", "Plage Mohammedia", "Deauville Mohammedia",
                    "Mohammedia plage sable"],
        "cats": ["Mohammedia"],
    },
    "kasbah-de-mohammedia": {
        "subject": "Kasbah of Mohammedia (Fedala)",
        "queries": ["Kasbah Mohammedia", "Kasbah de Mohammedia Maroc", "Fedala kasbah",
                    "Mohammedia remparts"],
        "cats": ["Kasbah of Mohammedia"],
    },
    "phare-sidi-bouafi": {
        "subject": "Phare Sidi Bouafi, Oualidia / El Jadida coast",
        "queries": ["Phare Sidi Bouafi", "Sidi Bouafi lighthouse", "Sidi Bouafi Oualidia",
                    "lighthouse Morocco Atlantic coast"],
        "cats": ["Lighthouses in Morocco"],
    },
    "cite-portugaise-mazagan": {
        "subject": "Cité Portugaise de Mazagan, El Jadida",
        "queries": ["Portuguese City of Mazagan", "Cite portugaise El Jadida",
                    "El Jadida ramparts", "El Jadida sea gate Mazagan",
                    "El Jadida porte de la mer", "Mazagan walls ocean"],
        "cats": ["Portuguese City of Mazagan (El Jadida)"],
    },
    "citerne-portugaise": {
        "subject": "Citerne Portugaise, El Jadida",
        "queries": ["Portuguese Cistern El Jadida", "Citerne portugaise El Jadida",
                    "Cisterne El Jadida", "Mazagan cistern"],
        "cats": ["Portuguese Cistern (El Jadida)"],
    },
    "bastion-de-lange": {
        "subject": "Bastion de l'Ange, El Jadida",
        "queries": ["Bastion de l'Ange El Jadida", "Bastion El Jadida", "Angel bastion Mazagan",
                    "El Jadida bastion rempart"],
        "cats": ["Portuguese City of Mazagan (El Jadida)"],
    },
    "azemmour-medina": {
        "subject": "Medina and ramparts of Azemmour",
        "queries": ["Azemmour medina", "Azemmour ramparts", "Azemmour Morocco",
                    "Azemmour murale"],
        "cats": ["Azemmour"],
    },
    "kasbah-de-boulaouane": {
        "subject": "Kasbah of Boulaouane",
        "queries": ["Kasbah Boulaouane", "Kasba Boulaouane", "Boulaouane Morocco",
                    "Kasbah de Boulaouane Maroc"],
        "cats": ["Kasbah Boulaouane"],
    },
    "lagune-de-oualidia": {
        "subject": "Lagune de Oualidia",
        "queries": ["Oualidia lagoon", "Lagune Oualidia", "Oualidia Morocco lagoon",
                    "Lagune de Oualidia Maroc"],
        "cats": ["Oualidia"],
    },
    "plage-de-oualidia": {
        "subject": "Plage de Oualidia",
        "queries": ["Oualidia beach", "Plage Oualidia", "Oualidia plage Maroc",
                    "Oualidia sand dunes ocean", "Oualidia coast rocks"],
        "cats": ["Oualidia"],
    },
    "balade-en-barque-lagune-oualidia": {
        "subject": "Boat on the Oualidia lagoon",
        "queries": ["Oualidia boat", "barque Oualidia", "Oualidia fishing boat",
                    "Oualidia lagune barque"],
        "cats": ["Oualidia"],
    },
    "degustation-huitres-oualidia": {
        "subject": "Oyster farming / tasting at Oualidia",
        "queries": ["Oualidia oysters", "huitres Oualidia", "oyster farm Morocco",
                    "ostreiculture Maroc"],
        "cats": ["Oualidia"],
    },
    "cooking-mi-naima": {
        "subject": "Moroccan home cooking / tajine preparation",
        "queries": ["tajine pot cooking charcoal", "Moroccan bread making dough",
                    "cooking class Morocco kitchen", "Moroccan food preparation hands",
                    "msemen preparation", "couscous steaming pot"],
        "cats": ["Tagines", "Moroccan cuisine", "Food preparation in Morocco"],
    },
    "moroccan-tea-ritual": {
        "subject": "Moroccan mint tea poured",
        "queries": ["Moroccan mint tea pouring", "the a la menthe marocain",
                    "Moroccan tea ceremony", "Maghrebi mint tea"],
        "cats": ["Maghrebi mint tea"],
    },
    "leather-bag-workshop": {
        "subject": "Moroccan leather artisan at work",
        "queries": ["Moroccan leather artisan", "maroquinerie Maroc artisan",
                    "leather craftsman workshop hands", "artisan cuir souk Maroc",
                    "shoemaker Morocco babouche artisan", "leather goods workshop sewing"],
        "cats": ["Leather industry in Morocco"],
    },
    "habous-artisan-walk": {
        "subject": "Quartier des Habous artisan streets, Casablanca",
        "queries": ["Quartier Habous Casablanca", "Habous Casablanca", "Nouvelle Medina Casablanca",
                    "Habous quarter Morocco"],
        "cats": ["Habous"],
    },
    "pottery-el-jadida": {
        "subject": "Moroccan potter at the wheel",
        "queries": ["Moroccan pottery potter wheel", "poterie Maroc artisan tour",
                    "Safi pottery Morocco potter", "potter wheel clay hands",
                    "ceramist Morocco workshop", "poterie tour du potier"],
        "cats": ["Pottery of Morocco"],
    },
    "oualidia-oyster-tasting": {
        "subject": "Oysters served by the Oualidia lagoon",
        "queries": ["oyster farming lagoon", "parc ostreicole huitres", "oyster beds sea",
                    "huitres plateau fruits de mer", "oyster farmer basket"],
        "cats": ["Oysters as food"],
    },
}


# --------------------------------------------------------------------------------
# The imagery that shipped before this pass was AI-generated (see SOURCES.md audit):
# 896x1120 renders, several byte-identical across files, and sacre-coeur.webp showed a
# generic Gothic church rather than Casablanca's. These targets replace them. They are
# not POI cards, so they carry their own output path and aspect ratio.
# --------------------------------------------------------------------------------
REPLACEMENTS = {
    "hassan-ii": {
        "subject": "Mosquée Hassan II, Casablanca",
        "queries": ["Hassan II Mosque Casablanca", "Mosquee Hassan II minaret",
                    "Hassan II Mosque sea"],
        "cats": ["Hassan II Mosque"], "out": "poi/hassan-ii.webp",
    },
    "habous": {
        "subject": "Quartier Habous, Casablanca",
        "queries": ["Quartier Habous Casablanca arcade", "Habous Casablanca mosque",
                    "Mahkama du Pacha Casablanca"],
        "cats": ["Habous"], "out": "poi/habous.webp",
    },
    "marche-central": {
        "subject": "Marché Central, Casablanca",
        "queries": ["Marche Central Casablanca", "Central Market Casablanca",
                    "marche Casablanca poissons"],
        "cats": [], "out": "poi/marche-central.webp",
    },
    "sacre-coeur": {
        "subject": "Église du Sacré-Cœur, Casablanca",
        "queries": ["Sacre Coeur Casablanca", "Cathedrale Sacre Coeur Casablanca",
                    "Eglise du Sacre Coeur Maroc"],
        "cats": ["Sacré-Cœur Cathedral (Casablanca)"], "out": "poi/sacre-coeur.webp",
    },
    "ancienne-medina": {
        "subject": "Ancienne Médina, Casablanca",
        "queries": ["Old Medina Casablanca", "Ancienne medina Casablanca",
                    "medina Casablanca street"],
        "cats": ["Old Medina of Casablanca"], "out": "poi/ancienne-medina.webp",
    },
    "corniche-ain-diab": {
        "subject": "Corniche Aïn Diab, Casablanca",
        "queries": ["Corniche Casablanca", "Corniche Ain Diab", "Casablanca seafront promenade"],
        "cats": [], "out": "poi/corniche-ain-diab.webp",
    },
    "vibe-culture": {
        "subject": "Culture tile: Moroccan heritage architecture",
        "queries": ["Moroccan zellij courtyard", "Moroccan riad architecture",
                    "medersa Morocco interior"],
        "cats": [], "out": "vibes/culture.webp",
    },
    "vibe-food": {
        "subject": "Food tile: Moroccan market produce",
        "queries": ["Moroccan spices market", "souk epices Maroc", "Morocco market olives"],
        "cats": [], "out": "vibes/food.webp",
    },
    "vibe-coast": {
        "subject": "Coast tile: Moroccan Atlantic shore",
        "queries": ["Morocco Atlantic coast cliffs", "cote atlantique Maroc ocean",
                    "Atlantic ocean Morocco waves"],
        "cats": [], "out": "vibes/coast.webp",
    },
    "vibe-hidden-gems": {
        "subject": "Hidden gems tile: a quiet Moroccan alley",
        "queries": ["Moroccan alley blue door", "ruelle medina Maroc", "narrow street medina Morocco"],
        "cats": [], "out": "vibes/hidden-gems.webp",
    },
    "vibe-art": {
        "subject": "Art tile: Moroccan craft and pattern",
        "queries": ["zellige tile pattern Morocco", "Moroccan mosaic wall",
                    "artisan mosaique Maroc"],
        "cats": [], "out": "vibes/art.webp",
    },
    "vibe-adventure": {
        "subject": "Activities tile: outdoors in Morocco",
        "queries": ["surfing Morocco Atlantic", "kitesurf Maroc plage", "hiking Morocco coast trail"],
        "cats": [], "out": "vibes/adventure.webp",
    },
    "popular-atlantic": {
        "subject": "Popular card: Atlantic escape",
        "queries": ["Morocco Atlantic coast landscape", "Oualidia lagoon aerial",
                    "El Jadida coast sea"],
        "cats": [], "out": "popular/atlantic-escape.webp", "ratio": 16 / 10,
    },
    "popular-food": {
        "subject": "Popular card: local food trail",
        "queries": ["Moroccan street food stall", "marche marocain fruits legumes",
                    "Morocco market food"],
        "cats": [], "out": "popular/local-food-trail.webp", "ratio": 16 / 10,
    },
    "popular-culture": {
        "subject": "Popular card: culture in Casablanca",
        "queries": ["Hassan II Mosque courtyard", "Casablanca architecture landmark",
                    "Casablanca skyline mosque"],
        "cats": ["Hassan II Mosque"], "out": "popular/culture-casablanca.webp", "ratio": 16 / 10,
    },
    "hero": {
        "subject": "Home hero: Casablanca at the ocean",
        "queries": ["Hassan II Mosque sunset", "Casablanca mosque ocean evening",
                    "Hassan II Mosque from the sea"],
        "cats": ["Hassan II Mosque"], "out": "hero.webp",
    },
}
TARGETS.update(REPLACEMENTS)

BAD_WORDS = ("map", "carte", "logo", "coat of arms", "blason", "plan ", "diagram",
             "drapeau", "flag", "stamp", "timbre", "graph", "chart", "seal ")
BAD_EXT = (".svg", ".pdf", ".tif", ".tiff", ".ogv", ".webm", ".djvu", ".gif", ".xcf")


def api(params):
    params = dict(params, format="json", formatversion="2")
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode())
        except Exception as exc:  # transient network / 429
            if attempt == 3:
                print(f"  ! api failed: {exc}", file=sys.stderr)
                return {}
            time.sleep(1.5 * (attempt + 1))
    return {}


def collect(pages, out, origin):
    for page in pages:
        title = page.get("title", "")
        low = title.lower()
        if any(low.endswith(e) for e in BAD_EXT):
            continue
        ii = (page.get("imageinfo") or [{}])[0]
        ext = ii.get("extmetadata") or {}
        w, h = ii.get("width", 0), ii.get("height", 0)
        if w < 640 or h < 480:
            continue
        desc = (ext.get("ImageDescription", {}).get("value", "") or "")[:400]
        blob = (low + " " + desc.lower())
        if any(b in blob for b in BAD_WORDS):
            continue
        if title in out:
            continue
        out[title] = {
            "title": title,
            "pageid": page.get("pageid"),
            "origin": origin,
            "width": w,
            "height": h,
            "size": ii.get("size"),
            "url": (ii.get("url") or "").split("?")[0],
            "thumb": ii.get("thumburl"),
            "page": ii.get("descriptionurl"),
            "mime": ii.get("mime"),
            "artist": strip(ext.get("Artist", {}).get("value", "")),
            "license": ext.get("LicenseShortName", {}).get("value", ""),
            "usage": strip(ext.get("UsageTerms", {}).get("value", "")),
            "credit": strip(ext.get("Credit", {}).get("value", ""))[:200],
            "description": strip(desc),
            "date": ext.get("DateTimeOriginal", {}).get("value", "")[:40],
        }


def strip(html):
    import re
    return re.sub(r"<[^>]+>", " ", html or "").replace("&amp;", "&").strip()


def search_target(slug, plan, per_query=8):
    found = {}
    for q in plan["queries"]:
        data = api({
            "action": "query", "generator": "search",
            "gsrsearch": q + " filetype:bitmap", "gsrnamespace": 6,
            "gsrlimit": per_query, "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 420,
        })
        collect((data.get("query") or {}).get("pages", []), found, f"search:{q}")
        time.sleep(0.25)
    for cat in plan.get("cats", []):
        data = api({
            "action": "query", "generator": "categorymembers",
            "gcmtitle": "Category:" + cat, "gcmtype": "file", "gcmlimit": 40,
            "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 420,
        })
        collect((data.get("query") or {}).get("pages", []), found, f"category:{cat}")
        time.sleep(0.25)
    ranked = sorted(found.values(), key=lambda c: -(c["width"] * c["height"]))
    return ranked


def cmd_search(argv):
    only = set(argv)
    out_path = os.environ.get("CANDIDATES", "/tmp/candidates.json")
    existing = {}
    if only and os.path.exists(out_path):
        existing = json.load(open(out_path))
    for slug, plan in TARGETS.items():
        if only and slug not in only:
            continue
        print(f"searching {slug} ...", flush=True)
        cands = search_target(slug, plan)
        existing[slug] = {"subject": plan["subject"], "candidates": cands}
        print(f"  {len(cands)} candidates", flush=True)
    json.dump(existing, open(out_path, "w"), indent=1, ensure_ascii=False)
    print("wrote", out_path)


# --------------------------------------------------------------------------------
# phase 2: contact sheets. Candidates are judged on the photograph, not the filename.
# --------------------------------------------------------------------------------

def score(cand, plan):
    """Cheap relevance prior; it only decides which 9 get *looked at*."""
    words = set()
    for q in plan["queries"]:
        words.update(w.lower() for w in q.split() if len(w) > 3)
    blob = (cand["title"] + " " + cand["description"]).lower()
    hits = sum(1 for w in words if w in blob)
    s = hits * 10
    if cand["origin"].startswith("category:"):
        s += 12
    mp = cand["width"] * cand["height"] / 1e6
    s += min(mp, 12)
    if cand["height"] > cand["width"]:
        s += 3          # portrait crops to 4:5 with the least loss
    return -s


def fetch(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def cmd_sheets(argv):
    from PIL import Image, ImageDraw, ImageFont
    import io
    cand_path = os.environ.get("CANDIDATES", "/tmp/candidates.json")
    outdir = os.environ.get("SHEETS", "/tmp/sheets")
    os.makedirs(outdir, exist_ok=True)
    data = json.load(open(cand_path))
    only = set(argv)
    cell, cols, top = 320, 3, 26
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 20)
    except Exception:
        font = ImageFont.load_default()
    for slug, entry in data.items():
        if only and slug not in only:
            continue
        plan = TARGETS[slug]
        cands = sorted(entry["candidates"], key=lambda c: score(c, plan))[:9]
        entry["shortlist"] = [c["title"] for c in cands]
        rows = (len(cands) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * cell, rows * (cell + top)), (24, 24, 27))
        draw = ImageDraw.Draw(sheet)
        for i, c in enumerate(cands):
            x, y = (i % cols) * cell, (i // cols) * (cell + top)
            draw.text((x + 6, y + 3), f"{i+1}. {c['width']}x{c['height']}", (255, 210, 90), font=font)
            try:
                im = Image.open(io.BytesIO(fetch(c["thumb"] or c["url"]))).convert("RGB")
                im.thumbnail((cell - 8, cell - 8))
                sheet.paste(im, (x + (cell - im.width) // 2, y + top + (cell - im.height) // 2))
            except Exception as exc:
                draw.text((x + 10, y + top + 40), f"fetch failed\n{exc}"[:60], (255, 80, 80), font=font)
            time.sleep(0.1)
        path = os.path.join(outdir, f"{slug}.jpg")
        sheet.save(path, quality=80)
        print(f"{slug}: {path}")
        for i, c in enumerate(cands):
            print(f"   {i+1}. {c['title']} | {c['width']}x{c['height']} | {c['license']} | {c['origin']}")
    json.dump(data, open(cand_path, "w"), indent=1, ensure_ascii=False)


# --------------------------------------------------------------------------------
# phase 3: download the chosen originals, crop 4:5, encode WebP, write the manifest.
# Every entry below was picked by looking at the photograph on a contact sheet, then
# confirming the subject in the file's own Commons description.
#   match: EXACT           - the photograph is of this very place
#          STRONG_RELATED  - same site/town/quarter, not the exact building or beach
#          GENERIC_FALLBACK- a contextual Moroccan photograph for an experience
#   focus: (x, y) focal point in the source, 0..1. zoom < 1 crops in tighter.
# --------------------------------------------------------------------------------

SELECTED = {
 "place-mohammed-v": ("File:Wilaya de Casablanca-Settat 01.jpg", "EXACT", (0.5, 0.56), 0.85),
 "boulevard-mohammed-v": ("File:Casa didier55 019.jpg", "EXACT", (0.5, 0.5), 1.0),
 "cinema-rialto": ("File:Rialto Cin\u00e9ma Casa.jpg", "EXACT", (0.45, 0.42), 1.0),
 "villa-des-arts": ("File:Villa des Arts.jpg", "EXACT", (0.5, 0.5), 1.0),
 "fondation-abderrahman-slaoui": ("File:Mus\u00e9e gen\u00e8se 3.jpg", "EXACT", (0.5, 0.5), 1.0),
 "musee-du-judaisme-marocain": ("File:One of the halls at the Moroccan Jewish Museum of Casablanca, Morocco.jpg", "EXACT", (0.5, 0.45), 1.0),
 "parc-ligue-arabe": ("File:Ligue Arabe Casablanca 2.jpg", "EXACT", (0.5, 0.5), 1.0),
 "phare-el-hank": ("File:\u0645\u0646\u0627\u0631\u0629 \u0627\u0644\u0639\u0646\u0642 (22308).jpg", "EXACT", (0.5, 0.42), 1.0),
 "marina-casablanca": ("File:Bateaux de p\u00eache au ancien port de casablanca.jpg", "STRONG_RELATED", (0.55, 0.5), 1.0),
 "la-sqala": ("File:Sqala Casablanca.jpg", "EXACT", (0.5, 0.5), 1.0),
 "sindibad-park": ("File:Le lion.jpg", "EXACT", (0.35, 0.44), 0.30),
 "plage-ain-diab": ("File:Sidi Abderahmane, Ain Diab, Casablanca 2013.jpg", "EXACT", (0.5, 0.5), 1.0),
 "plage-deauville": ("File:Miramar Beach in Mohammedia, Morocco.jpg", "STRONG_RELATED", (0.5, 0.5), 1.0),
 "kasbah-de-mohammedia": ("File:Bab elkasbah mohammedia.jpg", "EXACT", (0.5, 0.5), 1.0),
 "phare-sidi-bouafi": ("File:SIDI BOU AFI LIGHTHOUSE - EL JADIDA - MOROCCO.jpg", "EXACT", (0.5, 0.52), 0.8),
 "cite-portugaise-mazagan": ("File:El Jadida DSCF8872.jpg", "EXACT", (0.5, 0.5), 1.0),
 "citerne-portugaise": ("File:Citerne portugaise, Mazagan - El Jadida.jpg", "EXACT", (0.5, 0.5), 1.0),
 "bastion-de-lange": ("File:El Jadida DSCF8851.jpg", "EXACT", (0.42, 0.5), 1.0),
 "azemmour-medina": ("File:20090807 Azemmour Morocco 1.jpg", "EXACT", (0.5, 0.5), 1.0),
 "kasbah-de-boulaouane": ("File:Kasbah de Boulaouane.jpg", "EXACT", (0.5, 0.5), 1.0),
 "lagune-de-oualidia": ("File:La plage El oualidia.jpg", "EXACT", (0.5, 0.45), 1.0),
 "plage-de-oualidia": ("File:Fishing boat in the port of Oualidia, Morocco.jpg", "EXACT", (0.4, 0.5), 1.0),
 "balade-en-barque-lagune-oualidia": ("File:Oualidia, Casablanca-Settat region, Morocco Dec 2023 - Lagoon - 3.jpg", "EXACT", (0.55, 0.5), 1.0),
 "degustation-huitres-oualidia": ("File:Oualidia, Casablanca-Settat region, Morocco November 2023 - Meal with a view.jpg", "EXACT", (0.5, 0.5), 1.0),
 "oualidia-oyster-tasting": ("File:Oualidia, Casablanca-Settat region, Morocco Dec 2023 - Food and vin blanc on warm afternoon.jpg", "EXACT", (0.5, 0.5), 1.0),
 "cooking-mi-naima": ("File:Amal Women\'s Training Center and Moroccan Restaurant trainee making bread.jpg", "GENERIC_FALLBACK", (0.42, 0.45), 1.0),
 "moroccan-tea-ritual": ("File:Mint tea (14823416550).jpg", "STRONG_RELATED", (0.5, 0.45), 1.0),
 "leather-bag-workshop": ("File:The Bag Maker.jpg", "STRONG_RELATED", (0.5, 0.5), 1.0),
 "habous-artisan-walk": ("File:A souvenirs shop in habous market casablanca.jpg", "EXACT", (0.5, 0.5), 1.0),
 "pottery-el-jadida": ("File:Safi4 (js).jpg", "STRONG_RELATED", (0.45, 0.5), 1.0),
}

# Reuse-incompatible markers. Commons hosts a few of these; never ship one.
BAD_LICENSE = ("noncommercial", "-nc", "noderiv", "-nd", "fair use", "all rights reserved")
RATIO = 4 / 5
OUT_MAX, OUT_MIN = 1200, 896


def file_meta(title):
    data = api({"action": "query", "titles": title, "prop": "imageinfo",
                "iiprop": "url|size|mime|extmetadata"})
    page = (data.get("query") or {}).get("pages", [{}])[0]
    ii = (page.get("imageinfo") or [{}])[0]
    ext = ii.get("extmetadata") or {}
    return {
        "title": page.get("title", title),
        "url": (ii.get("url") or "").split("?")[0],
        "page": ii.get("descriptionurl"),
        "width": ii.get("width"), "height": ii.get("height"), "bytes": ii.get("size"),
        "artist": strip(ext.get("Artist", {}).get("value", "")),
        "license": ext.get("LicenseShortName", {}).get("value", ""),
        "usage": strip(ext.get("UsageTerms", {}).get("value", "")),
        "credit": strip(ext.get("Credit", {}).get("value", ""))[:300],
        "description": strip(ext.get("ImageDescription", {}).get("value", ""))[:400],
        "date": ext.get("DateTimeOriginal", {}).get("value", "")[:40],
    }


def crop_4x5(im, focus, zoom):
    """Cover the 4:5 box without ever distorting: scale nothing, just choose the window."""
    w, h = im.size
    if w / h > RATIO:
        ch, cw = h, h * RATIO
    else:
        cw, ch = w, w / RATIO
    cw, ch = cw * zoom, ch * zoom
    fx, fy = focus
    left = min(max(fx * w - cw / 2, 0), w - cw)
    top = min(max(fy * h - ch / 2, 0), h - ch)
    return im.crop((round(left), round(top), round(left + cw), round(top + ch)))


def cmd_build(argv):
    from PIL import Image, ImageFilter, ImageOps
    import io
    only = set(argv)
    outdir = os.path.join(ROOT, "public", "images", "poi")
    cache = os.environ.get("CACHE", "/tmp/wm-originals")
    os.makedirs(outdir, exist_ok=True)
    os.makedirs(cache, exist_ok=True)
    manifest_path = os.path.join(outdir, "sources.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    for slug, (title, match, focus, zoom) in SELECTED.items():
        if only and slug not in only:
            continue
        meta = file_meta(title)
        low = (meta["license"] + " " + meta["usage"]).lower()
        if not meta["url"] or any(b in low for b in BAD_LICENSE):
            print(f"REJECT {slug}: license {meta['license']!r}")
            continue
        raw = os.path.join(cache, urllib.parse.quote(title, safe="") + ".bin")
        if not os.path.exists(raw):
            open(raw, "wb").write(fetch(meta["url"], timeout=180))
            time.sleep(0.2)
        # exif_transpose first: several Commons originals are stored rotated and carry
        # the rotation only in EXIF, which PIL does not apply on its own.
        im = ImageOps.exif_transpose(Image.open(raw)).convert("RGB")
        cropped = crop_4x5(im, focus, zoom)
        out_w = max(OUT_MIN, min(OUT_MAX, cropped.width))
        out = cropped.resize((out_w, round(out_w / RATIO)), Image.LANCZOS)
        out = out.filter(ImageFilter.UnsharpMask(radius=1.1, percent=55, threshold=3))
        path = os.path.join(outdir, f"{slug}.webp")
        # Step quality, then resolution, down until the card weighs what the rest of the
        # set weighs. Detail-dense frames (palm fronds, souk clutter) need the second
        # lever: no quality setting alone brings them under the cap.
        final = out
        for width in (out.width, 1040, OUT_MIN):
            if width > out.width:
                continue
            candidate = out if width == out.width else out.resize(
                (width, round(width / RATIO)), Image.LANCZOS)
            for quality in (82, 76, 70, 64):
                candidate.save(path, "WEBP", quality=quality, method=6)
                if os.path.getsize(path) <= 260_000:
                    final = candidate
                    break
            else:
                final = candidate
                continue
            break
        out = final
        manifest[slug] = {
            "slug": slug, "subject": TARGETS[slug]["subject"], "match": match,
            "file": meta["title"], "commons": meta["page"], "original": meta["url"],
            "author": meta["artist"], "license": meta["license"], "usage_terms": meta["usage"],
            "credit": meta["credit"], "description": meta["description"], "date": meta["date"],
            "source_dimensions": f"{meta['width']}x{meta['height']}",
            "crop": {"focus": list(focus), "zoom": zoom,
                     "box": f"{cropped.width}x{cropped.height}"},
            "local": f"/images/poi/{slug}.webp",
            "output_dimensions": f"{out.width}x{out.height}",
            "output_bytes": os.path.getsize(path),
        }
        print(f"{slug:34s} {meta['width']}x{meta['height']} -> {out.width}x{out.height} "
              f"({os.path.getsize(path)//1024}K) {match} | {meta['license']}")
    json.dump(manifest, open(manifest_path, "w"), indent=2, ensure_ascii=False, sort_keys=True)
    print("manifest ->", manifest_path)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "search"
    if cmd == "search":
        cmd_search(sys.argv[2:])
    elif cmd == "sheets":
        cmd_sheets(sys.argv[2:])
    elif cmd == "build":
        cmd_build(sys.argv[2:])
    else:
        print("unknown command", cmd)
        sys.exit(1)
