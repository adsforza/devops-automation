# Infraestructura (Terraform)

Recursos principales:
- KMS CMK por entorno (alias `${project}-${environment}-cmk`)
- S3 auditoría con Object Lock (WORM) y SSE-KMS
- RDS PostgreSQL 16 en subredes privadas (encriptado con KMS)

## Prerrequisitos
- Terraform >= 1.6
- Credenciales AWS (perfil o variables)
- VPC y subredes privadas existentes (pasar `vpc_id` y `private_subnet_ids`)

## Variables clave
- `project` (default `automation`)
- `environment` (default `dev`)
- `region` (default `us-east-1`)
- `db_username`, `db_password`
- `vpc_id`, `private_subnet_ids`

## Uso
```bash
cd infrastructure/terraform
terraform init
terraform plan -var "vpc_id=vpc-xxxxxxxx" -var 'private_subnet_ids=["subnet-aaa","subnet-bbb"]' -var "db_password=StrongPass!" -out tfplan
terraform apply tfplan
```

## Outputs
- `kms_key_arn`, `audit_bucket`, `rds_endpoint`

Integra estos outputs en el backend `.env` (`KMS_KEY_ID`, `AUDIT_S3_BUCKET`, `DATABASE_URL`).