import { z } from 'zod';

export const ChangesQuerySchema = z.object({
	table: z.string().optional(),
	pk: z.string().optional(),
	userId: z.string().optional(),
	from: z.string().datetime().optional(),
	to: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(200).default(20),
	offset: z.coerce.number().int().min(0).default(0),
});

export type ChangesQuery = z.infer<typeof ChangesQuerySchema>;