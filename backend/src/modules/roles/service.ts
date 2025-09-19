import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../common/errors.js';
import { CreateRoleInput, UpdateRoleInput } from './validation.js';
import { writeAuditLog } from '../audit/service.js';

export async function listRolesAll() {
	return prisma.role.findMany({ orderBy: { name: 'asc' } });
}

export async function createRole(input: CreateRoleInput, userId: string) {
	const existing = await prisma.role.findUnique({ where: { name: input.name } });
	if (existing) throw new ApiError(409, 'Role name exists', 'RoleExists');
	const role = await prisma.role.create({ data: { name: input.name, description: input.description } });
	await writeAuditLog({ action: 'role.create', resourceType: 'role', resourceId: role.id, userId, after: { role } });
	return role;
}

export async function updateRole(id: string, input: UpdateRoleInput, userId: string) {
	const before = await prisma.role.findUnique({ where: { id } });
	if (!before) throw new ApiError(404, 'Role not found', 'RoleNotFound');
	const role = await prisma.role.update({ where: { id }, data: { ...input } });
	await writeAuditLog({ action: 'role.update', resourceType: 'role', resourceId: id, userId, before, after: { role } });
	return role;
}

export async function deleteRole(id: string, userId: string) {
	const before = await prisma.role.findUnique({ where: { id } });
	if (!before) throw new ApiError(404, 'Role not found', 'RoleNotFound');
	await prisma.userRole.deleteMany({ where: { roleId: id } });
	await prisma.role.delete({ where: { id } });
	await writeAuditLog({ action: 'role.delete', resourceType: 'role', resourceId: id, userId, before });
}