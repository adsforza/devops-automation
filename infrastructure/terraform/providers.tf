variable "region" {
	type        = string
	default     = "us-east-1"
	description = "AWS region"
}

provider "aws" {
	region = var.region
}