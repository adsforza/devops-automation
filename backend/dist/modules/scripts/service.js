import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../common/errors.js';
import crypto from 'crypto';
import { writeAuditLog } from '../audit/service.js';
function basicSqlValidation(sql) {
    // Very basic: disallow semicolon chains for now; real validation should parse or lint
    if (/;\s*;/g.test(sql))
        throw new ApiError(400, 'SQL contains multiple statements; not allowed', 'InvalidSQL');
}
export async function createScript(input, createdBy) {
    const exists = await prisma.script.findUnique({ where: { key: input.key } });
    if (exists)
        throw new ApiError(409, 'Script key already exists', 'ScriptKeyExists');
    const script = await prisma.script.create({
        data: {
            key: input.key,
            name: input.name,
            description: input.description,
            createdBy,
            isActive: true,
        },
    });
    if (input.params?.length) {
        await prisma.$transaction(input.params.map((p, idx) => prisma.scriptParameter.create({ data: {
                scriptId: script.id,
                name: p.name,
                type: p.type,
                required: p.required ?? false,
                defaultValue: p.defaultValue ? String(p.defaultValue) : null,
                validationJson: p.validation,
                orderIndex: p.orderIndex ?? idx,
            } })));
    }
    if (input.connections?.length) {
        await prisma.$transaction(input.connections.map((connId) => prisma.scriptDbLink.create({ data: {
                scriptId: script.id,
                dbConnectionId: connId,
                allowed: true,
            } })));
    }
    await writeAuditLog({
        action: 'script.create',
        resourceType: 'script',
        resourceId: script.id,
        userId: createdBy,
        after: { script },
    });
    return script;
}
export async function addScriptVersion(scriptId, input, createdBy) {
    basicSqlValidation(input.sqlText);
    const script = await prisma.script.findUnique({ where: { id: scriptId } });
    if (!script)
        throw new ApiError(404, 'Script not found', 'ScriptNotFound');
    const last = await prisma.scriptVersion.findFirst({ where: { scriptId }, orderBy: { version: 'desc' } });
    const nextVersion = (last?.version || 0) + 1;
    const checksum = crypto.createHash('sha256').update(input.sqlText, 'utf8').digest('hex');
    const sqlTextEnc = Buffer.from(input.sqlText, 'utf8').toString('base64'); // placeholder; replace with KMS encryption
    const version = await prisma.scriptVersion.create({ data: {
            scriptId,
            version: nextVersion,
            sqlTextEnc,
            checksum,
            createdBy,
            isValidated: true,
        } });
    await writeAuditLog({
        action: 'script.version.create',
        resourceType: 'script-version',
        resourceId: version.id,
        userId: createdBy,
        metadata: { scriptId, version: nextVersion },
        after: { checksum },
    });
    return version;
}
export async function listScripts() {
    return prisma.script.findMany({ include: { versions: true, params: true, dbLinks: true } });
}
export async function getScript(id) {
    const script = await prisma.script.findUnique({ where: { id }, include: { versions: true, params: true, dbLinks: true } });
    if (!script)
        throw new ApiError(404, 'Script not found', 'ScriptNotFound');
    return script;
}
