import axios from 'axios';
import type { AuditLogDto, DbConnectionDto, ExecutionDto, PagedResult, RoleDto, ScriptDto, UserDto } from './types';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '/',
	withCredentials: true,
});

export async function getMe(): Promise<UserDto> { const { data } = await api.get('/auth/me'); return data.user as UserDto; }

export async function listConnections(): Promise<DbConnectionDto[]> { const { data } = await api.get('/db-connections'); return data.items as DbConnectionDto[]; }
export async function createConnection(payload: any) { const { data } = await api.post('/db-connections', payload); return data; }
export async function updateConnection(id: string, payload: any) { const { data } = await api.put(`/db-connections/${id}`, payload); return data; }
export async function deleteConnection(id: string) { await api.delete(`/db-connections/${id}`); }
export async function testConnection(id: string) { const { data } = await api.post(`/db-connections/${id}/test`); return data; }
export async function listMetadataTables(connectionId: string) { const { data } = await api.get(`/db-connections/${connectionId}/metadata/tables`); return data.items as any[]; }
export async function listMetadataProcs(connectionId: string) { const { data } = await api.get(`/db-connections/${connectionId}/metadata/procs`); return data.items as any[]; }

export async function listScripts(): Promise<ScriptDto[]> { const { data } = await api.get('/scripts'); return data.items as ScriptDto[]; }
export async function listExecutions(): Promise<ExecutionDto[]> { const { data } = await api.get('/executions?limit=10'); return data.items as ExecutionDto[]; }
export async function listAuditPaged(params: { userId?: string; action?: string; resourceType?: string; resourceId?: string; limit?: number; offset?: number } = {}): Promise<PagedResult<AuditLogDto>> { const { data } = await api.get('/audit', { params }); return data as PagedResult<AuditLogDto>; }
export async function startExecution(payload: { scriptId: string; dbConnectionId: string; params: Record<string, unknown> }) { const { data } = await api.post('/executions', payload); return data as { id: string }; }

export async function listUsersPaged(params: { limit?: number; offset?: number } = {}): Promise<PagedResult<UserDto>> { const { data } = await api.get('/admin/users', { params }); return data as PagedResult<UserDto>; }
export async function listRoles(): Promise<RoleDto[]> { const { data } = await api.get('/admin/users/roles'); return data.items as RoleDto[]; }
export async function createUser(payload: { email: string; displayName: string; externalId?: string; roleIds?: string[] }) { const { data } = await api.post('/admin/users', payload); return data; }
export async function updateUser(id: string, payload: { displayName?: string; roleIds?: string[] }) { const { data } = await api.put(`/admin/users/${id}`, payload); return data; }
export async function updateUserStatus(id: string, status: 'active' | 'disabled') { const { data } = await api.post(`/admin/users/${id}/status`, { status }); return data; }
export async function deleteUser(id: string) { await api.delete(`/admin/users/${id}`); }

export async function rolesListAll() { const { data } = await api.get('/admin/roles'); return data.items as any[]; }
export async function rolesCreate(payload: { name: string; description?: string }) { const { data } = await api.post('/admin/roles', payload); return data; }
export async function rolesUpdate(id: string, payload: { name?: string; description?: string }) { const { data } = await api.put(`/admin/roles/${id}`, payload); return data; }
export async function rolesDelete(id: string) { await api.delete(`/admin/roles/${id}`); }
export async function rolePermsGet(roleId: string, connectionId: string) { const { data } = await api.get(`/admin/roles/${roleId}/permissions`, { params: { connectionId } }); return data.items as any[]; }
export async function rolePermsSet(roleId: string, payload: { connectionId: string; tablePermissions: { fqdn: string; operations: string[] }[]; procPermissions: { fqdn: string; allowed: boolean }[] }) { await api.put(`/admin/roles/${roleId}/permissions`, payload); }

export async function changesList(params: { table?: string; pk?: string; userId?: string; from?: string; to?: string; limit?: number; offset?: number } = {}) { const { data } = await api.get('/changes', { params }); return data as { items: any[]; total: number }; }
export async function changesByPk(table: string, pk: string) { const { data } = await api.get(`/changes/${table}/${pk}`); return data.items as any[]; }

export async function scriptsList() { const { data } = await api.get('/scripts'); return data.items as any[]; }
export async function scriptsCreate(payload: any) { const { data } = await api.post('/scripts', payload); return data; }
export async function scriptsUpdate(id: string, payload: any) { const { data } = await api.put(`/scripts/${id}`, payload); return data; }
export async function scriptsDelete(id: string) { await api.delete(`/scripts/${id}`); }
export async function scriptsAddVersion(id: string, payload: { sqlText: string }) { const { data } = await api.post(`/scripts/${id}/versions`, payload); return data; }
export async function scriptsSetConnections(id: string, connections: string[]) { await api.put(`/scripts/${id}/connections`, { connections }); }
export async function scriptsSetParameters(id: string, params: any[]) { await api.put(`/scripts/${id}/parameters`, { params }); }