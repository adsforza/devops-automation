locals {
	name_prefix = "${var.project}-${var.environment}"
}

# KMS CMK
resource "aws_kms_key" "cmk" {
	description             = "${local.name_prefix}-cmk"
	deletion_window_in_days = 7
	multi_region            = false
}

resource "aws_kms_alias" "cmk_alias" {
	name          = "alias/${local.name_prefix}-cmk"
	target_key_id = aws_kms_key.cmk.id
}

# S3 bucket for audit with Object Lock (WORM)
resource "aws_s3_bucket" "audit" {
	bucket = "${local.name_prefix}-audit"
	object_lock_enabled = true
}

resource "aws_s3_bucket_versioning" "audit" {
	bucket = aws_s3_bucket.audit.id
	versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audit" {
	bucket = aws_s3_bucket.audit.id
	rule { apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" kms_master_key_id = aws_kms_key.cmk.arn } }
}

resource "aws_s3_bucket_public_access_block" "audit" {
	bucket = aws_s3_bucket.audit.id
	block_public_acls   = true
	block_public_policy = true
	ignore_public_acls  = true
	restrict_public_buckets = true
}

resource "aws_s3_bucket_object_lock_configuration" "audit" {
	bucket = aws_s3_bucket.audit.id
	object_lock_configuration {
		object_lock_enabled = "Enabled"
		rule { default_retention { mode = "COMPLIANCE" days = var.audit_retention_days } }
	}
}

# Networking placeholders (use pre-existing VPC/subnets or create your own)
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }

resource "aws_db_subnet_group" "rds" {
	name       = "${local.name_prefix}-rds-subnets"
	subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "rds" {
	name        = "${local.name_prefix}-rds-sg"
	description = "RDS security group"
	vpc_id      = var.vpc_id
	ingress { description = "App access" from_port = 5432 to_port = 5432 protocol = "tcp" cidr_blocks = ["10.0.0.0/8"] }
	egress  { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
	identifier              = "${local.name_prefix}-rds"
	engine                  = "postgres"
	engine_version          = "16"
	instance_class          = var.db_instance_class
	allocated_storage       = var.db_allocated_storage
	db_name                 = "appdb"
	username                = var.db_username
	password                = var.db_password
	storage_encrypted       = true
	kms_key_id              = aws_kms_key.cmk.arn
	backup_retention_period = 7
	multi_az                = false
	publicly_accessible     = false
	vpc_security_group_ids  = [aws_security_group.rds.id]
	db_subnet_group_name    = aws_db_subnet_group.rds.name
	skip_final_snapshot     = true
}

output "kms_key_arn" { value = aws_kms_key.cmk.arn }
output "audit_bucket" { value = aws_s3_bucket.audit.bucket }
output "rds_endpoint" { value = aws_db_instance.postgres.address }