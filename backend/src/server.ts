import { createServer } from 'http';
import app from './app.js';
import { logger } from './common/logger.js';
import { env } from './config/env.js';

const port = env.PORT;

const server = createServer(app);

server.listen(port, () => {
	logger.info({ port }, 'Backend listening');
});

process.on('unhandledRejection', (reason) => {
	logger.error({ reason }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
	logger.error({ error }, 'Uncaught Exception');
	process.exit(1);
});