terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Remote state (recommended). Create an S3 bucket (versioned, encrypted) first,
  # then uncomment and run `terraform init -migrate-state`:
  #
  # backend "s3" {
  #   bucket       = "your-tfstate-bucket"
  #   key          = "serverlessfyi/newsletter/terraform.tfstate"
  #   region       = "us-east-1"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "serverlessfyi-newsletter"
      ManagedBy = "terraform"
    }
  }
}
