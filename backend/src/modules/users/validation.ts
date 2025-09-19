import { z } from 'zod';

export const CreateUserSchema = z.object({
	email: z.string().email(),
	displayName: z.string().min(1),
	externalId: z.string().optional(),
	roleIds: z.array(z.string()).default([]),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;