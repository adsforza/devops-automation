import { z } from 'zod';

export const CreateRoleSchema = z.object({
	name: z.string().min(3),
	description: z.string().optional(),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z.object({
	name: z.string().min(3).optional(),
	description: z.string().optional(),
});

export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;