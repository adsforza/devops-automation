import { prisma } from '../../db/prisma.js';
import { secretCipher } from '../../common/crypto.js';
import { ApiError } from '../../common/errors.js';
import { Client as PgClient } from 'pg';
import { writeAuditLog } from '../audit/service.js';
export async function createConnection(input, createdBy) {
    const existing = await prisma.dbConnection.findUnique({ where: { name: input.name } });
    if (existing)
        throw new ApiError(409, 'Connection name already exists', 'ConnNameExists');
    const usernameEnc = secretCipher.encrypt(input.username);
    const passwordEnc = secretCipher.encrypt(input.password);
    const created = await prisma.dbConnection.create({
        data: {
            name: input.name,
            engine: input.engine,
            host: input.host,
            port: input.port,
            database: input.database,
            usernameEnc,
            passwordEnc,
            kmsKeyId: input.kmsKeyId || '',
            optionsJson: input.options || undefined,
            createdBy,
        },
    });
    await writeAuditLog({
        action: 'connection.create',
        resourceType: 'database-connection',
        resourceId: created.id,
        userId: createdBy,
        metadata: { name: created.name, engine: created.engine },
        after: { ...created, usernameEnc: '***', passwordEnc: '***' },
    });
    return created;
}
export async function listConnections() {
    return prisma.dbConnection.findMany({ orderBy: { createdAt: 'desc' } });
}
export async function getConnection(id) {
    const conn = await prisma.dbConnection.findUnique({ where: { id } });
    if (!conn)
        throw new ApiError(404, 'Connection not found', 'ConnNotFound');
    return conn;
}
export async function updateConnection(id, input) {
    const before = await getConnection(id);
    const data = {};
    if (input.name)
        data.name = input.name;
    if (input.engine)
        data.engine = input.engine;
    if (input.host)
        data.host = input.host;
    if (typeof input.port === 'number')
        data.port = input.port;
    if (input.database)
        data.database = input.database;
    if (input.username)
        data.usernameEnc = secretCipher.encrypt(input.username);
    if (input.password)
        data.passwordEnc = secretCipher.encrypt(input.password);
    if (input.kmsKeyId !== undefined)
        data.kmsKeyId = input.kmsKeyId;
    if (input.options !== undefined)
        data.optionsJson = input.options;
    const updated = await prisma.dbConnection.update({ where: { id }, data });
    await writeAuditLog({
        action: 'connection.update',
        resourceType: 'database-connection',
        resourceId: id,
        userId: 'system',
        metadata: { name: updated.name },
        before: { ...before, usernameEnc: '***', passwordEnc: '***' },
        after: { ...updated, usernameEnc: '***', passwordEnc: '***' },
    });
    return updated;
}
export async function deleteConnection(id) {
    const before = await getConnection(id);
    await prisma.dbConnection.delete({ where: { id } });
    await writeAuditLog({
        action: 'connection.delete',
        resourceType: 'database-connection',
        resourceId: id,
        userId: 'system',
        before: { ...before, usernameEnc: '***', passwordEnc: '***' },
    });
}
export async function testConnectivity(id) {
    const conn = await getConnection(id);
    if (conn.engine !== 'postgres')
        throw new ApiError(400, 'Only postgres test supported for now', 'EngineNotSupported');
    const username = secretCipher.decrypt(conn.usernameEnc);
    const password = secretCipher.decrypt(conn.passwordEnc);
    const client = new PgClient({
        host: conn.host,
        port: conn.port,
        database: conn.database,
        user: username,
        password: password,
        connectionTimeoutMillis: 5000,
    });
    try {
        await client.connect();
        const result = await client.query('SELECT 1 as ok');
        await writeAuditLog({
            action: 'connection.test',
            resourceType: 'database-connection',
            resourceId: id,
            userId: 'system',
            metadata: { ok: true },
        });
        return { ok: true, result: result.rows[0] };
    }
    finally {
        await client.end().catch(() => { });
    }
}
