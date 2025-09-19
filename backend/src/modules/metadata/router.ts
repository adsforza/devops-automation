import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../common/errors.js';
import { secretCipher } from '../../common/crypto.js';
import { Client as PgClient } from 'pg';

export const metadataRouter = Router({ mergeParams: true });

async function getPgClient(connId: string) {
	const conn = await prisma.dbConnection.findUnique({ where: { id: connId } });
	if (!conn) throw new ApiError(404, 'Connection not found', 'ConnNotFound');
	if (conn.engine !== 'postgres') throw new ApiError(400, 'Only postgres supported', 'EngineNotSupported');
	const user = secretCipher.decrypt(conn.usernameEnc);
	const pass = secretCipher.decrypt(conn.passwordEnc);
	const client = new PgClient({ host: conn.host, port: conn.port, database: conn.database, user, password: pass, statement_timeout: 15000 });
	await client.connect();
	return { client, conn };
}

metadataRouter.get('/tables', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const { client, conn } = await getPgClient(id);
	try {
		const q = `SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name`;
		const r = await client.query(q);
		const items = r.rows.map((row) => ({ schema: row.table_schema, name: row.table_name, fqdn: `${row.table_schema}.${row.table_name}`, connectionId: conn.id }));
		res.json({ items });
	} finally { await client.end().catch(() => {}); }
});

metadataRouter.get('/procs', async (req, res) => {
	const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
	const { client, conn } = await getPgClient(id);
	try {
		const q = `SELECT n.nspname AS schema, p.proname AS name, CASE WHEN p.prokind='p' THEN 'procedure' ELSE 'function' END AS kind FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') ORDER BY n.nspname, p.proname`;
		const r = await client.query(q);
		const items = r.rows.map((row) => ({ schema: row.schema, name: row.name, kind: row.kind, fqdn: `${row.schema}.${row.name}`, connectionId: conn.id }));
		res.json({ items });
	} finally { await client.end().catch(() => {}); }
});