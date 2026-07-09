#!/usr/bin/env bash
# Replace the Unity Catalog prefix in all analytics queries.
# Usage: ./scripts/configure-analytics-schema.sh main.genie_cc
#        ./scripts/configure-analytics-schema.sh acme_catalog.genie_analytics

set -euo pipefail

NEW_PREFIX="${1:-}"
OLD_PREFIX="${2:-main.genie_cc}"

if [[ -z "$NEW_PREFIX" ]]; then
  echo "Usage: $0 <catalog.schema> [old_prefix]"
  echo "Example: $0 acme_prod.genie_cc"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COUNT=0

for f in "$ROOT"/config/queries/*.sql; do
  if grep -q "$OLD_PREFIX" "$f"; then
    sed -i '' "s/${OLD_PREFIX//./\\.}/${NEW_PREFIX//./\\.}/g" "$f"
    COUNT=$((COUNT + 1))
  fi
done

echo "Updated $COUNT query file(s): $OLD_PREFIX → $NEW_PREFIX"
