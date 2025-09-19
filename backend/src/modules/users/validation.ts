import { z } from 'zod';

export const CreateUserSchema = z.object({
	email: z.string().email(),
	displayName: z.string().min(1),
	externalId: z.string().optional(),
	roleIds: z.array(z.string()).default([]),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
	displayName: z.string().min(1).optional(),
	roleIds: z.array(z.string()).optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;