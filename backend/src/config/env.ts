import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	PORT: z.coerce.number().default(4000),
	APP_BASE_URL: z.string().url().default('http://localhost:4000'),
	CORS_ORIGIN: z.string().default('http://localhost:5173'),

	SESSION_SECRET: z.string().min(32),
	COOKIE_NAME: z.string().default('app_session'),
	COOKIE_SAME_SITE: z.enum(['Lax', 'Strict', 'None']).default('Lax'),
	COOKIE_SECURE: z.coerce.boolean().default(false),

	DATABASE_URL: z.string().optional(),

	AWS_REGION: z.string().default('us-east-1'),
	KMS_KEY_ID: z.string().optional(),
	AUDIT_S3_BUCKET: z.string().optional(),
	AUDIT_S3_OBJECT_LOCK: z.coerce.boolean().optional().default(true),

	OIDC_ISSUER_URL: z.string().url().optional(),
	OIDC_CLIENT_ID: z.string().optional(),
	OIDC_CLIENT_SECRET: z.string().optional(),
	OIDC_REDIRECT_URI: z.string().url().optional(),
	TOKEN_ROTATION_SECONDS: z.coerce.number().default(300),

	RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
	RATE_LIMIT_MAX: z.coerce.number().default(100),
	CSP_DEFAULT_SRC: z.string().default("'self'"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);