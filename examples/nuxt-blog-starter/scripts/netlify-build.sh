#!/bin/bash
set -e
set -o pipefail

echo "=== Building prod (SSG) ==="
pnpm run generate 2>&1 | tee nuxt-generate.log
# Fail loudly on a broken SSG. nuxt's prerender.failOnError is off (to
# tolerate IPX image-route 500s — those log a bare "[500]"), but a page
# route that 500s during prerender ships as a 404, so the whole docs
# site can silently become unreachable. Real page routes log
# "[500] Server Error"; refuse to deploy when any appear.
if grep -q '\[500\] Server Error' nuxt-generate.log; then
  echo >&2
  echo "ERROR: prerender produced Server Errors on page routes — refusing to ship a broken site:" >&2
  grep -B2 -- '\[500\] Server Error' nuxt-generate.log >&2
  rm -f nuxt-generate.log
  exit 1
fi
rm -f nuxt-generate.log
mv .output .output-prod

# Clean Nuxt build cache to avoid SSG state leaking into SPA build
rm -rf .nuxt

echo "=== Building edit (SPA) ==="
NUXT_EDIT_BASE_URL=/edit/ pnpm run edit

# Move entire edit output into prod's /edit/ subdirectory
mv .output/public .output-prod/public/edit

# Use combined output
rm -rf .output
mv .output-prod .output

echo "=== Build complete ==="
echo "  /        → prod (SSG)"
echo "  /edit/   → edit (SPA)"
