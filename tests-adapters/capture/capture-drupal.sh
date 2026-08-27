#!/usr/bin/env bash
# Capture the Drupal mock's fixtures from a real Drupal.
#
# The mock replays what a real Drupal actually returned. It is never
# hand-written: JSON:API responses are deeply nested with `included`
# relationships, and that normalisation is exactly where a Drupal adapter is
# most likely to be wrong. A mock built from our beliefs would agree with our
# bugs.
#
# Re-run this whenever Drupal changes, and diff the result.
#
#   Requires: a running Docker daemon.
#   Usage:    tests-adapters/capture/capture-drupal.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/../fixtures/drupal"
NAME=hydra-drupal-capture
PORT=8791
BASE="http://127.0.0.1:${PORT}"

command -v docker >/dev/null || { echo "docker not found"; exit 1; }
docker info >/dev/null 2>&1 || { echo "docker daemon is not running"; exit 1; }

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

echo "==> starting drupal:11 on ${PORT}"
docker run -d --name "$NAME" -p "${PORT}:80" drupal:11 >/dev/null

echo "==> waiting for it to answer"
for _ in $(seq 1 120); do
  if curl -sf -o /dev/null "${BASE}/"; then break; fi
  sleep 2
done

# Site install, JSON:API, and the two config-created fields Hydra needs:
#
#   field_hydra_blocks  string_long     — Drupal core has no JSON field type,
#                                         so blocks live in a long string.
#   (hierarchy)                         — comes from MENU LINKS, not a parent
#                                         field: Drupal nodes are flat, and
#                                         menus are how Drupal sites actually
#                                         express structure. Content with no
#                                         menu link is reachable through a
#                                         virtual folder in the contents view
#                                         rather than being invisible.
echo "==> installing site + enabling jsonapi"
docker exec "$NAME" bash -lc '
  set -e
  php -d memory_limit=-1 /opt/drupal/vendor/bin/drush site:install standard \
    --account-name=admin --account-pass=admin --yes --site-name=HydraCapture
  drush en jsonapi basic_auth menu_link_content --yes
  drush field:create node --bundle=page --field-name=field_hydra_blocks \
    --field-type=string_long --field-label="Hydra blocks" --is-required=0 --cardinality=1 --yes
' >/dev/null

mkdir -p "$OUT"

echo "==> capturing"
capture() { # capture <name> <path>
  curl -sf -u admin:admin -H 'Accept: application/vnd.api+json' \
    "${BASE}${2}" -o "${OUT}/${1}.json" \
    && echo "    ${1}" \
    || echo "    ${1} FAILED (${2})"
}

capture root                /jsonapi
capture node-page           /jsonapi/node/page
capture node-page-fields    '/jsonapi/node/page?page[limit]=1&include=uid'
capture menu-links          /jsonapi/menu_link_content/menu_link_content
capture taxonomy-vocab      /jsonapi/taxonomy_vocabulary/taxonomy_vocabulary
capture taxonomy-tags       /jsonapi/taxonomy_term/tags
capture users               /jsonapi/user/user
capture field-config        /jsonapi/field_config/field_config
capture content-types       /jsonapi/node_type/node_type

echo "==> captured into $(cd "$OUT" && pwd)"
echo "    These are the mock's source of truth. Review the diff before committing."
