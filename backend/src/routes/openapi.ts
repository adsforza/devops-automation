import { Router } from 'express';

export const openapiRouter = Router();

const openapiDoc = {
	openapi: '3.0.3',
	info: {
		title: 'Automation API',
		version: '0.1.0',
	},
	paths: {
		'/health': { get: { summary: 'Health', responses: { '200': { description: 'ok' } } } },
	},
};

openapiRouter.get('/openapi.json', (_req, res) => {
	res.json(openapiDoc);
});

openapiRouter.get('/docs', (_req, res) => {
	res.redirect('/openapi.json');
});