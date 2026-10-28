#!/bin/sh
# Usage: scripts/shot.sh <route> <out.png> [height=960] [width=1280]
# Default is the desktop stage: the app renders in a 390x844 phone frame centred in the window.
# (headless Chrome refuses windows narrower than ~500px, so a true 390px viewport is not possible here.)
# Headless-Chrome screenshot of the running dev server (http://localhost:3000).
# Chrome sometimes never exits (hero video keeps it alive) — we kill it once the file lands.
R="$1"; OUT="$2"; H="${3:-960}"; W="${4:-1280}"
PROFILE="${TMPDIR:-/tmp}/khotwa-shot-$$"
rm -f "$OUT"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist \
  --force-prefers-reduced-motion --window-size=$W,$H --timeout=8000 --user-data-dir="$PROFILE" \
  --screenshot="$OUT" "http://localhost:3000$R" >/dev/null 2>&1 &
PID=$!
i=0; while [ ! -s "$OUT" ] && [ $i -lt 40 ]; do sleep 1; i=$((i+1)); done
sleep 1; kill $PID 2>/dev/null; pkill -f "user-data-dir=$PROFILE" 2>/dev/null
rm -rf "$PROFILE"; ls -la "$OUT"
