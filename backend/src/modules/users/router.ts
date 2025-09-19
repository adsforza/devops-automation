import { Router } from 'express';
import { z } from 'zod';
import { CreateUserSchema } from './validation.js';
import { createUser, listRoles, listUsers } from './service.js';
import { ApiError } from '../../common/errors.js';

export const usersRouter = Router();

usersRouter.get('/', async (_req, res) => {
	const items = await listUsers();
	res.json({ items });
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