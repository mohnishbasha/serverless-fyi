#!/usr/bin/env bash
set -euo pipefail
PKG=$(node -p "require('./package.json').version")
SITE=$(grep -oE "SITE_VERSION = '[0-9]+\.[0-9]+\.[0-9]+'" src/lib/site.ts | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
[[ "$PKG" == "$SITE" ]] || { echo "package.json ($PKG) != site.ts ($SITE)"; exit 1; }
grep -q "^## \[$PKG\]" CHANGELOG.md || { echo "CHANGELOG missing [$PKG]"; exit 1; }
if [[ -n "${GITHUB_REF_NAME:-}" && "$GITHUB_REF_NAME" == v* ]]; then
  [[ "v$PKG" == "$GITHUB_REF_NAME" ]] || { echo "tag $GITHUB_REF_NAME != v$PKG"; exit 1; }
fi
echo "versions consistent: $PKG"
