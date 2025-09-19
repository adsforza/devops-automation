import { Router } from 'express';
import { z } from 'zod';
import { CreateScriptSchema, CreateScriptVersionSchema } from './validation.js';
import { addScriptVersion, createScript, getScript, listScripts, updateScript, deleteScript, setScriptConnections, setScriptParameters } from './service.js';
import { ApiError } from '../../common/errors.js';

export const scriptsRouter = Router();

scriptsRouter.get('/', async (_req, res) => {
	const items = await listScripts();
	res.json({ items });
});

scriptsRouter.post('/', async (req, res) => {
	const parsed = CreateScriptSchema.safeParse(req.body);
	if (!parsed.success) throw new ApiError(400, 'Invalid payload', 'ValidationError');
	const created = await createScript(parsed.data, 'system');
	res.status(201).json(created);
});

scriptsRouter.get('/:id', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const item = await getScript(id);
	res.json(item);
});

scriptsRouter.put('/:id', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const body = z.object({ name: z.string().optional(), description: z.string().optional(), isActive: z.boolean().optional() }).parse(req.body);
	const updated = await updateScript(id, body, 'system');
	res.json(updated);
});

scriptsRouter.delete('/:id', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	await deleteScript(id, 'system');
	res.status(204).send();
});

scriptsRouter.post('/:id/versions', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const parsed = CreateScriptVersionSchema.safeParse(req.body);
	if (!parsed.success) throw new ApiError(400, 'Invalid payload', 'ValidationError');
	const version = await addScriptVersion(id, parsed.data, 'system');
	res.status(201).json(version);
});

scriptsRouter.put('/:id/connections', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const body = z.object({ connections: z.array(z.string()) }).parse(req.body);
	await setScriptConnections(id, body.connections, 'system');
	res.status(204).send();
});

scriptsRouter.put('/:id/parameters', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const body = z.object({ params: z.array(z.object({ name: z.string().min(1), type: z.string().min(1), required: z.boolean().optional(), defaultValue: z.string().optional(), validation: z.any().optional(), orderIndex: z.number().int().optional() })) }).parse(req.body);
	await setScriptParameters(id, body.params, 'system');
	res.status(204).send();
});