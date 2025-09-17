import { Client as PgClient } from 'pg';
import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../common/errors.js';
import { secretCipher } from '../../common/crypto.js';

export async function startExecution(scriptId: string, dbConnectionId: string, params: Record<string, unknown>, userId: string) {
	const script = await prisma.script.findUnique({ where: { id: scriptId } });
	if (!script) throw new ApiError(404, 'Script not found', 'ScriptNotFound');
	const version = await prisma.scriptVersion.findFirst({ where: { scriptId }, orderBy: { version: 'desc' } });
	if (!version) throw new ApiError(400, 'Script has no versions', 'NoScriptVersion');
	const link = await prisma.scriptDbLink.findUnique({ where: { scriptId_dbConnectionId: { scriptId, dbConnectionId } } });
	if (!link || !link.allowed) throw new ApiError(403, 'Script not allowed on this connection', 'ScriptNotAllowed');
	const conn = await prisma.dbConnection.findUnique({ where: { id: dbConnectionId } });
	if (!conn) throw new ApiError(404, 'Connection not found', 'ConnNotFound');
	if (conn.engine !== 'postgres') throw new ApiError(400, 'Only postgres supported for now', 'EngineNotSupported');

	const sqlText = Buffer.from(version.sqlTextEnc, 'base64').toString('utf8');

	const execution = await prisma.execution.create({ data: {
		scriptId: script.id,
		scriptVersionId: version.id,
		dbConnectionId,
		userId,
		paramsJson: params as any,
		status: 'running',
		startedAt: new Date(),
	}});

	const username = secretCipher.decrypt(conn.usernameEnc);
	const password = secretCipher.decrypt(conn.passwordEnc);
	const client = new PgClient({
		host: conn.host,
		port: conn.port,
		database: conn.database,
		user: username,
		password: password,
		statement_timeout: 60_000,
		application_name: 'automation-app',
	});

	const start = Date.now();
	try {
		await client.connect();
		await client.query('BEGIN');

		// Simple named parameter replacement :param → $1 style
		const { text, values } = buildParameterizedQuery(sqlText, params);
		const result = await client.query(text, values);

		await client.query('COMMIT');
		const durationMs = Date.now() - start;
		await prisma.execution.update({ where: { id: execution.id }, data: {
			status: 'succeeded',
			endedAt: new Date(),
			durationMs,
		}});
		await prisma.executionLog.create({ data: { executionId: execution.id, level: 'info', message: `Rows: ${result.rowCount}` } });
		return { id: execution.id };
	} catch (err: any) {
		await safeRollback(client);
		await prisma.execution.update({ where: { id: execution.id }, data: {
			status: 'failed',
			endedAt: new Date(),
			errorCode: err?.code || 'ERR',
			errorMessage: String(err?.message || err),
		}});
		await prisma.executionLog.create({ data: { executionId: execution.id, level: 'error', message: String(err?.message || err) } });
		throw err;
	} finally {
		await client.end().catch(() => {});
	}
}

export async function getExecution(executionId: string) {
	const exec = await prisma.execution.findUnique({ where: { id: executionId } });
	if (!exec) throw new ApiError(404, 'Execution not found', 'ExecNotFound');
	const logs = await prisma.executionLog.findMany({ where: { executionId }, orderBy: { createdAt: 'asc' } });
	return { execution: exec, logs };
}

function buildParameterizedQuery(sql: string, params: Record<string, unknown>) {
	// Replace :paramName with $n and collect values in order of appearance
	const regex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
	const values: unknown[] = [];
	const used = new Map<string, number>();
	let idx = 0;
	const text = sql.replace(regex, (_m, name: string) => {
		if (!Object.prototype.hasOwnProperty.call(params, name)) {
			throw new ApiError(400, `Missing parameter: ${name}`, 'MissingParam');
		}
		if (!used.has(name)) {
			idx += 1;
			used.set(name, idx);
			values.push(params[name]);
		}
		return `$${used.get(name)}`;
	});
	return { text, values };
}

async function safeRollback(client: PgClient) {
	try {
		await client.query('ROLLBACK');
	} catch {}
}