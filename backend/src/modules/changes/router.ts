import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { ChangesQuerySchema } from './validation.js';

export const changesRouter = Router();

changesRouter.get('/', async (req, res) => {
	const q = ChangesQuerySchema.parse(req.query);
	const where: any = {};
	if (q.table) where.tableFqdn = q.table;
	if (q.pk) where.pk = q.pk;
	if (q.userId) where.userId = q.userId;
	if (q.from || q.to) where.changeTime = { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined };
	const [items, total] = await Promise.all([
		prisma.changeHistory.findMany({ where, orderBy: { changeTime: 'desc' }, take: q.limit, skip: q.offset }),
		prisma.changeHistory.count({ where }),
	]);
	res.json({ items, total });
});

changesRouter.get('/:table/:pk', async (req, res) => {
	const { table, pk } = z.object({ table: z.string().min(1), pk: z.string().min(1) }).parse(req.params);
	const items = await prisma.changeHistory.findMany({ where: { tableFqdn: table, pk }, orderBy: { changeTime: 'desc' } });
	res.json({ items });
});