variable "frontend_domain" { type = string default = null }

resource "aws_s3_bucket" "frontend" {
	bucket = "${local.name_prefix}-frontend"
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
	bucket = aws_s3_bucket.frontend.id
	rule { object_ownership = "BucketOwnerPreferred" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
	bucket = aws_s3_bucket.frontend.id
	block_public_acls   = true
	block_public_policy = true
	ignore_public_acls  = true
	restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "oac" {
	name                              = "${local.name_prefix}-oac"
	origin_access_control_origin_type = "s3"
	signing_behavior                  = "always"
	signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
	enabled             = true
	default_root_object = "index.html"
	origin {
		domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
		origin_id   = "s3-frontend"
		origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
	}
	default_cache_behavior {
		target_origin_id       = "s3-frontend"
		viewer_protocol_policy = "redirect-to-https"
		allowed_methods        = ["GET", "HEAD", "OPTIONS"]
		cached_methods         = ["GET", "HEAD"]
		compress               = true
		forwarded_values { query_string = true cookies { forward = "none" } }
	}
	viewer_certificate { cloudfront_default_certificate = true }
	restrictions { geo_restriction { restriction_type = "none" } }
}

output "frontend_bucket" { value = aws_s3_bucket.frontend.bucket }
output "frontend_cdn_domain" { value = aws_cloudfront_distribution.frontend.domain_name }