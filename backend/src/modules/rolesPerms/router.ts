import { Router } from 'express';
import { z } from 'zod';
import { getRolePermissions, upsertRolePermissions } from './service.js';
import { UpsertRolePermissionsSchema } from './validation.js';
import { ApiError } from '../../common/errors.js';

export const rolePermsRouter = Router({ mergeParams: true });

rolePermsRouter.get('/', async (req, res) => {
	const { roleId } = z.object({ roleId: z.string().min(1) }).parse(req.params);
	const q = z.object({ connectionId: z.string().min(1) }).parse(req.query);
	const items = await getRolePermissions(roleId, q.connectionId);
	res.json({ items });
});

rolePermsRouter.put('/', async (req, res) => {
	const { roleId } = z.object({ roleId: z.string().min(1) }).parse(req.params);
	const parsed = UpsertRolePermissionsSchema.safeParse(req.body);
	if (!parsed.success) throw new ApiError(400, 'Invalid payload', 'ValidationError');
	await upsertRolePermissions(roleId, parsed.data);
	res.status(204).send();
});