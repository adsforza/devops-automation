import { Router } from 'express';
import { env } from '../config/env.js';
import { openapiRouter } from './openapi.ts';

export const router = Router();

router.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

router.get('/version', (_req, res) => {
	res.json({ version: '0.1.0', env: env.NODE_ENV });
});

router.use('/', openapiRouter);

router.get('/', (_req, res) => {
	res.json({ name: 'automation-backend', docs: '/docs' });
});