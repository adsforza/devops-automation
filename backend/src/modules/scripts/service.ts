import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../common/errors.js';
import { CreateScriptInput, CreateScriptVersionInput } from './validation.js';
import crypto from 'crypto';
import { writeAuditLog } from '../audit/service.js';

function basicSqlValidation(sql: string) {
	// Very basic: disallow semicolon chains for now; real validation should parse or lint
	if (/;\s*;/g.test(sql)) throw new ApiError(400, 'SQL contains multiple statements; not allowed', 'InvalidSQL');
}

export async function createScript(input: CreateScriptInput, createdBy: string) {
	const exists = await prisma.script.findUnique({ where: { key: input.key } });
	if (exists) throw new ApiError(409, 'Script key already exists', 'ScriptKeyExists');
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
			validationJson: p.validation as any,
			orderIndex: p.orderIndex ?? idx,
		}})));
	}
	if (input.connections?.length) {
		await prisma.$transaction(input.connections.map((connId) => prisma.scriptDbLink.create({ data: {
			scriptId: script.id,
			dbConnectionId: connId,
			allowed: true,
		}})));
	}
	await writeAuditLog({ action: 'script.create', resourceType: 'script', resourceId: script.id, userId: createdBy, after: { script } });
	return script;
}

export async function updateScript(id: string, data: { name?: string; description?: string; isActive?: boolean }, updatedBy: string) {
	const before = await prisma.script.findUnique({ where: { id } });
	if (!before) throw new ApiError(404, 'Script not found', 'ScriptNotFound');
	const updated = await prisma.script.update({ where: { id }, data });
	await writeAuditLog({ action: 'script.update', resourceType: 'script', resourceId: id, userId: updatedBy, before, after: { updated } });
	return updated;
}

export async function deleteScript(id: string, userId: string) {
	const before = await prisma.script.findUnique({ where: { id } });
	if (!before) throw new ApiError(404, 'Script not found', 'ScriptNotFound');
	await prisma.$transaction(async (tx) => {
		await tx.scriptDbLink.deleteMany({ where: { scriptId: id } });
		await tx.scriptParameter.deleteMany({ where: { scriptId: id } });
		await tx.scriptVersion.deleteMany({ where: { scriptId: id } });
		await tx.script.delete({ where: { id } });
	});
	await writeAuditLog({ action: 'script.delete', resourceType: 'script', resourceId: id, userId, before });
}

export async function setScriptConnections(id: string, connections: string[], userId: string) {
	await prisma.$transaction(async (tx) => {
		await tx.scriptDbLink.deleteMany({ where: { scriptId: id } });
		if (connections.length) {
			await tx.$transaction(connections.map((connId) => tx.scriptDbLink.create({ data: { scriptId: id, dbConnectionId: connId, allowed: true } })));
		}
	});
	await writeAuditLog({ action: 'script.setConnections', resourceType: 'script', resourceId: id, userId, metadata: { connections } });
}

export async function setScriptParameters(id: string, params: Array<{ name: string; type: string; required?: boolean; defaultValue?: string; validation?: any; orderIndex?: number }>, userId: string) {
	await prisma.$transaction(async (tx) => {
		await tx.scriptParameter.deleteMany({ where: { scriptId: id } });
		if (params.length) {
			await tx.$transaction(params.map((p, idx) => tx.scriptParameter.create({ data: {
				scriptId: id,
				name: p.name,
				type: p.type,
				required: p.required ?? false,
				defaultValue: p.defaultValue ?? null,
				validationJson: p.validation as any,
				orderIndex: p.orderIndex ?? idx,
			} })));
		}
	});
	await writeAuditLog({ action: 'script.setParameters', resourceType: 'script', resourceId: id, userId, metadata: { paramsCount: params.length } });
}

export async function addScriptVersion(scriptId: string, input: CreateScriptVersionInput, createdBy: string) {
	basicSqlValidation(input.sqlText);
	const script = await prisma.script.findUnique({ where: { id: scriptId } });
	if (!script) throw new ApiError(404, 'Script not found', 'ScriptNotFound');
	const last = await prisma.scriptVersion.findFirst({ where: { scriptId }, orderBy: { version: 'desc' } });
	const nextVersion = (last?.version || 0) + 1;
	const checksum = crypto.createHash('sha256').update(input.sqlText, 'utf8').digest('hex');
	const sqlTextEnc = Buffer.from(input.sqlText, 'utf8').toString('base64');
	const version = await prisma.scriptVersion.create({ data: {
		scriptId,
		version: nextVersion,
		sqlTextEnc,
		checksum,
		createdBy,
		isValidated: true,
	}});
	await writeAuditLog({ action: 'script.version.create', resourceType: 'script-version', resourceId: version.id, userId: createdBy, metadata: { scriptId, version: nextVersion }, after: { checksum } });
	return version;
}

export async function listScripts() {
	return prisma.script.findMany({ include: { versions: true, params: true, dbLinks: true } });
}

export async function getScript(id: string) {
	const script = await prisma.script.findUnique({ where: { id }, include: { versions: true, params: true, dbLinks: true } });
	if (!script) throw new ApiError(404, 'Script not found', 'ScriptNotFound');
	return script;
}