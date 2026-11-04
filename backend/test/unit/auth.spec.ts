import {
  emailOf,
  passwordOf,
  exact,
  requireSession,
  type AuthSession,
} from '../../src/access/domain/auth';

describe('Authentication contract boundaries', () => {
  it('normalizes only the email and preserves password spaces and unicode', () => {
    expect(emailOf(' Pessoa@Example.test ')).toBe('pessoa@example.test');
    expect(passwordOf('  uma frase ç segura  ', true)).toBe(
      '  uma frase ç segura  ',
    );
  });
  it.each([
    '',
    'invalid',
    'a b@example.test',
    '@example.test',
    `${'x'.repeat(250)}@a.test`,
  ])('rejects invalid email %s', (value) => {
    expect(() => emailOf(value)).toThrow('INVALID_INPUT');
  });
  it.each(['curta', 'a'.repeat(129)])(
    'does not accept short or truncated definitive passwords',
    (value) => {
      expect(() => passwordOf(value, true)).toThrow('INVALID_INPUT');
    },
  );
  it('rejects undeclared fields instead of accepting a client role', () => {
    expect(() =>
      exact({ email: 'a@b.test', password: 'secret', role: 'admin' }, [
        'email',
        'password',
      ]),
    ).toThrow('INVALID_INPUT');
  });
  it.each(['revoked', 'inactive', 'old-version', 'restricted', 'expired'])(
    'fails closed for %s session',
    (cause) => {
      const now = new Date('2026-10-28T10:00:00Z');
      const session: AuthSession = {
        id: 'test',
        user_id: 'test',
        subject: 'test',
        scope: 'operation',
        credential_version: 1,
        version: 1,
        must_change: false,
        active: true,
        created_at: now,
        last_activity_at: now,
        expires_at: new Date('2026-10-28T22:00:00Z'),
        revoked_at: null,
        temporary_expires_at: null,
      };
      if (cause === 'revoked') session.revoked_at = now;
      if (cause === 'inactive') session.active = false;
      if (cause === 'old-version') session.version = 2;
      if (cause === 'restricted') session.scope = 'password-change';
      if (cause === 'expired') session.expires_at = now;
      expect(() => requireSession(session, now, 'operation')).toThrow(
        'UNAUTHENTICATED',
      );
    },
  );
});
