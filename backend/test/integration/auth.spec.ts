import { randomUUID, createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PasswordHasher } from '../../src/access/infrastructure/password-hasher';
import { PostgresAuthStore } from '../../src/access/infrastructure/postgres-auth-store';
import { AuthService } from '../../src/access/application/auth.service';
import { PostgresTeamStore } from '../../src/access/infrastructure/postgres-team-store';
import { AccessService } from '../../src/access/application/access.service';

describe('Own authentication with PostgreSQL', () => {
  let source: DataSource;
  let store: PostgresAuthStore;
  let auth: AuthService;
  let now: Date;
  let id: string;
  let created: string[] = [];
  let origins: string[] = [];
  const origin = () => {
    const value = randomUUID();
    origins.push(value);
    return value;
  };
  const password = 'frase individual de testes';
  const email = 'admin-auth@example.test';
  beforeAll(async () => {
    const raw = loadLocalEnvironment('test');
    source = createTestDataSource(raw);
    await source.initialize();
    await source.runMigrations();
    store = new PostgresAuthStore(readEnvironment(raw).database);
    auth = new AuthService(store, new PasswordHasher(), { now: () => now });
  });
  beforeEach(async () => {
    created = [];
    origins = [];
    now = new Date('2026-10-28T10:00:00Z');
    id = randomUUID();
    await source.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'admin',true)",
      [id],
    );
    await source.query(
      `INSERT INTO app.auth_credentials VALUES($1,$2,$3,false,NULL,1,$4)`,
      [id, email, await new PasswordHasher().hash(password), now],
    );
  });
  afterEach(async () => {
    const ids = [id, ...created];
    const emails = await source.query<{ email: string }[]>(
      'SELECT email FROM app.auth_credentials WHERE user_id=ANY($1::uuid[])',
      [ids],
    );
    for (const key of [
      ...emails.map((x) => x.email),
      email,
      'login-test',
      ...ids.map((x) => `change:${x}`),
      ...origins,
    ])
      await source.query(
        'DELETE FROM app.auth_attempt_windows WHERE key_hash=$1',
        [createHash('sha256').update(key).digest('hex')],
      );
    await source.query(
      'DELETE FROM app.auth_events WHERE target_id=ANY($1::uuid[]) OR actor_id=ANY($1::uuid[])',
      [ids],
    );
    await source.query(
      'DELETE FROM app.auth_sessions WHERE user_id=ANY($1::uuid[])',
      [ids],
    );
    await source.query(
      'DELETE FROM app.auth_credentials WHERE user_id=ANY($1::uuid[])',
      [ids],
    );
    await source.query('DELETE FROM app.team_users WHERE id=ANY($1::uuid[])', [
      ids,
    ]);
  });
  afterAll(async () => {
    await store?.close();
    await source?.destroy();
  });
  it('logs in a real account, validates identity, and revokes logout replay', async () => {
    const login = await auth.login(
      { email: ' ADMIN-AUTH@example.test ', password },
      'login-test',
    );
    expect(login.scope).toBe('operation');
    expect(await auth.verify(login.token)).toEqual({ subject: id });
    await auth.logout(login.token);
    await expect(auth.verify(login.token)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
  it('expires exactly at idle boundary and passive checks do not extend it', async () => {
    const login = await auth.login({ email, password }, randomUUID());
    now = new Date('2026-10-28T10:59:59.999Z');
    await expect(auth.verify(login.token)).resolves.toEqual({ subject: id });
    now = new Date('2026-10-28T11:00:00Z');
    await expect(auth.verify(login.token, true)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
  it('never renews beyond twelve hours even with activity', async () => {
    const login = await auth.login({ email, password }, randomUUID());
    for (let i = 1; i < 24; i++) {
      now = new Date(Date.parse('2026-10-28T10:00:00Z') + i * 1800000);
      await auth.verify(login.token, true);
    }
    now = new Date('2026-10-28T22:00:00Z');
    await expect(auth.verify(login.token, true)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
  it('creates an individual account with a one-use restricted password flow', async () => {
    const account = await auth.create(id, {
      email: 'operator-auth@example.test',
      role: 'operator',
    });
    created.push(account.id);
    const temporary = await auth.login(
      { email: account.email, password: account.temporaryPassword },
      origin(),
    );
    await expect(auth.verify(temporary.token)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await auth.changePassword(
      temporary.token,
      { newPassword: password },
      origin(),
    );
    await expect(
      auth.changePassword(
        temporary.token,
        { newPassword: 'outra frase de senha' },
        origin(),
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    const definitive = await auth.login(
      { email: account.email, password },
      origin(),
    );
    expect(definitive.scope).toBe('operation');
    const metadata = await auth.metadata(id, account.id);
    expect(metadata).toMatchObject({
      email: account.email,
      mustChange: false,
      credentialVersion: 2,
    });
    expect(metadata).not.toHaveProperty('password_hash');
  });
  it('resets credentials atomically without reactivating the account', async () => {
    const login = await auth.login({ email, password }, randomUUID());
    const reset = await auth.reset(id, id, { expectedCredentialVersion: 1 });
    await expect(auth.verify(login.token)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await expect(
      auth.login({ email, password }, randomUUID()),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    await expect(
      auth.reset(id, id, { expectedCredentialVersion: 1 }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      id,
    ]);
    await expect(
      auth.login({ email, password: reset.temporaryPassword }, randomUUID()),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
  it('admits exactly one concurrent password change', async () => {
    const reset = await auth.reset(id, id, { expectedCredentialVersion: 1 });
    const session = await auth.login(
      { email, password: reset.temporaryPassword },
      origin(),
    );
    const outcomes = await Promise.allSettled([
      auth.changePassword(session.token, { newPassword: password }, origin()),
      auth.changePassword(
        session.token,
        { newPassword: 'outra senha individual' },
        origin(),
      ),
    ]);
    expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  });
  it('recovers only the explicitly selected sole active admin', async () => {
    const recovery = await auth.recoverAdmin(id);
    expect(recovery.credentialVersion).toBe(2);
    const context = await auth.login(
      { email, password: recovery.temporaryPassword },
      origin(),
    );
    expect(context.scope).toBe('password-change');
    await expect(auth.recoverAdmin(randomUUID())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
  it('bootstraps once, including simultaneous requests', async () => {
    await source.query('DELETE FROM app.auth_credentials WHERE user_id=$1', [
      id,
    ]);
    await source.query('DELETE FROM app.team_users WHERE id=$1', [id]);
    const results = await Promise.allSettled([
      auth.bootstrap({ email }),
      auth.bootstrap({ email }),
    ]);
    for (const r of results)
      if (r.status === 'fulfilled') created.push(r.value.id);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await expect(auth.bootstrap({ email })).rejects.toMatchObject({
      code: 'TEAM_EXISTS',
    });
  });
  it('does not issue an old-password session when reset commits during verification', async () => {
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    class PausedVerifier extends PasswordHasher {
      async verify(value: string, encoded: string) {
        const result = await super.verify(value, encoded);
        entered();
        await gate;
        return result;
      }
    }
    const paused = new AuthService(store, new PausedVerifier(), {
      now: () => now,
    });
    const login = paused.login({ email, password }, origin());
    await started;
    try {
      await auth.reset(id, id, { expectedCredentialVersion: 1 });
    } finally {
      release();
    }
    await expect(login).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
  it('rechecks the admin after expensive credential work and before reset commits', async () => {
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    class PausedHasher extends PasswordHasher {
      async hash(value: string) {
        const result = await super.hash(value);
        entered();
        await gate;
        return result;
      }
    }
    const paused = new AuthService(store, new PausedHasher(), {
      now: () => now,
    });
    const reset = paused.reset(id, id, { expectedCredentialVersion: 1 });
    await started;
    try {
      await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
        id,
      ]);
    } finally {
      release();
    }
    await expect(reset).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await source.query('UPDATE app.team_users SET active=true WHERE id=$1', [
      id,
    ]);
    expect((await auth.login({ email, password }, origin())).scope).toBe(
      'operation',
    );
  });
  it('rejects expired temporary passwords exactly at 24h and replacement invalidates the previous one', async () => {
    const first = await auth.reset(id, id, { expectedCredentialVersion: 1 });
    now = new Date('2026-10-29T10:00:00Z');
    await expect(
      auth.login({ email, password: first.temporaryPassword }, origin()),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    const second = await auth.reset(id, id, { expectedCredentialVersion: 2 });
    await expect(
      auth.login({ email, password: first.temporaryPassword }, origin()),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(
      (
        await auth.login(
          { email, password: second.temporaryPassword },
          origin(),
        )
      ).scope,
    ).toBe('password-change');
  });
  it('expires password-change context at ten minutes without consuming valid temporary password', async () => {
    const reset = await auth.reset(id, id, { expectedCredentialVersion: 1 });
    const context = await auth.login(
      { email, password: reset.temporaryPassword },
      origin(),
    );
    now = new Date('2026-10-28T10:10:00Z');
    await expect(
      auth.changePassword(context.token, { newPassword: password }, origin()),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(
      (await auth.login({ email, password: reset.temporaryPassword }, origin()))
        .scope,
    ).toBe('password-change');
  });
  it('creates only one account for concurrent normalized emails', async () => {
    const results = await Promise.allSettled([
      auth.create(id, { email: 'duplicate@example.test', role: 'driver' }),
      auth.create(id, { email: ' DUPLICATE@example.test ', role: 'driver' }),
    ]);
    for (const result of results)
      if (result.status === 'fulfilled') created.push(result.value.id);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'EMAIL_EXISTS' },
    });
  });
  it('preserves a legacy inactive account during provisioning and reset', async () => {
    const legacy = randomUUID();
    created.push(legacy);
    await source.query(
      "INSERT INTO app.team_users VALUES($1,$1,'driver',false,1)",
      [legacy],
    );
    const provisioned = await auth.provision(id, legacy, {
      email: 'legacy@example.test',
    });
    const reset = await auth.reset(id, legacy, {
      expectedCredentialVersion: 1,
    });
    expect(reset.id).toBe(legacy);
    await expect(
      auth.login(
        { email: provisioned.email, password: reset.temporaryPassword },
        origin(),
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    await expect(
      auth.provision(id, legacy, { email: 'different@example.test' }),
    ).rejects.toMatchObject({ code: 'CREDENTIALS_EXIST' });
  });
  it('enforces admin authority for credential administration', async () => {
    await source.query(
      "UPDATE app.team_users SET role='operator' WHERE id=$1",
      [id],
    );
    await expect(
      auth.create(id, { email: 'forbidden@example.test', role: 'admin' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      auth.reset(id, id, { expectedCredentialVersion: 1 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(auth.metadata(id, id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(auth.recoverAdmin(id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('deactivation through existing access service permanently revokes the previous session', async () => {
    const second = await auth.create(id, {
      email: 'second-admin@example.test',
      role: 'admin',
    });
    created.push(second.id);
    const login = await auth.login({ email, password }, origin());
    const team = new PostgresTeamStore(
      readEnvironment(loadLocalEnvironment('test')).database,
    );
    const access = new AccessService(team, {
      isAssigned: () => Promise.resolve(false),
    });
    const secondSubject = (
      await source.query<{ subject: string }[]>(
        'SELECT subject FROM app.team_users WHERE id=$1',
        [second.id],
      )
    )[0].subject;
    try {
      await access.changeAccess(secondSubject, id, {
        role: 'admin',
        active: false,
        expectedVersion: 1,
      });
      await access.changeAccess(secondSubject, id, {
        role: 'admin',
        active: true,
        expectedVersion: 2,
      });
      await expect(auth.verify(login.token)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
    } finally {
      await team.close();
    }
  });
  it('persists failed-attempt limits across service instances and releases after the window', async () => {
    for (let i = 0; i < 5; i++)
      await expect(
        auth.login({ email, password: 'incorrect' }, origin()),
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    const other = new AuthService(store, new PasswordHasher(), {
      now: () => now,
    });
    await expect(
      other.login({ email, password }, origin()),
    ).rejects.toMatchObject({ code: 'AUTH_RATE_LIMITED' });
    now = new Date('2026-10-28T10:16:00Z');
    expect((await other.login({ email, password }, origin())).scope).toBe(
      'operation',
    );
  });
});
