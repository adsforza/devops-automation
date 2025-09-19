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

## Integración CI/CD con CodeCommit/CodeBuild/CodePipeline (resumen)
- Repositorio: CodeCommit con el contenido del monorepo
- Pipelines sugeridas:
  - Backend (Docker a ECR): usa `buildspec-backend.yml`, variable SSM `ECR_BACKEND_URL` con el repo de ECR
  - Frontend (S3/CF): usa `buildspec-frontend.yml`, variable SSM `FRONTEND_BUCKET`
  - Terraform (infra): usa `buildspec-terraform.yml`, rol con permisos para `plan/apply`

### Pasos
1) Crear ECR (ya en Terraform: output `ecr_backend_url`). Guardar en SSM `/${project}/${environment}/ecr_backend_url`.
2) Crear bucket frontend (output `frontend_bucket`) y guardar en SSM `/${project}/${environment}/frontend_bucket`.
3) Crear proyectos de CodeBuild para cada buildspec; adjuntar roles mínimos (ECR, S3, CloudFront, Terraform).
4) Crear CodePipeline con fuentes de CodeCommit y stages de Build/Deploy según corresponda.

Ajusta variables `ENV`, roles y permisos según entorno.