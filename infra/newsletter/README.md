# Self-hosted newsletter infrastructure

Infrastructure as code for the Phase B newsletter stack (PROMPT.md section 8.1, Sprint 9): listmonk for list management, Amazon SES for delivery. Nothing here is applied automatically; the owner runs it. 👤 marks owner actions.

## Architecture

- listmonk (single Go binary) plus PostgreSQL 17, run with Docker Compose on one small Lightsail or EC2 instance.
- Caddy terminates HTTPS (automatic certificates) at `lists.serverless.fyi`. The admin UI and authenticated API are limited to an IP allowlist; public subscription, link, archive and bounce webhook paths are open.
- Amazon SES sends mail over SMTP (port 587) from `serverless.fyi`, with custom MAIL FROM `mail.serverless.fyi`.
- Bounces and complaints flow SES, then SNS, then the listmonk webhook at `/webhooks/service/ses`.
- A `backup` container runs `pg_dump` nightly to a versioned, KMS-encrypted S3 bucket with 30-day retention.

Files:

| File                       | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `docker-compose.yml`       | db, app (listmonk), caddy, backup                   |
| `Caddyfile`                | HTTPS, security headers, admin allowlist            |
| `.env.example`             | all variables, no secrets                           |
| `backup.sh` / `restore.sh` | nightly dump, monthly restore test                  |
| `terraform/`               | SES, SNS, S3, KMS, IAM, optional Lightsail instance |

## Prerequisites

- AWS account and credentials with rights to create the resources in `terraform/`.
- Terraform 1.9 or newer; Docker with the compose plugin on the host.
- Control of DNS for `serverless.fyi`.
- A physical mailing address for the email footer (CAN-SPAM).
- The Beehiiv subscriber CSV export.

## Bring-up

1. 👤 Request SES production access (leave the sandbox) right away; approval takes days. See `terraform/README.md`.
2. 👤 Terraform: `cd terraform && terraform init && terraform plan -out plan && terraform apply plan`. Add `-var create_instance=true` to create the optional Lightsail host and static IP (also set `ssh_allowed_cidrs`).
3. 👤 Add the DNS records (below). Wait for SES to show the identity as verified.
4. On the host: `git clone` this repo, `cd infra/newsletter`, `cp .env.example .env`, and fill in every value from the Terraform outputs.
5. `docker compose up -d`. Caddy obtains the certificate once DNS for `lists.serverless.fyi` points at the host. Check `docker compose ps` and `docker compose logs app`.
6. Re-run `terraform apply` if the SNS subscription could not auto-confirm earlier (listmonk must be reachable first).
7. 👤 Configure listmonk (below), import subscribers, test, warm up.

## DNS records

| Type     | Name                                | Value                                                  |
| -------- | ----------------------------------- | ------------------------------------------------------ |
| CNAME x3 | `<token>._domainkey.serverless.fyi` | `<token>.dkim.amazonses.com` (Easy DKIM; from outputs) |
| MX       | `mail.serverless.fyi`               | `10 feedback-smtp.<region>.amazonses.com`              |
| TXT      | `mail.serverless.fyi`               | `v=spf1 include:amazonses.com ~all`                    |
| TXT      | `_dmarc.serverless.fyi`             | `v=DMARC1; p=none; rua=mailto:dmarc@serverless.fyi`    |
| A / AAAA | `lists.serverless.fyi`              | static IP of the host                                  |

Start DMARC at `p=none`. After 30 clean days (reports show aligned SPF and DKIM), change it to `p=quarantine`.

## listmonk settings (Settings in the admin UI)

- SMTP: host `email-smtp.<region>.amazonaws.com`, port 587, auth LOGIN, STARTTLS, username and password from `terraform output` (`smtp_username`, `smtp_password`). Optionally add the header `X-SES-CONFIGURATION-SET: listmonk` so events reach SNS.
- General: root URL `https://lists.serverless.fyi`, from email `2 Minute Serverless <newsletter@serverless.fyi>`.
- Opt-in: double opt-in on each list; enable the public subscription page; keep the archive public if desired.
- Bounces: enable bounce processing, enable the bounce webhook, enable the SES type; set actions so hard bounces and complaints blocklist the subscriber.
- Privacy: turn on `List-Unsubscribe` header and one-click (`List-Unsubscribe-Post`); allow self-service unsubscribe.
- Templates: put the physical mailing address in the campaign template footer (see `email/template.html`).

## Importing the Beehiiv CSV

👤 In Subscribers, Import: choose overwrite off, subscribe to the target list, and map columns. Use a CSV with `email`, `name`, `attributes`, and `created_at`-style data. listmonk imports with status "unconfirmed" unless the list is single opt-in, so import with the list set as already confirmed (use the "Subscribe" mode and the import option that skips the opt-in email, or temporarily set the list to single opt-in, import, then switch back to double). Preserve signup timestamps as consent evidence: put the Beehiiv created date in a subscriber attribute (for example `beehiiv_signup_at`), or load the `created_at` column directly into the database with the import SQL if needed. Keep the original CSV privately.

## Warm-up

Send the first issues in three batches while watching SES: 25% of the list, then 50%, then 100%. Use a segment or the campaign's list-split by creating sub-lists from the import. Proceed only if bounce rate stays below 2% and complaint rate below 0.1% (SES reputation dashboard). Pause and investigate otherwise.

## Backups and restore test

`backup.sh` runs nightly at `BACKUP_HOUR_UTC`:15 and writes to `s3://$BACKUP_BUCKET/listmonk/YYYY/MM/DD/listmonk-<timestamp>.dump.gz`. Run a one-off with `docker compose exec backup /backup.sh`.

👤 Monthly restore test (loads into scratch database `listmonk_restore_test`, counts subscribers, drops it):

```bash
docker compose run --rm --no-deps -v "$PWD/restore.sh:/restore.sh:ro" backup /restore.sh
```

Pass an S3 key as the first argument to restore a specific backup. Note: the `backup` service entrypoint installs aws-cli; the one-off run above overrides nothing, so use `docker compose exec backup sh /restore.sh` when the service is already running.

## Site integration

The site form posts to `https://lists.serverless.fyi/subscription/form` with fields `email`, `l=<list uuid>` (public list UUID, listed on the Forms page), and the `nonce` honeypot (must stay empty). The request is cross-origin using `fetch` with mode `no-cors`, so no CORS configuration is needed.

Repository variables for the site build:

- `PUBLIC_NEWSLETTER_PROVIDER=listmonk`
- `PUBLIC_NEWSLETTER_ID=<list uuid>`
- `PUBLIC_NEWSLETTER_URL=https://lists.serverless.fyi`

For `.github/workflows/newsletter-draft.yml`: secrets `LISTMONK_API_USER` and `LISTMONK_API_TOKEN` (create an API user in listmonk, Users, with campaign permissions only) and variable `LISTMONK_LIST_ID`.
