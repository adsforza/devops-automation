import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export class ApiError extends Error {
	status: number;
	code?: string;
	constructor(status: number, message: string, code?: string) {
		super(message);
		this.status = status;
		this.code = code;
	}
}

export const notFoundHandler = (req: Request, res: Response) => {
	res.status(404).json({ error: 'NotFound', message: 'Resource not found' });
};

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
	if (err instanceof ApiError) {
		return res.status(err.status).json({ error: err.code || 'ApiError', message: err.message });
	}
	if (err instanceof ZodError) {
		return res.status(400).json({ error: 'ValidationError', issues: err.issues });
	}
	logger.error({ err }, 'Unhandled error');
	return res.status(500).json({ error: 'InternalServerError', message: 'Unexpected error' });
};