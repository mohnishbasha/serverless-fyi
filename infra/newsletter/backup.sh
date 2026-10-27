#!/bin/sh
# Nightly listmonk backup: pg_dump -Fc | gzip -> S3 (SSE-KMS).
# Expects env: BACKUP_BUCKET, BACKUP_KMS_KEY_ID, PG* vars, AWS credentials.
set -euo pipefail

: "${BACKUP_BUCKET:?BACKUP_BUCKET is required}"
: "${BACKUP_KMS_KEY_ID:?BACKUP_KMS_KEY_ID is required}"

ts=$(date -u +%Y%m%dT%H%M%SZ)
key="listmonk/$(date -u +%Y/%m/%d)/listmonk-${ts}.dump.gz"
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

pg_dump -Fc | gzip -9 >"$tmp"

size=$(wc -c <"$tmp" | tr -d ' ')
if [ "$size" -lt 1024 ]; then
  echo "backup suspiciously small (${size} bytes); aborting" >&2
  exit 1
fi

aws s3 cp "$tmp" "s3://${BACKUP_BUCKET}/${key}" \
  --sse aws:kms --sse-kms-key-id "$BACKUP_KMS_KEY_ID" --only-show-errors

echo "backup ok: s3://${BACKUP_BUCKET}/${key} (${size} bytes)"
