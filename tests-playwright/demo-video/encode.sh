#!/bin/bash
# Encode the latest .webm from `pnpm demo:capture` into the public mp4.
# Trims off the login + iframe-load prefix using the timestamp the spec
# wrote to .recordings/trim-ms.txt — beats start at that ms offset, so
# everything before it is loading noise.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
WEBM="$(ls -t "$SCRIPT_DIR/.recordings"/**/*.webm 2>/dev/null | head -1)"
TRIM_FILE="$SCRIPT_DIR/.recordings/trim-ms.txt"

if [ -z "$WEBM" ]; then
  echo "no .webm in $SCRIPT_DIR/.recordings — run pnpm demo:capture first" >&2
  exit 1
fi

# Convert ms to seconds for ffmpeg -ss. Subtract a small lead (-0.5s) so
# the cut doesn't clip the very first beat. Default to 0 if no marker.
TRIM_S=$(awk -v ms="$(cat "$TRIM_FILE" 2>/dev/null || echo 0)" \
  'BEGIN { s = (ms - 500) / 1000.0; if (s < 0) s = 0; printf "%.2f", s }')

OUT_PUBLIC="$REPO/docs/_static/hydra-demo.mp4"
OUT_PLONE="$REPO/docs/content/content/content/docs/static/hydra-demo/file/hydra-demo.mp4"

echo "trimming first ${TRIM_S}s of $WEBM"
ffmpeg -y -ss "$TRIM_S" -i "$WEBM" \
  -vf 'fps=24,scale=1280:-2:flags=lanczos' \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 22 \
  "$OUT_PUBLIC"

cp "$OUT_PUBLIC" "$OUT_PLONE"
echo "wrote $(du -h "$OUT_PUBLIC" | cut -f1) to docs/_static/hydra-demo.mp4 + Plone export tree"
