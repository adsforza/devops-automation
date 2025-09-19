import { Router } from 'express';
import { z } from 'zod';
import { CreateConnectionSchema, UpdateConnectionSchema } from './validation.js';
import { createConnection, deleteConnection, getConnection, listConnections, testConnectivity, updateConnection } from './service.js';
import { ApiError } from '../../common/errors.js';
export const connectionsRouter = Router();
connectionsRouter.get('/', async (_req, res) => {
    const items = await listConnections();
    res.json({ items });
});
connectionsRouter.post('/', async (req, res) => {
    const parsed = CreateConnectionSchema.safeParse(req.body);
    if (!parsed.success)
        throw new ApiError(400, 'Invalid payload', 'ValidationError');
    const created = await createConnection(parsed.data, 'system');
    res.status(201).json(created);
});
connectionsRouter.get('/:id', async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const item = await getConnection(id);
    res.json(item);
});
connectionsRouter.put('/:id', async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const parsed = UpdateConnectionSchema.safeParse(req.body);
    if (!parsed.success)
        throw new ApiError(400, 'Invalid payload', 'ValidationError');
    const updated = await updateConnection(id, parsed.data);
    res.json(updated);
});
connectionsRouter.delete('/:id', async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    await deleteConnection(id);
    res.status(204).send();
});
connectionsRouter.post('/:id/test', async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const result = await testConnectivity(id);
    res.json(result);
});
