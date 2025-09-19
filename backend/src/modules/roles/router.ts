import { Router } from 'express';
import { z } from 'zod';
import { createRole, deleteRole, listRolesAll, updateRole } from './service.js';
import { CreateRoleSchema, UpdateRoleSchema } from './validation.js';
import { ApiError } from '../../common/errors.js';

export const rolesRouter = Router();

rolesRouter.get('/', async (_req, res) => {
	const items = await listRolesAll();
	res.json({ items });
});

rolesRouter.post('/', async (req, res) => {
	const parsed = CreateRoleSchema.safeParse(req.body);
	if (!parsed.success) throw new ApiError(400, 'Invalid payload', 'ValidationError');
	const created = await createRole(parsed.data, 'system');
	res.status(201).json(created);
});

rolesRouter.put('/:id', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const parsed = UpdateRoleSchema.safeParse(req.body);
	if (!parsed.success) throw new ApiError(400, 'Invalid payload', 'ValidationError');
	const updated = await updateRole(id, parsed.data, 'system');
	res.json(updated);
});

rolesRouter.delete('/:id', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	await deleteRole(id, 'system');
	res.status(204).send();
});