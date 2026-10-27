#!/usr/bin/env bash
# Live-site smoke checks (post-deploy and every 6 h). Usage: bash scripts/smoke.sh [base_url]
set -euo pipefail
BASE="${1:-https://www.serverless.fyi}"
BASE="${BASE%/}"
fail=0
check() { # url expected_status [must_contain]
  local code body
  body="$(curl -sSL --max-time 20 -w '\n%{http_code}' "$1")" || { echo "FAIL $1 (network)"; fail=1; return; }
  code="${body##*$'\n'}"; body="${body%$'\n'*}"
  [[ "$code" == "$2" ]] || { echo "FAIL $1 status=$code want=$2"; fail=1; return; }
  if [[ -n "${3:-}" ]] && ! grep -q -- "$3" <<<"$body"; then echo "FAIL $1 missing '$3'"; fail=1; return; fi
  echo "ok   $1"
}
check "$BASE/" 200 "2 Minute Serverless"
check "$BASE/p/understanding-the-dns-header/" 200 "application/ld+json"
check "$BASE/p/understanding-the-dns-header.md" 200 "# Understanding the DNS Header"
check "$BASE/archive/" 200
check "$BASE/authors/" 200
check "$BASE/subscribe/" 200 "<form"
check "$BASE/t/distributed~systems/" 200 "distributed-systems"
check "$BASE/rss.xml" 200 "<rss"
check "$BASE/feed.json" 200 "jsonfeed.org"
check "$BASE/sitemap-index.xml" 200 "<sitemapindex"
check "$BASE/robots.txt" 200 "User-agent"
check "$BASE/llms.txt" 200 "# 2 Minute Serverless"
check "$BASE/.well-known/security.txt" 200 "Contact:"
check "$BASE/this-does-not-exist-$(date +%s)/" 404
# HTTPS + apex → www (production only)
if [[ "$BASE" == "https://www.serverless.fyi" ]]; then
  check "$BASE/robots.txt" 200 "Sitemap:"
  curl -sSI http://serverless.fyi/ | grep -qi '^location: https://www.serverless.fyi/' || { echo "FAIL apex redirect"; fail=1; }
fi
exit $fail
