#!/bin/bash
set -e

echo "=== Building prod (SSG) ==="
pnpm run generate
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
