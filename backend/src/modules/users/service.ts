import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../common/errors.js';
import { CreateUserInput, UpdateUserInput } from './validation.js';
import { writeAuditLog } from '../audit/service.js';

export async function listUsers(p: { limit: number; offset: number }) {
	const [items, total] = await Promise.all([
		prisma.user.findMany({
			orderBy: { createdAt: 'desc' },
			include: { roles: { include: { role: true } } },
			take: p.limit,
			skip: p.offset,
		}),
		prisma.user.count(),
	]);
	return { items, total };
}

export async function listRoles() {
	return prisma.role.findMany({ orderBy: { name: 'asc' } });
}

export async function createUser(input: CreateUserInput, createdBy: string) {
	const exists = await prisma.user.findUnique({ where: { email: input.email } });
	if (exists) throw new ApiError(409, 'Email already exists', 'UserEmailExists');
	const user = await prisma.user.create({ data: {
		externalId: input.externalId || `local-${Date.now()}`,
		email: input.email,
		displayName: input.displayName,
		status: 'active',
	}});
	if (input.roleIds?.length) {
		await prisma.$transaction(input.roleIds.map((roleId) => prisma.userRole.create({ data: { userId: user.id, roleId } })));
	}
	await writeAuditLog({ action: 'user.create', resourceType: 'user', resourceId: user.id, userId: createdBy, after: { user } });
	return user;
}

export async function updateUser(id: string, input: UpdateUserInput, updatedBy: string) {
	const before = await prisma.user.findUnique({ where: { id }, include: { roles: true } });
	if (!before) throw new ApiError(404, 'User not found', 'UserNotFound');
	const data: any = {};
	if (input.displayName) data.displayName = input.displayName;
	const user = await prisma.user.update({ where: { id }, data });
	if (input.roleIds) {
		await prisma.userRole.deleteMany({ where: { userId: id } });
		if (input.roleIds.length) {
			await prisma.$transaction(input.roleIds.map((roleId) => prisma.userRole.create({ data: { userId: id, roleId } })));
		}
	}
	await writeAuditLog({ action: 'user.update', resourceType: 'user', resourceId: id, userId: updatedBy, before, after: { user } });
	return user;
}

export async function updateUserStatus(id: string, status: 'active' | 'disabled', updatedBy: string) {
	const before = await prisma.user.findUnique({ where: { id } });
	if (!before) throw new ApiError(404, 'User not found', 'UserNotFound');
	const user = await prisma.user.update({ where: { id }, data: { status } });
	await writeAuditLog({ action: 'user.status', resourceType: 'user', resourceId: id, userId: updatedBy, before, after: { user } });
	return user;
}

export async function deleteUser(id: string, deletedBy: string) {
	const before = await prisma.user.findUnique({ where: { id } });
	if (!before) throw new ApiError(404, 'User not found', 'UserNotFound');
	await prisma.userRole.deleteMany({ where: { userId: id } });
	await prisma.user.delete({ where: { id } });
	await writeAuditLog({ action: 'user.delete', resourceType: 'user', resourceId: id, userId: deletedBy, before });
}