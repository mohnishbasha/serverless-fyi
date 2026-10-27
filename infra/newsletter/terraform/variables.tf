variable "region" {
  description = "AWS region for SES, SNS, S3 and the optional instance."
  type        = string
  default     = "us-east-1"
}

variable "domain" {
  description = "Sending domain verified in SES."
  type        = string
  default     = "serverless.fyi"
}

variable "mail_from_subdomain" {
  description = "Subdomain label for the custom MAIL FROM domain."
  type        = string
  default     = "mail"
}

variable "lists_hostname" {
  description = "Public hostname of the listmonk server."
  type        = string
  default     = "lists.serverless.fyi"
}

variable "bounce_webhook_url" {
  description = "HTTPS URL SNS posts bounce/complaint events to."
  type        = string
  default     = "https://lists.serverless.fyi/webhooks/service/ses"
}

variable "backup_retention_days" {
  description = "Days after which current and noncurrent backup objects expire."
  type        = number
  default     = 30
}

variable "backup_bucket_name" {
  description = "Backup bucket name. Empty = serverlessfyi-listmonk-backups-<account id>."
  type        = string
  default     = ""
}

variable "create_instance" {
  description = "Create the optional Lightsail instance, static IP and firewall."
  type        = bool
  default     = false
}

variable "instance_name" {
  description = "Lightsail instance name."
  type        = string
  default     = "listmonk"
}

variable "instance_bundle_id" {
  description = "Lightsail bundle (micro_3_0 = 1 GB RAM; nano_3_0 = 512 MB is tight)."
  type        = string
  default     = "micro_3_0"
}

variable "instance_availability_zone" {
  description = "Lightsail AZ."
  type        = string
  default     = "us-east-1a"
}

variable "instance_key_pair_name" {
  description = "Existing Lightsail key pair for SSH (empty = default key pair)."
  type        = string
  default     = ""
}

variable "ssh_allowed_cidrs" {
  description = "CIDRs allowed to SSH to the instance."
  type        = list(string)
  default     = []
}
