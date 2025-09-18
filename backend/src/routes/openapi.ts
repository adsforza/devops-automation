import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

export const openapiRouter = Router();

const openapiDoc = {
	openapi: '3.0.3',
	info: { title: 'Automation API', version: '0.1.0' },
	paths: {
		'/health': { get: { summary: 'Health', responses: { '200': { description: 'ok' } } } },
		'/db-connections': { get: { summary: 'List DB connections' } },
		'/scripts': { get: { summary: 'List scripts' } },
		'/executions': { get: { summary: 'List executions' }, post: { summary: 'Start execution' } },
		'/audit': { get: { summary: 'List audit logs' } },
	},
};

openapiRouter.get('/openapi.json', (_req, res) => { res.json(openapiDoc); });
openapiRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));