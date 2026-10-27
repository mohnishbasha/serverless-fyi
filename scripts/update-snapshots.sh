#!/usr/bin/env bash
# Regenerate visual snapshots inside the same Linux image CI uses, so they match pixel-for-pixel.
# Requires Docker and a fresh `pnpm build`. Usage: bash scripts/update-snapshots.sh
set -euo pipefail
PW_VERSION=$(node -p "require('@playwright/test/package.json').version")
docker run --rm --ipc=host -v "$PWD":/work -w /work "mcr.microsoft.com/playwright:v${PW_VERSION}-noble" \
  bash -c "CI=1 node node_modules/@playwright/test/cli.js test tests/visual --project=chromium-desktop --project=pixel-7 --update-snapshots"
