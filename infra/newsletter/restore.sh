#!/bin/sh
# Monthly restore test. Downloads a backup (given S3 key, or the latest) and
# restores it into scratch database listmonk_restore_test, counts subscribers,
# then drops the scratch database.
#
# POSIX sh (runs in the alpine backup image). Usage from the host:
#   docker compose run --rm --no-deps -v "$PWD/restore.sh:/restore.sh:ro" backup /restore.sh [s3-key]
# The backup image has aws-cli only after its entrypoint runs, so this script
# installs it when missing.
set -euo pipefail

: "${BACKUP_BUCKET:?BACKUP_BUCKET is required}"
SCRATCH=listmonk_restore_test
key="${1:-}"

command -v aws >/dev/null 2>&1 || apk add --no-cache aws-cli >/dev/null

if [ -z "$key" ]; then
  key=$(aws s3api list-objects-v2 --bucket "$BACKUP_BUCKET" --prefix listmonk/ \
    --query 'sort_by(Contents,&LastModified)[-1].Key' --output text)
  [ -n "$key" ] && [ "$key" != "None" ] || { echo "no backups found" >&2; exit 1; }
fi
echo "restoring s3://${BACKUP_BUCKET}/${key}"

tmp=$(mktemp)
cleanup() {
  rm -f "$tmp"
  psql -d postgres -qc "DROP DATABASE IF EXISTS ${SCRATCH};" || true
}
trap cleanup EXIT

aws s3 cp "s3://${BACKUP_BUCKET}/${key}" "$tmp" --only-show-errors
gunzip -c "$tmp" >"$tmp.dump"
trap 'rm -f "$tmp" "$tmp.dump"; psql -d postgres -qc "DROP DATABASE IF EXISTS ${SCRATCH};" || true' EXIT

psql -d postgres -qc "DROP DATABASE IF EXISTS ${SCRATCH};"
psql -d postgres -qc "CREATE DATABASE ${SCRATCH};"
pg_restore --no-owner --no-privileges -d "$SCRATCH" "$tmp.dump"

count=$(psql -d "$SCRATCH" -Atc "SELECT count(*) FROM subscribers;")
echo "sanity: subscribers = ${count}"
[ "$count" -gt 0 ] || { echo "restore produced zero subscribers" >&2; exit 1; }
echo "restore test PASSED; dropping ${SCRATCH}"
