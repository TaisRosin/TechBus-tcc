import { AccessError } from './access';

export function exact(input: unknown, keys: string[]): Record<string, unknown> {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).sort().join(',') !== [...keys].sort().join(',')
  )
    throw new AccessError('INVALID_INPUT', 400);
  return input as Record<string, unknown>;
}
export function emailOf(value: unknown): string {
  if (typeof value !== 'string') throw new AccessError('INVALID_INPUT', 400);
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AccessError('INVALID_INPUT', 400);
  return email;
}
export function passwordOf(value: unknown, definitive = false): string {
  if (
    typeof value !== 'string' ||
    [...value].length < (definitive ? 15 : 1) ||
    [...value].length > 128
  )
    throw new AccessError('INVALID_INPUT', 400);
  return value;
}
export function uuidOf(value: string): string {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new AccessError('INVALID_INPUT', 400);
  return value;
}
export interface Credential {
  user_id: string;
  email: string;
  password_hash: string;
  must_change: boolean;
  temporary_expires_at: Date | null;
  version: number;
  active: boolean;
  subject: string;
}
export interface AuthSession {
  id: string;
  user_id: string;
  subject: string;
  scope: 'operation' | 'password-change';
  credential_version: number;
  version: number;
  must_change: boolean;
  active: boolean;
  created_at: Date;
  last_activity_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  temporary_expires_at: Date | null;
}
export function requireSession(
  session: AuthSession | undefined,
  now: Date,
  scope?: AuthSession['scope'],
): AuthSession {
  if (
    !session ||
    !session.active ||
    session.revoked_at ||
    session.credential_version !== session.version ||
    now.getTime() >= session.expires_at.getTime() ||
    now.getTime() >= session.last_activity_at.getTime() + 3600000 ||
    (scope && session.scope !== scope) ||
    (session.scope === 'operation' && session.must_change) ||
    (session.scope === 'password-change' &&
      (!session.must_change ||
        !session.temporary_expires_at ||
        now >= session.temporary_expires_at))
  )
    throw new AccessError('UNAUTHENTICATED', 401);
  return session;
}
