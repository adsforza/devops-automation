resource "aws_ecr_repository" "backend" {
	name                 = "${local.name_prefix}-backend"
	image_scanning_configuration { scan_on_push = true }
	encryption_configuration { encryption_type = "KMS" kms_key = aws_kms_key.cmk.arn }
	image_tag_mutability = "MUTABLE"
}

output "ecr_backend_url" { value = aws_ecr_repository.backend.repository_url }