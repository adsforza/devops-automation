import { Router } from 'express';
import { z } from 'zod';
import { StartExecutionSchema } from './validation.js';
import { getExecution, startExecution } from './service.js';
import { ApiError } from '../../common/errors.js';

export const executionsRouter = Router();

executionsRouter.post('/', async (req, res) => {
	const parsed = StartExecutionSchema.safeParse(req.body);
	if (!parsed.success) throw new ApiError(400, 'Invalid payload', 'ValidationError');
	const exec = await startExecution(parsed.data.scriptId, parsed.data.dbConnectionId, parsed.data.params || {}, 'system');
	res.status(202).json(exec);
});

executionsRouter.get('/:id', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const data = await getExecution(id);
	res.json(data);
});