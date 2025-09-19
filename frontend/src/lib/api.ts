import axios from 'axios';

export const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
	withCredentials: true,
});

export async function getMe() { const { data } = await api.get('/auth/me'); return data.user; }

export async function listConnections() { const { data } = await api.get('/db-connections'); return data.items as any[]; }
export async function createConnection(payload: any) { const { data } = await api.post('/db-connections', payload); return data; }
export async function updateConnection(id: string, payload: any) { const { data } = await api.put(`/db-connections/${id}`, payload); return data; }
export async function deleteConnection(id: string) { await api.delete(`/db-connections/${id}`); }
export async function testConnection(id: string) { const { data } = await api.post(`/db-connections/${id}/test`); return data; }

export async function listScripts() { const { data } = await api.get('/scripts'); return data.items as any[]; }
export async function listExecutions() { const { data } = await api.get('/executions?limit=10'); return data.items as any[]; }
export async function listAuditPaged(params: { userId?: string; action?: string; resourceType?: string; resourceId?: string; limit?: number; offset?: number } = {}) { const { data } = await api.get('/audit', { params }); return data as { items: any[]; total: number }; }
export async function startExecution(payload: { scriptId: string; dbConnectionId: string; params: Record<string, unknown> }) { const { data } = await api.post('/executions', payload); return data as { id: string }; }

export async function listUsersPaged(params: { limit?: number; offset?: number } = {}) { const { data } = await api.get('/admin/users', { params }); return data as { items: any[]; total: number }; }
export async function listRoles() { const { data } = await api.get('/admin/users/roles'); return data.items as any[]; }
export async function createUser(payload: { email: string; displayName: string; externalId?: string; roleIds?: string[] }) { const { data } = await api.post('/admin/users', payload); return data; }
export async function updateUser(id: string, payload: { displayName?: string; roleIds?: string[] }) { const { data } = await api.put(`/admin/users/${id}`, payload); return data; }
export async function updateUserStatus(id: string, status: 'active' | 'disabled') { const { data } = await api.post(`/admin/users/${id}/status`, { status }); return data; }
export async function deleteUser(id: string) { await api.delete(`/admin/users/${id}`); }

export async function rolesListAll() { const { data } = await api.get('/admin/roles'); return data.items as any[]; }
export async function rolesCreate(payload: { name: string; description?: string }) { const { data } = await api.post('/admin/roles', payload); return data; }
export async function rolesUpdate(id: string, payload: { name?: string; description?: string }) { const { data } = await api.put(`/admin/roles/${id}`, payload); return data; }
export async function rolesDelete(id: string) { await api.delete(`/admin/roles/${id}`); }

export async function changesList(params: { table?: string; pk?: string; userId?: string; from?: string; to?: string; limit?: number; offset?: number } = {}) { const { data } = await api.get('/changes', { params }); return data as { items: any[]; total: number }; }
export async function changesByPk(table: string, pk: string) { const { data } = await api.get(`/changes/${table}/${pk}`); return data.items as any[]; }