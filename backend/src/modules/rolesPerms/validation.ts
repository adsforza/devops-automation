import { z } from 'zod';

export const PermissionOperationEnum = z.enum(['SELECT','INSERT','UPDATE','DELETE','EXECUTE']);

export const UpsertRolePermissionsSchema = z.object({
	connectionId: z.string().min(1),
	tablePermissions: z.array(z.object({ fqdn: z.string().min(3), operations: z.array(PermissionOperationEnum).default([]) })).default([]),
	procPermissions: z.array(z.object({ fqdn: z.string().min(3), allowed: z.boolean().default(true) })).default([]),
});

export type UpsertRolePermissionsInput = z.infer<typeof UpsertRolePermissionsSchema>;