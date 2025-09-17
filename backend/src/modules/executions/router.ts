import { Router } from 'express';
import { z } from 'zod';
import { StartExecutionSchema } from './validation.js';
import { getExecution, startExecution } from './service.js';
import { ApiError } from '../../common/errors.js';
import { prisma } from '../../db/prisma.js';

export const executionsRouter = Router();

executionsRouter.get('/', async (req, res) => {
	const query = z.object({ limit: z.coerce.number().int().min(1).max(200).default(20), offset: z.coerce.number().int().min(0).default(0) }).parse(req.query);
	const [items, total] = await Promise.all([
		prisma.execution.findMany({ orderBy: { startedAt: 'desc' }, take: query.limit, skip: query.offset }),
		prisma.execution.count(),
	]);
	res.json({ items, total });
});

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