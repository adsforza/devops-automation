import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
export const auditRouter = Router();
auditRouter.get('/', async (req, res) => {
    const query = z.object({
        userId: z.string().optional(),
        action: z.string().optional(),
        resourceType: z.string().optional(),
        resourceId: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
    }).parse(req.query);
    const where = {};
    if (query.userId)
        where.userId = query.userId;
    if (query.action)
        where.action = query.action;
    if (query.resourceType)
        where.resourceType = query.resourceType;
    if (query.resourceId)
        where.resourceId = query.resourceId;
    const [items, total] = await Promise.all([
        prisma.auditLog.findMany({ where, orderBy: { eventTime: 'desc' }, take: query.limit, skip: query.offset }),
        prisma.auditLog.count({ where }),
    ]);
    res.json({ items, total });
});
