import { Router } from 'express';
import { env } from '../config/env.js';
import { openapiRouter } from './openapi.js';
import { connectionsRouter } from '../modules/connections/router.js';
import { scriptsRouter } from '../modules/scripts/router.js';
import { executionsRouter } from '../modules/executions/router.js';
import { auditRouter } from '../modules/audit/router.js';
import { authRouter } from './auth.js';
import { usersRouter } from '../modules/users/router.js';

export const router = Router();

router.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

router.get('/version', (_req, res) => {
	res.json({ version: '0.1.0', env: env.NODE_ENV });
});

router.use('/', openapiRouter);
router.use('/auth', authRouter);
router.use('/db-connections', connectionsRouter);
router.use('/scripts', scriptsRouter);
router.use('/executions', executionsRouter);
router.use('/audit', auditRouter);
router.use('/admin/users', usersRouter);

router.get('/', (_req, res) => {
	res.json({ name: 'automation-backend', docs: '/docs' });
});