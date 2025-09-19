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
	await prisma.$transaction(async (tx) => {
		// Remove user-role links
		await tx.userRole.deleteMany({ where: { roleId: id } });
		// Collect permissions linked to this role
		const links = await tx.rolePermission.findMany({ where: { roleId: id }, select: { permissionId: true } });
		const permIds = links.map((l) => l.permissionId);
		// Remove role-permission links
		await tx.rolePermission.deleteMany({ where: { roleId: id } });
		// Remove orphan permissions (no other role/user links)
		if (permIds.length) {
			const stillLinked = await tx.rolePermission.findMany({ where: { permissionId: { in: permIds } }, select: { permissionId: true } });
			const stillLinkedSet = new Set(stillLinked.map((x) => x.permissionId));
			const orphanIds = permIds.filter((pid) => !stillLinkedSet.has(pid));
			if (orphanIds.length) {
				await tx.permission.deleteMany({ where: { id: { in: orphanIds } } });
			}
		}
		// Finally remove the role
		await tx.role.delete({ where: { id } });
	});
	await writeAuditLog({ action: 'role.delete', resourceType: 'role', resourceId: id, userId, before });
}