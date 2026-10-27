# Terraform: SES, SNS, S3 backups, IAM (and optional Lightsail host)

Nothing here is applied automatically. The owner runs it.

```bash
terraform init
terraform plan -out plan
terraform apply plan
```

Then:

1. Create the DNS records from the outputs (`terraform output dkim_cname_records mail_from_mx_record mail_from_spf_record dmarc_record`).
2. Read secrets with `terraform output -raw smtp_username` and `terraform output -raw smtp_password`. The password is `aws_iam_access_key.ses_smtp.ses_smtp_password_v4`, the SigV4-derived SES SMTP password, which is not the IAM secret key. It is bound to `var.region`.
3. Put the backup values (`backup_bucket`, `backup_kms_key_arn`, `backup_access_key_id`, `backup_secret_access_key`) into `../.env`.
4. Enter the SMTP settings in listmonk (see `../README.md`).

Notes:

- 👤 Request SES production access (leave the sandbox) early; approval takes days. Console: SES, Account dashboard, Request production access. CLI: `aws sesv2 put-account-details --production-access-enabled --mail-type MARKETING --website-url https://www.serverless.fyi --use-case-description "..." --contact-language EN`.
- The SNS HTTPS subscription auto-confirms only if listmonk is already reachable at `bounce_webhook_url`. Apply with `-var create_instance=true` first, bring the stack up, then apply again; or re-apply later.
- Configure remote state by uncommenting the `backend "s3"` block in `versions.tf`.
- Set `create_instance = true` (and `ssh_allowed_cidrs`) for the optional Lightsail host; cloud-init installs Docker and the compose plugin.
