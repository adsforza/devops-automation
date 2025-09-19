import { Router } from 'express';
import { z } from 'zod';
import { CreateUserSchema, UpdateUserSchema } from './validation.js';
import { createUser, deleteUser, listRoles, listUsers, updateUser, updateUserStatus } from './service.js';
import { ApiError } from '../../common/errors.js';

export const usersRouter = Router();

usersRouter.get('/', async (req, res) => {
	const query = z.object({ limit: z.coerce.number().int().min(1).max(200).default(20), offset: z.coerce.number().int().min(0).default(0) }).parse(req.query);
	const data = await listUsers({ limit: query.limit, offset: query.offset });
	res.json(data);
});

usersRouter.get('/roles', async (_req, res) => {
	const items = await listRoles();
	res.json({ items });
});

usersRouter.post('/', async (req, res) => {
	const parsed = CreateUserSchema.safeParse(req.body);
	if (!parsed.success) throw new ApiError(400, 'Invalid payload', 'ValidationError');
	const created = await createUser(parsed.data, 'system');
	res.status(201).json(created);
});

usersRouter.put('/:id', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const parsed = UpdateUserSchema.safeParse(req.body);
	if (!parsed.success) throw new ApiError(400, 'Invalid payload', 'ValidationError');
	const updated = await updateUser(id, parsed.data, 'system');
	res.json(updated);
});

usersRouter.post('/:id/status', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const body = z.object({ status: z.enum(['active', 'disabled']) }).parse(req.body);
	const updated = await updateUserStatus(id, body.status, 'system');
	res.json(updated);
});

usersRouter.delete('/:id', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	await deleteUser(id, 'system');
	res.status(204).send();
});