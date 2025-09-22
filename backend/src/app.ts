import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { buildCsp } from './config/security.js';
import { router } from './routes/index.js';
import { errorHandler, notFoundHandler } from './common/errors.js';
import type { Request, Response, NextFunction } from 'express';
import { logger } from './common/logger.js';
import { randomUUID } from 'crypto';

const app = express();

app.set('trust proxy', 1);

app.use((req: Request, res: Response, next: NextFunction) => {
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('x-request-id', reqId);
    const start = Date.now();
    res.on('finish', () => {
        const durationMs = Date.now() - start;
        logger.info({ reqId, method: req.method, url: req.originalUrl, statusCode: res.statusCode, durationMs, remoteAddress: req.ip }, 'http_request');
    });
    next();
});

app.use(helmet({
	contentSecurityPolicy: buildCsp(env.CSP_DEFAULT_SRC),
	hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

app.use(cors({
    origin: (origin, callback) => {
        const allowed = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
        if (!origin) return callback(null, true);
        if (allowed.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(rateLimit({
	windowMs: env.RATE_LIMIT_WINDOW_MS,
	max: env.RATE_LIMIT_MAX,
	standardHeaders: true,
	legacyHeaders: false,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;