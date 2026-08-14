terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 6.0" }
  }
}

variable "project_id" { type = string }
variable "global_domain" { type = string default = "royalcommand.ai" }

provider "google" { project = var.project_id }

locals {
  regions = {
    us_primary    = "us-central1"
    us_secondary  = "us-west1"
    eu_primary    = "europe-west3"
    eu_secondary  = "europe-west4"
    uk_primary    = "europe-west2"
    uk_secondary  = "europe-west1"
    apac_primary  = "australia-southeast1"
  }
}

resource "google_storage_bucket" "global_core" {
  name                        = "${var.project_id}-royal-command-global-core"
  location                    = "US"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning { enabled = true }
}

resource "google_storage_bucket" "eu_core" {
  name                        = "${var.project_id}-royal-command-eu-core"
  location                    = "EU"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning { enabled = true }
}

resource "google_storage_bucket" "uk_core" {
  name                        = "${var.project_id}-royal-command-uk-core"
  location                    = "EUROPE-WEST2"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning { enabled = true }
}

resource "google_storage_bucket" "apac_core" {
  name                        = "${var.project_id}-royal-command-apac-core"
  location                    = "AUSTRALIA-SOUTHEAST1"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning { enabled = true }
}

# Network/load-balancer resources are intentionally split by regional module in the next phase.
# Cloud DNS failover records should point to health-checked forwarding rules or external endpoints.
# Do not apply DNS changes until domain ownership, current authoritative nameservers, and rollback targets are verified.

output "region_map" { value = local.regions }
