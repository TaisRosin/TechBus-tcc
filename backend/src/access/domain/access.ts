export type Role = 'admin' | 'operator' | 'driver';
export type Action =
  | 'session'
  | 'users:manage'
  | 'settings:manage'
  | 'operations:manage'
  | 'trips:read';
export interface TeamUser {
  id: string;
  subject: string;
  role: Role;
  active: boolean;
  version: number;
}
export type UserView = Omit<TeamUser, 'subject'>;
export function userView(user: TeamUser): UserView {
  return {
    id: user.id,
    role: user.role,
    active: user.active,
    version: user.version,
  };
}
export class AccessError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}
export interface ChangeAccess {
  role: Role;
  active: boolean;
  expectedVersion: number;
}
export function parseChangeAccess(input: unknown): ChangeAccess {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AccessError('INVALID_INPUT', 400);
  const value = input as Record<string, unknown>;
  if (
    Object.keys(value).sort().join(',') !== 'active,expectedVersion,role' ||
    typeof value.role !== 'string' ||
    !['admin', 'operator', 'driver'].includes(value.role) ||
    typeof value.active !== 'boolean' ||
    typeof value.expectedVersion !== 'number' ||
    !Number.isSafeInteger(value.expectedVersion) ||
    value.expectedVersion < 1 ||
    value.expectedVersion >= 2147483647
  ) {
    throw new AccessError('INVALID_INPUT', 400);
  }
  return {
    role: value.role as Role,
    active: value.active,
    expectedVersion: value.expectedVersion,
  };
}
