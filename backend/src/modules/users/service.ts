import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../common/errors.js';
import { CreateUserInput } from './validation.js';
import { writeAuditLog } from '../audit/service.js';

export async function listUsers() {
	return prisma.user.findMany({ orderBy: { createdAt: 'desc' }, include: { roles: true } });
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