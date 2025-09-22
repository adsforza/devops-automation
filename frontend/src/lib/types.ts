export interface UserDto {
  id: string;
  email: string;
  displayName?: string;
  roles: string[];
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface DbConnectionDto {
  id: string;
  name: string;
  engine: string;
  host: string;
  port: number;
  database: string;
  isActive: boolean;
}

export interface ScriptDto { id: string; key: string; name: string; description?: string; }
export interface ExecutionDto { id: string; status: string; startedAt: string; endedAt?: string; }
export interface AuditLogDto { id: string; action: string; resourceType: string; resourceId: string; eventTime: string; }
export interface RoleDto { id: string; name: string; description?: string }

