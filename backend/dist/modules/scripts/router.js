import { Router } from 'express';
import { z } from 'zod';
import { CreateScriptSchema, CreateScriptVersionSchema } from './validation.js';
import { addScriptVersion, createScript, getScript, listScripts } from './service.js';
import { ApiError } from '../../common/errors.js';
export const scriptsRouter = Router();
scriptsRouter.get('/', async (_req, res) => {
    const items = await listScripts();
    res.json({ items });
});
scriptsRouter.post('/', async (req, res) => {
    const parsed = CreateScriptSchema.safeParse(req.body);
    if (!parsed.success)
        throw new ApiError(400, 'Invalid payload', 'ValidationError');
    const created = await createScript(parsed.data, 'system');
    res.status(201).json(created);
});
scriptsRouter.get('/:id', async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const item = await getScript(id);
    res.json(item);
});
scriptsRouter.post('/:id/versions', async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const parsed = CreateScriptVersionSchema.safeParse(req.body);
    if (!parsed.success)
        throw new ApiError(400, 'Invalid payload', 'ValidationError');
    const version = await addScriptVersion(id, parsed.data, 'system');
    res.status(201).json(version);
});
