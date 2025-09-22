import { Router } from 'express';
import { env } from '../config/env.js';
import { openapiRouter } from './openapi.js';
import { connectionsRouter } from '../modules/connections/router.js';
import { scriptsRouter } from '../modules/scripts/router.js';
import { executionsRouter } from '../modules/executions/router.js';
import { auditRouter } from '../modules/audit/router.js';
import { authRouter } from './auth.js';
import { usersRouter } from '../modules/users/router.js';
import { rolesRouter } from '../modules/roles/router.js';
import { changesRouter } from '../modules/changes/router.js';
import { metadataRouter } from '../modules/metadata/router.js';
import { rolePermsRouter } from '../modules/rolesPerms/router.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

export const router = Router();

router.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

router.get('/version', (_req, res) => {
	res.json({ version: '0.1.0', env: env.NODE_ENV });
});

router.use('/', openapiRouter);
router.use('/auth', authRouter);
router.use('/db-connections', requireAuth, connectionsRouter);
router.use('/db-connections/:id/metadata', metadataRouter);
router.use('/scripts', requireAuth, scriptsRouter);
router.use('/executions', requireAuth, executionsRouter);
router.use('/audit', requireAuth, requireRoles(['Admin','SuperAdmin']), auditRouter);
router.use('/changes', requireAuth, changesRouter);
router.use('/admin/users', requireAuth, requireRoles(['Admin','SuperAdmin']), usersRouter);
router.use('/admin/roles', requireAuth, requireRoles(['Admin','SuperAdmin']), rolesRouter);
router.use('/admin/roles/:roleId/permissions', requireAuth, requireRoles(['Admin','SuperAdmin']), rolePermsRouter);

router.get('/', (_req, res) => {
	res.json({ name: 'automation-backend', docs: '/docs' });
});