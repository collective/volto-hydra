#!/bin/bash
set -e
set -o pipefail

# Warm the API before prerendering. The deployed Plone is a single
# small auto-suspending instance; a cold one answers the heavy
# expand query slowly enough that the SSG's inner template-load
# timeout fires and 500s pages. Poll the exact query shape the
# prerender uses until it returns 200 + valid JSON quickly a few
# times. Non-fatal: warn and proceed if it never warms (the build's
# own failOnError guard still catches a genuinely broken SSG).
API_BASE="${NUXT_TEST_BACKEND:-https://hydra-api.pretagov.com}/++api++"
EXPAND="expand=breadcrumbs,navroot,navigation&expand.navigation.depth=2"
echo "=== Warming API: ${API_BASE} ==="
warm_ok() {
  local out code secs
  out=$(curl -s -o /tmp/warm.json -w '%{http_code} %{time_total}' \
    -H 'Accept: application/json' --max-time 30 \
    "${API_BASE}${1}?${EXPAND}" 2>/dev/null) || return 1
  code=${out%% *}; secs=${out##* }
  [ "$code" = "200" ] && grep -q '"@id"' /tmp/warm.json 2>/dev/null && [ "${secs%%.*}" -lt 5 ]
}
STABLE=0
for i in $(seq 1 60); do
  if warm_ok "" && warm_ok "/docs/examples"; then
    STABLE=$((STABLE + 1))
    echo "  warm ${STABLE}/3"
    [ "$STABLE" -ge 3 ] && { echo "API warm."; break; }
  else
    STABLE=0
  fi
  [ "$i" -eq 60 ] && echo "WARNING: API never warmed after ~10min — building anyway"
  sleep 10
done

echo "=== Building prod (SSG) ==="
# NUXT_PRERENDER_STRICT=1 flips nuxt.config's failOnError on for the DEPLOY only: the
# prerender aborts on the FIRST error — page OR IPX image route — and prints the real
# error (message + stack), which a bare "[500]" never showed. A broken image (or page)
# must fail the deploy, not ship a site with missing images. set -o pipefail (top) makes
# the non-zero `generate` exit propagate through the `tee`.
NUXT_PRERENDER_STRICT=1 pnpm run generate 2>&1 | tee nuxt-generate.log
# Backstop for the non-strict path: if anything still logged a [500] (page OR image)
# without aborting, refuse to ship. (With strict on, `generate` already exited non-zero
# above and set -e stopped us before here — this only bites if strict is somehow off.)
if grep -qE '\[500\]' nuxt-generate.log; then
  echo >&2
  echo "ERROR: prerender produced a Server Error (page or image route) — refusing to ship a broken site:" >&2
  grep -B2 -E -- '\[500\]' nuxt-generate.log >&2
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
