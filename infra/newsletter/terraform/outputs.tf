output "dkim_cname_records" {
  description = "Create these three CNAMEs (name -> value) at your DNS provider."
  value = [
    for t in aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens : {
      type  = "CNAME"
      name  = "${t}._domainkey.${var.domain}"
      value = "${t}.dkim.amazonses.com"
    }
  ]
}

output "mail_from_mx_record" {
  description = "MX record for the custom MAIL FROM domain."
  value = {
    type     = "MX"
    name     = local.mail_from_domain
    value    = "feedback-smtp.${var.region}.amazonses.com"
    priority = 10
  }
}

output "mail_from_spf_record" {
  description = "SPF TXT record for the custom MAIL FROM domain."
  value = {
    type  = "TXT"
    name  = local.mail_from_domain
    value = "v=spf1 include:amazonses.com ~all"
  }
}

output "dmarc_record" {
  description = "Start with p=none; move to quarantine after 30 clean days."
  value = {
    type  = "TXT"
    name  = "_dmarc.${var.domain}"
    value = "v=DMARC1; p=none; rua=mailto:dmarc@${var.domain}; adkim=s; aspf=s"
  }
}

output "lists_hostname" {
  value = var.lists_hostname
}

output "lists_static_ip" {
  description = "Create A (and AAAA if applicable) for lists_hostname pointing here."
  value       = var.create_instance ? aws_lightsail_static_ip.listmonk[0].ip_address : null
}

output "smtp_endpoint" {
  value = "email-smtp.${var.region}.amazonaws.com:587"
}

output "smtp_username" {
  description = "SES SMTP username (the IAM access key id)."
  value       = aws_iam_access_key.ses_smtp.id
  sensitive   = true
}

output "smtp_password" {
  description = "SES SMTP password (SigV4-derived from the secret key; region-bound)."
  value       = aws_iam_access_key.ses_smtp.ses_smtp_password_v4
  sensitive   = true
}

output "ses_configuration_set" {
  value = aws_sesv2_configuration_set.listmonk.configuration_set_name
}

output "sns_topic_arn" {
  value = aws_sns_topic.ses_events.arn
}

output "backup_bucket" {
  value = aws_s3_bucket.backup.bucket
}

output "backup_kms_key_arn" {
  value = aws_kms_key.backup.arn
}

output "backup_access_key_id" {
  value     = aws_iam_access_key.backup.id
  sensitive = true
}

output "backup_secret_access_key" {
  value     = aws_iam_access_key.backup.secret
  sensitive = true
}
