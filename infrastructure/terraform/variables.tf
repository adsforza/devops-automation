variable "project" { type = string default = "automation" }
variable "environment" { type = string default = "dev" }
variable "region" { type = string default = "us-east-1" }

variable "db_username" { type = string default = "app" }
variable "db_password" { type = string sensitive = true }
variable "db_instance_class" { type = string default = "db.t4g.micro" }
variable "db_allocated_storage" { type = number default = 20 }

variable "audit_retention_days" { type = number default = 3650 }