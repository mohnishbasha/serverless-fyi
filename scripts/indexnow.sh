#!/usr/bin/env bash
# Ping IndexNow for URLs changed by the last commit (or every sitemap URL when ALL=true).
set -euo pipefail
SITE="${SITE:-https://www.serverless.fyi}"
KEY_FILE=$(ls public/*.txt | grep -E '/[0-9a-f]{32}\.txt$' | head -1)
KEY=$(basename "$KEY_FILE" .txt)
urls=()
if [[ "${ALL:-false}" == "true" ]]; then
  mapfile -t urls < <(curl -fsSL "$SITE/sitemap-0.xml" | grep -oE '<loc>[^<]+' | sed 's/<loc>//')
else
  while IFS= read -r f; do
    slug=$(sed -n 's/^slug: *"\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' "$f" | head -1)
    [[ -n "$slug" ]] && urls+=("$SITE/p/$slug/")
  done < <(git diff --name-only --diff-filter=AM HEAD~1 HEAD -- 'src/content/posts/*/index.md*' 2>/dev/null || true)
  [[ ${#urls[@]} -gt 0 ]] && urls+=("$SITE/" "$SITE/archive/")
fi
[[ ${#urls[@]} -eq 0 ]] && { echo "No changed URLs."; exit 0; }
json=$(printf '%s\n' "${urls[@]}" | node -e '
  const urls = require("fs").readFileSync(0, "utf8").trim().split("\n");
  const [site, key] = process.argv.slice(1);
  console.log(JSON.stringify({ host: new URL(site).host, key, keyLocation: `${site}/${key}.txt`, urlList: urls }));
' "$SITE" "$KEY")
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST https://api.indexnow.org/indexnow -H 'content-type: application/json; charset=utf-8' -d "$json")
echo "IndexNow → $code for ${#urls[@]} URL(s)"
[[ "$code" == "200" || "$code" == "202" ]] || echo "::warning::IndexNow returned $code"
