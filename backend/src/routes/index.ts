import { Router } from 'express';
import { env } from '../config/env.js';
import { openapiRouter } from './openapi.ts';
import { connectionsRouter } from '../modules/connections/router.js';
import { scriptsRouter } from '../modules/scripts/router.js';
import { executionsRouter } from '../modules/executions/router.js';
import { auditRouter } from '../modules/audit/router.js';

export const router = Router();

router.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

router.get('/version', (_req, res) => {
	res.json({ version: '0.1.0', env: env.NODE_ENV });
});

router.use('/', openapiRouter);
router.use('/db-connections', connectionsRouter);
router.use('/scripts', scriptsRouter);
router.use('/executions', executionsRouter);
router.use('/audit', auditRouter);

router.get('/', (_req, res) => {
	res.json({ name: 'automation-backend', docs: '/docs' });
});