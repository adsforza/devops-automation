import { prisma } from '../../db/prisma.js';
import { UpsertRolePermissionsInput } from './validation.js';

export async function getRolePermissions(roleId: string, connectionId: string) {
	const perms = await prisma.rolePermission.findMany({
		where: { roleId, permission: { resourceType: 'table_or_proc', resourceId: { startsWith: `${connectionId}::` } } },
		include: { permission: true },
	});
	return perms.map((rp) => rp.permission);
}

export async function upsertRolePermissions(roleId: string, input: UpsertRolePermissionsInput) {
	// Remove existing for connection scope
	await prisma.$transaction(async (tx) => {
		const toDelete = await tx.rolePermission.findMany({
			where: { roleId, permission: { resourceType: 'table_or_proc', resourceId: { startsWith: `${input.connectionId}::` } } },
			select: { permissionId: true },
		});
		if (toDelete.length) {
			await tx.rolePermission.deleteMany({ where: { roleId, permissionId: { in: toDelete.map((x) => x.permissionId) } } });
			await tx.permission.deleteMany({ where: { id: { in: toDelete.map((x) => x.permissionId) } } });
		}
		// Tables
		for (const t of input.tablePermissions) {
			for (const op of t.operations) {
				const p = await tx.permission.create({ data: { resourceType: 'table_or_proc', resourceId: `${input.connectionId}::table:${t.fqdn}`, operation: op } });
				await tx.rolePermission.create({ data: { roleId, permissionId: p.id } });
			}
		}
		// Procedures (EXECUTE only)
		for (const p of input.procPermissions) {
			if (p.allowed) {
				const perm = await tx.permission.create({ data: { resourceType: 'table_or_proc', resourceId: `${input.connectionId}::proc:${p.fqdn}`, operation: 'EXECUTE' } });
				await tx.rolePermission.create({ data: { roleId, permissionId: perm.id } });
			}
		}
	});
}