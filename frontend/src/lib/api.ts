import axios from 'axios';

export const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
	withCredentials: true,
});

export async function getMe() {
	const { data } = await api.get('/auth/me');
	return data.user;
}

export async function listConnections() {
	const { data } = await api.get('/db-connections');
	return data.items as any[];
}

export async function listScripts() {
	const { data } = await api.get('/scripts');
	return data.items as any[];
}

export async function listExecutions() {
	const { data } = await api.get('/executions?limit=10');
	return data.items as any[];
}

export async function listAudit(params: Record<string, any> = {}) {
	const { data } = await api.get('/audit', { params });
	return data.items as any[];
}

export async function startExecution(payload: { scriptId: string; dbConnectionId: string; params: Record<string, unknown> }) {
	const { data } = await api.post('/executions', payload);
	return data as { id: string };
}