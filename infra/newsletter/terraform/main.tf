data "aws_caller_identity" "current" {}

locals {
  mail_from_domain = "${var.mail_from_subdomain}.${var.domain}"
  backup_bucket    = var.backup_bucket_name != "" ? var.backup_bucket_name : "serverlessfyi-listmonk-backups-${data.aws_caller_identity.current.account_id}"
}

# ---------------------------------------------------------------- SES

resource "aws_sesv2_email_identity" "domain" {
  email_identity         = var.domain
  configuration_set_name = aws_sesv2_configuration_set.listmonk.configuration_set_name

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }
}

resource "aws_sesv2_email_identity_mail_from_attributes" "domain" {
  email_identity         = aws_sesv2_email_identity.domain.email_identity
  mail_from_domain       = local.mail_from_domain
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

resource "aws_sesv2_configuration_set" "listmonk" {
  configuration_set_name = "listmonk"

  reputation_options {
    reputation_metrics_enabled = true
  }

  sending_options {
    sending_enabled = true
  }

  delivery_options {
    tls_policy = "REQUIRE"
  }
}

# ---------------------------------------------------------------- SNS

resource "aws_sns_topic" "ses_events" {
  name = "listmonk-ses-events"
}

data "aws_iam_policy_document" "sns_from_ses" {
  statement {
    sid       = "AllowSESPublish"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.ses_events.arn]

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "ses_events" {
  arn    = aws_sns_topic.ses_events.arn
  policy = data.aws_iam_policy_document.sns_from_ses.json
}

resource "aws_sesv2_configuration_set_event_destination" "sns" {
  configuration_set_name = aws_sesv2_configuration_set.listmonk.configuration_set_name
  event_destination_name = "bounces-complaints-to-sns"

  event_destination {
    enabled              = true
    matching_event_types = ["BOUNCE", "COMPLAINT"]

    sns_destination {
      topic_arn = aws_sns_topic.ses_events.arn
    }
  }

  depends_on = [aws_sns_topic_policy.ses_events]
}

# Requires listmonk to be reachable at bounce_webhook_url (Caddy up, bounce
# webhook enabled) when applied; with endpoint_auto_confirms listmonk's SES
# handler confirms the subscription automatically.
resource "aws_sns_topic_subscription" "listmonk_webhook" {
  topic_arn              = aws_sns_topic.ses_events.arn
  protocol               = "https"
  endpoint               = var.bounce_webhook_url
  endpoint_auto_confirms = true
}

# ---------------------------------------------------------------- IAM: SES SMTP user

resource "aws_iam_user" "ses_smtp" {
  name = "listmonk-ses-smtp"
}

data "aws_iam_policy_document" "ses_send" {
  statement {
    sid     = "SendViaDomainIdentity"
    actions = ["ses:SendRawEmail", "ses:SendEmail"]
    resources = [
      aws_sesv2_email_identity.domain.arn,
      aws_sesv2_configuration_set.listmonk.arn,
    ]
  }
}

resource "aws_iam_user_policy" "ses_send" {
  name   = "ses-send"
  user   = aws_iam_user.ses_smtp.name
  policy = data.aws_iam_policy_document.ses_send.json
}

resource "aws_iam_access_key" "ses_smtp" {
  user = aws_iam_user.ses_smtp.name
}

# ---------------------------------------------------------------- S3 backups + KMS

resource "aws_kms_key" "backup" {
  description             = "listmonk backup encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

resource "aws_kms_alias" "backup" {
  name          = "alias/listmonk-backup"
  target_key_id = aws_kms_key.backup.key_id
}

resource "aws_s3_bucket" "backup" {
  bucket = local.backup_bucket
}

resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.backup.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket                  = aws_s3_bucket.backup.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    id     = "expire-backups"
    status = "Enabled"

    filter {}

    expiration {
      days = var.backup_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = var.backup_retention_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.backup]
}

# ---------------------------------------------------------------- IAM: backup user

resource "aws_iam_user" "backup" {
  name = "listmonk-backup"
}

data "aws_iam_policy_document" "backup" {
  statement {
    sid       = "ListBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.backup.arn]
  }

  statement {
    sid       = "ObjectAccess"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.backup.arn}/*"]
  }

  statement {
    sid       = "Kms"
    actions   = ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"]
    resources = [aws_kms_key.backup.arn]
  }
}

resource "aws_iam_user_policy" "backup" {
  name   = "backup"
  user   = aws_iam_user.backup.name
  policy = data.aws_iam_policy_document.backup.json
}

resource "aws_iam_access_key" "backup" {
  user = aws_iam_user.backup.name
}

# ---------------------------------------------------------------- Optional Lightsail host

resource "aws_lightsail_instance" "listmonk" {
  count = var.create_instance ? 1 : 0

  name              = var.instance_name
  availability_zone = var.instance_availability_zone
  blueprint_id      = "ubuntu_24_04"
  bundle_id         = var.instance_bundle_id
  key_pair_name     = var.instance_key_pair_name != "" ? var.instance_key_pair_name : null

  user_data = <<-EOT
    #!/bin/bash
    set -euxo pipefail
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y ca-certificates curl gnupg git
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    usermod -aG docker ubuntu
  EOT
}

resource "aws_lightsail_static_ip" "listmonk" {
  count = var.create_instance ? 1 : 0
  name  = "${var.instance_name}-ip"
}

resource "aws_lightsail_static_ip_attachment" "listmonk" {
  count          = var.create_instance ? 1 : 0
  static_ip_name = aws_lightsail_static_ip.listmonk[0].name
  instance_name  = aws_lightsail_instance.listmonk[0].name
}

resource "aws_lightsail_instance_public_ports" "listmonk" {
  count         = var.create_instance ? 1 : 0
  instance_name = aws_lightsail_instance.listmonk[0].name

  dynamic "port_info" {
    for_each = length(var.ssh_allowed_cidrs) > 0 ? [1] : []
    content {
      protocol  = "tcp"
      from_port = 22
      to_port   = 22
      cidrs     = var.ssh_allowed_cidrs
    }
  }

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
  }

  port_info {
    protocol  = "udp"
    from_port = 443
    to_port   = 443
  }
}
