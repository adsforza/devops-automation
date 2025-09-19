# Aplicación de Automatización de Scripts — Backend

Backend seguro para automatizar ejecución de scripts y operaciones transaccionales en bases de datos sensibles, con autenticación vía AWS Identity Center (OIDC), RBAC granular, auditoría inmutable y cifrado con AWS KMS.

## Características clave
- Autenticación OIDC (Authorization Code + PKCE) con AWS Identity Center
- Sesiones seguras con cookies HttpOnly/Secure y expiración
- RBAC por recurso: base de datos/schema/tabla/script × operación (SELECT/INSERT/UPDATE/DELETE/EXECUTE)
- Gestión de conexiones a BD (PostgreSQL, MySQL, SQL Server, Oracle) con credenciales cifradas (KMS envelope)
- Registro y versionado de scripts con validación y metadatos
- Ejecución parametrizada en transacciones ACID con logs
- Endpoint CRUD JSON con previsualización (dry-run) y permisos por operación
- Auditoría inmutable con hash encadenado y export a S3 Object Lock
- OpenAPI/Swagger auto-generado

## Stack técnico
- Node.js 20, TypeScript 5
- Express 5, Zod (validación), Helmet (seguridad), Rate limit
- Prisma ORM (PostgreSQL como DB de la app)
- AWS SDK v3 (KMS, Secrets Manager, S3), jose (JWT), cookie
- Jest + Supertest (tests), ts-jest

## Estructura (propuesta)
```
backend/
  src/
    app.ts
    server.ts
    config/
      env.ts
      security.ts
    auth/
      oidc.ts
      session.ts
      middleware.ts
    rbac/
      permissions.ts
      guard.ts
    db/
      prisma.ts
      connections/
        connector.ts
        postgres.ts
        mysql.ts
        sqlserver.ts
        oracle.ts
    modules/
      users/
      scripts/
      executions/
      crud/
      audit/
    common/
      errors.ts
      logger.ts
      utils.ts
  prisma/
    schema.prisma
    migrations/
  openapi/
  scripts/
  package.json
```

## Requisitos
- Node.js ≥ 20.x, pnpm o npm
- PostgreSQL 15/16 para la base de datos de la aplicación
- Cuenta AWS con KMS, Secrets Manager, S3 (para auditoría), Identity Center configurado

## Variables de entorno
Crea un archivo `.env` en `backend/` (no lo subas al repositorio):
```env
NODE_ENV=development
PORT=4000
APP_BASE_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:5173

# Sesión
SESSION_SECRET=changeme-32+chars
COOKIE_NAME=app_session
COOKIE_SAME_SITE=Lax
COOKIE_SECURE=false

# Base de datos app (Prisma)
DATABASE_URL=postgresql://user:pass@localhost:5432/appdb?schema=public

# AWS
AWS_REGION=us-east-1
KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AUDIT_S3_BUCKET=org-app-dev-audit
AUDIT_S3_OBJECT_LOCK=true

# OIDC (AWS Identity Center)
OIDC_ISSUER_URL=https://<your-identity-center-domain>/oauth2
OIDC_CLIENT_ID=xxxxxxxxxxxxxxxx
OIDC_CLIENT_SECRET=xxxxxxxxxxxxxxxx
OIDC_REDIRECT_URI=http://localhost:4000/auth/callback
TOKEN_ROTATION_SECONDS=300

# Seguridad
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
CSP_DEFAULT_SRC='self'
```

## Puesta en marcha local
1. Instala dependencias
```bash
pnpm install
```
2. Genera Prisma client, migra BD y (opcional) datos semilla
```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```
3. Arranca en desarrollo
```bash
pnpm dev
```
4. Ejecuta tests
```bash
pnpm test
```

Scripts útiles (sugeridos en `package.json`):
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:seed": "ts-node scripts/seed.ts",
    "lint": "eslint .",
    "test": "jest --coverage"
  }
}
```

## Endpoints principales (resumen)
- `GET /auth/login` → redirige a AWS SSO (OIDC)
- `GET /auth/callback` → intercambio de code, crea sesión segura
- `POST /auth/logout` → invalida sesión
- `GET /me` → info de sesión y permisos
- `POST /db-connections` | `GET /db-connections` | `PUT/DELETE /db-connections/:id` | `POST /db-connections/:id/test`
- `POST /scripts` | `POST /scripts/:id/versions` | `GET /scripts` | `GET /scripts/:id/versions`
- `POST /executions` | `GET /executions/:id`
- `POST /crud?dryRun=true|false`
- `GET /audit` | `GET /changes` | `GET /changes/:table/:pk`
- OpenAPI: `GET /docs` (Swagger UI), `GET /openapi.json`

## RBAC
- Roles predeterminados: `SuperAdmin`, `DatabaseAdmin`, `ScriptExecutor`, `ReadOnlyUser`.
- Permisos evaluados por request. Política: `deny > allow` y `user_override > role_inherited`.
- Cache LRU por sesión con invalidación al cambiar permisos.

## Auditoría inmutable
- Modelo append-only: `curr_hash = hash(prev_hash || payload)`.
- Replicación periódica a `S3` con `Object Lock` y cifrado `SSE-KMS`.

## Seguridad
- TLS 1.3 (en entornos), HSTS, CSP estricta, Referrer-Policy, X-Frame-Options, X-Content-Type-Options
- Validación con Zod; SQL estrictamente parametrizado
- Rate limiting, CORS restringido, Helmet, tamaño de payload limitado
- Principio de menor privilegio (IAM, KMS, RDS), secretos en Secrets Manager

## Observabilidad
- CloudWatch Logs (prod), métricas (latencia p95, tasa error, ejecuciones)
- Alertas: 5xx, p95>2s, auth failures, anomalías de uso

## CI/CD (sugerido)
- GitHub Actions
  - `lint → test → build → prisma migrate deploy → deploy`
- Escaneos de seguridad (SAST/DAST/SCA) y revisión de IaC

## Despliegue AWS (alto nivel)
- API Gateway + WAF + Lambda/ECS
- RDS Postgres (subnets privadas, SGs estrictos, cifrado at-rest)
- Secrets Manager y KMS (CMK por entorno)
- S3 auditoría (bloqueo público, Object Lock)

## Troubleshooting
- 401/redirect loop: revisa `CORS_ORIGIN`, cookies `Secure/SameSite` y `OIDC_REDIRECT_URI`
- Timeouts a BD: valida SG/NACL, pool y timeouts del driver
- Errores KMS: verifica permisos `kms:Encrypt/Decrypt` para la role del servicio

## Licencia
MIT (ajustar según política de la organización)