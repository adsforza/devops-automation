import { z } from 'zod';
export const StartExecutionSchema = z.object({
    scriptId: z.string().min(1),
    dbConnectionId: z.string().min(1),
    params: z.record(z.any()).default({}),
});
