import { z } from 'zod';

export const DbEngineEnum = z.enum(['postgres', 'mysql', 'sqlserver', 'oracle']);

export const CreateConnectionSchema = z.object({
	name: z.string().min(3),
	engine: DbEngineEnum,
	host: z.string().min(1),
	port: z.number().int().positive(),
	database: z.string().min(1),
	username: z.string().min(1),
	password: z.string().min(1),
	options: z.record(z.any()).optional(),
	kmsKeyId: z.string().optional(),
});

export type CreateConnectionInput = z.infer<typeof CreateConnectionSchema>;

export const UpdateConnectionSchema = CreateConnectionSchema.partial();
export type UpdateConnectionInput = z.infer<typeof UpdateConnectionSchema>;