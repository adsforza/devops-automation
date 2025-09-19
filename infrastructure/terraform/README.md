# Infraestructura (Terraform)

Recursos principales:
- KMS CMK por entorno (alias `${project}-${environment}-cmk`)
- S3 auditoría con Object Lock (WORM) y SSE-KMS
- RDS PostgreSQL 16 en subredes privadas (encriptado con KMS)
- Backend: ECS Fargate + ALB + WAF (listener HTTP 80 demo; usar ACM 443 en prod)
- Frontend: S3 + CloudFront (OAC)

## Prerrequisitos
- Terraform >= 1.6
- Credenciales AWS
- VPC y subredes privadas (`vpc_id`, `private_subnet_ids`)

## Variables clave
- `project`, `environment`, `region`
- `db_username`, `db_password`
- `backend_image` (ECR imagen del backend)

## Pasos
```bash
cd infrastructure/terraform
terraform init
terraform plan \
  -var "vpc_id=vpc-xxx" \
  -var 'private_subnet_ids=["subnet-a","subnet-b"]' \
  -var "db_password=StrongPass!" \
  -var "backend_image=xxxxxxxx.dkr.ecr.us-east-1.amazonaws.com/automation-backend:latest" \
  -out tfplan
terraform apply tfplan
```

## Outputs
- `kms_key_arn`, `audit_bucket`, `rds_endpoint`
- `alb_dns` (backend público demo), `frontend_bucket`, `frontend_cdn_domain`

Notas:
- Para TLS en ALB, agrega listener 443 con ACM y redirección desde 80.
- Ajusta SGs para restringir orígenes.
- Considera API Gateway + Lambda si prefieres serverless.