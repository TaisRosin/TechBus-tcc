import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { AccessError, type TeamUser, type Role } from '../domain/access';
import {
  emailOf,
  exact,
  passwordOf,
  requireSession,
  uuidOf,
  type Credential,
  type AuthSession,
} from '../domain/auth';
import { PasswordHasher } from '../infrastructure/password-hasher';
import { PostgresAuthStore } from '../infrastructure/postgres-auth-store';
import { systemAuthClock, type AuthClock } from './auth.ports';

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const credentialQuery = `SELECT c.*,u.active,u.subject FROM app.auth_credentials c JOIN app.team_users u ON u.id=c.user_id`;
const sessionQuery = `SELECT s.*,u.active,u.subject,c.version,c.must_change,c.temporary_expires_at
 FROM app.auth_sessions s JOIN app.team_users u ON u.id=s.user_id JOIN app.auth_credentials c ON c.user_id=u.id WHERE s.token_hash=$1`;
const dummyHash = `scrypt:131072:8:1:${'00'.repeat(16)}:${'00'.repeat(64)}`;

export class AuthService {
  constructor(
    private readonly store: PostgresAuthStore,
    private readonly hasher: PasswordHasher,
    private readonly clock: AuthClock = systemAuthClock,
  ) {}

  private async event(
    tx: EntityManager,
    actor: string | null,
    target: string,
    kind: string,
  ) {
    await tx.query('INSERT INTO app.auth_events VALUES($1,$2,$3,$4,$5)', [
      randomUUID(),
      actor,
      target,
      kind,
      this.clock.now(),
    ]);
  }
  private tokenHash(token: string): string {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new AccessError('UNAUTHENTICATED', 401);
    return digest(token);
  }
  private async attempt(
    key: string,
    kind: 'account' | 'origin',
    limit: number,
  ): Promise<void> {
    const now = this.clock.now();
    const minute = new Date(Math.floor(now.getTime() / 60000) * 60000);
    const accepted = await this.store.transaction(async (tx) => {
      const rows = await tx.query<{ count: string }[]>(
        'SELECT COALESCE(sum(count),0) AS count FROM app.auth_attempt_windows WHERE key_hash=$1 AND kind=$2 AND window_start >= $3',
        [digest(key), kind, new Date(minute.getTime() - 15 * 60000)],
      );
      if (Number(rows[0].count) >= limit) return false;
      await tx.query(
        `INSERT INTO app.auth_attempt_windows VALUES($1,$2,1,$3)
        ON CONFLICT(key_hash,window_start,kind) DO UPDATE SET count=app.auth_attempt_windows.count+1`,
        [digest(key), minute, kind],
      );
      return true;
    });
    if (!accepted) throw new AccessError('AUTH_RATE_LIMITED', 429);
  }
  async login(input: unknown, origin: string) {
    const body = exact(input, ['email', 'password']);
    const email = emailOf(body.email),
      password = passwordOf(body.password);
    await this.attempt(origin, 'origin', 30);
    // Reserve account attempt before expensive work; successful attempts release their reservation.
    await this.attempt(email, 'account', 5);
    const credential = await this.store.transaction(
      async (tx) =>
        (
          await tx.query<Credential[]>(`${credentialQuery} WHERE c.email=$1`, [
            email,
          ])
        )[0],
    );
    const verified = await this.hasher.verify(
      password,
      credential?.password_hash ?? dummyHash,
    );
    return this.store.transaction(async (tx) => {
      const current = (
        await tx.query<Credential[]>(`${credentialQuery} WHERE c.email=$1`, [
          email,
        ])
      )[0];
      const now = this.clock.now();
      if (
        !verified ||
        !credential ||
        !current ||
        !current.active ||
        current.version !== credential.version ||
        current.password_hash !== credential.password_hash ||
        (current.must_change &&
          (!current.temporary_expires_at ||
            now >= current.temporary_expires_at))
      )
        throw new AccessError('UNAUTHENTICATED', 401);
      const minute = new Date(Math.floor(now.getTime() / 60000) * 60000);
      // Reset successful account windows, while retaining the per-origin cap.
      await tx.query(
        "UPDATE app.auth_attempt_windows SET count=0 WHERE key_hash=$1 AND kind='account' AND window_start <= $2",
        [digest(email), minute],
      );
      const token = randomBytes(32).toString('base64url');
      const scope = current.must_change ? 'password-change' : 'operation';
      const expiresAt = new Date(
        Math.min(
          now.getTime() + (current.must_change ? 600000 : 43200000),
          current.temporary_expires_at?.getTime() ?? Infinity,
        ),
      );
      await tx.query(
        'INSERT INTO app.auth_sessions VALUES($1,$2,$3,$4,$5,$6,$6,$7,NULL)',
        [
          randomUUID(),
          current.user_id,
          digest(token),
          scope,
          current.version,
          now,
          expiresAt,
        ],
      );
      return { token, scope, expiresAt: expiresAt.toISOString() };
    });
  }
  async verify(token: string, renew = false): Promise<{ subject: string }> {
    const hash = this.tokenHash(token);
    return this.store.transaction(async (tx) => {
      const now = this.clock.now();
      const session = requireSession(
        (await tx.query<AuthSession[]>(sessionQuery, [hash]))[0],
        now,
        'operation',
      );
      if (renew)
        await tx.query(
          'UPDATE app.auth_sessions SET last_activity_at=GREATEST(last_activity_at,$2) WHERE id=$1',
          [session.id, now],
        );
      return { subject: session.subject };
    });
  }
  async logout(token: string): Promise<void> {
    const hash = this.tokenHash(token);
    await this.store.transaction(async (tx) => {
      const session = (await tx.query<AuthSession[]>(sessionQuery, [hash]))[0];
      if (!session || session.revoked_at) return;
      await tx.query('UPDATE app.auth_sessions SET revoked_at=$2 WHERE id=$1', [
        session.id,
        this.clock.now(),
      ]);
      await this.event(tx, session.user_id, session.user_id, 'logout');
    });
  }
  private async admin(tx: EntityManager, subject: string): Promise<TeamUser> {
    const actor = (
      await tx.query<TeamUser[]>(
        'SELECT * FROM app.team_users WHERE subject=$1',
        [subject],
      )
    )[0];
    if (!actor?.active || actor.role !== 'admin')
      throw new AccessError('FORBIDDEN', 403);
    return actor;
  }
  private async target(tx: EntityManager, id: string): Promise<TeamUser> {
    const user = (
      await tx.query<TeamUser[]>('SELECT * FROM app.team_users WHERE id=$1', [
        uuidOf(id),
      ])
    )[0];
    if (!user) throw new AccessError('NOT_FOUND', 404);
    return user;
  }
  private async assertEmail(tx: EntityManager, email: string) {
    if (
      (
        await tx.query<Credential[]>(
          'SELECT user_id FROM app.auth_credentials WHERE email=$1',
          [email],
        )
      ).length
    )
      throw new AccessError('EMAIL_EXISTS', 409);
  }
  private async temporary() {
    const temporaryPassword = randomBytes(24).toString('base64url');
    return {
      temporaryPassword,
      hash: await this.hasher.hash(temporaryPassword),
    };
  }
  private async insertCredential(
    tx: EntityManager,
    user: TeamUser,
    email: string,
    temp: { temporaryPassword: string; hash: string },
    actor: string | null,
    kind: string,
  ) {
    const now = this.clock.now(),
      expires = new Date(now.getTime() + 86400000);
    await tx.query(
      'INSERT INTO app.auth_credentials VALUES($1,$2,$3,true,$4,1,$5)',
      [user.id, email, temp.hash, expires, now],
    );
    await this.event(tx, actor, user.id, kind);
    return {
      id: user.id,
      email,
      role: user.role,
      temporaryPassword: temp.temporaryPassword,
      temporaryExpiresAt: expires.toISOString(),
      credentialVersion: 1,
    };
  }
  async create(subject: string, input: unknown) {
    const body = exact(input, ['email', 'role']),
      email = emailOf(body.email);
    if (
      typeof body.role !== 'string' ||
      !['admin', 'operator', 'driver'].includes(body.role)
    )
      throw new AccessError('INVALID_INPUT', 400);
    await this.store.transaction((tx) => this.admin(tx, subject));
    const temp = await this.temporary();
    return this.store.transaction(async (tx) => {
      const actor = await this.admin(tx, subject);
      await this.assertEmail(tx, email);
      const user: TeamUser = {
        id: randomUUID(),
        subject: randomUUID(),
        role: body.role as Role,
        active: true,
        version: 1,
      };
      await tx.query('INSERT INTO app.team_users VALUES($1,$2,$3,true,1)', [
        user.id,
        user.subject,
        user.role,
      ]);
      return this.insertCredential(tx, user, email, temp, actor.id, 'create');
    });
  }
  async provision(subject: string, id: string, input: unknown) {
    uuidOf(id);
    const email = emailOf(exact(input, ['email']).email);
    await this.store.transaction((tx) => this.admin(tx, subject));
    const temp = await this.temporary();
    return this.store.transaction(async (tx) => {
      const actor = await this.admin(tx, subject),
        user = await this.target(tx, id);
      if (
        (
          await tx.query<Credential[]>(
            'SELECT user_id FROM app.auth_credentials WHERE user_id=$1',
            [id],
          )
        ).length
      )
        throw new AccessError('CREDENTIALS_EXIST', 409);
      await this.assertEmail(tx, email);
      return this.insertCredential(
        tx,
        user,
        email,
        temp,
        actor.id,
        'provision',
      );
    });
  }
  async metadata(subject: string, id: string) {
    uuidOf(id);
    return this.store.transaction(async (tx) => {
      await this.admin(tx, subject);
      await this.target(tx, id);
      const c = (
        await tx.query<Credential[]>(
          'SELECT * FROM app.auth_credentials WHERE user_id=$1',
          [id],
        )
      )[0];
      return c
        ? {
            email: c.email,
            mustChange: c.must_change,
            temporaryExpiresAt: c.temporary_expires_at?.toISOString() ?? null,
            credentialVersion: c.version,
          }
        : { provisioned: false };
    });
  }
  async changePassword(
    token: string,
    input: unknown,
    origin: string,
  ): Promise<void> {
    const hash = this.tokenHash(token),
      password = passwordOf(exact(input, ['newPassword']).newPassword, true);
    await this.attempt(origin, 'origin', 30);
    const snapshot = await this.store.transaction(async (tx) => {
      const s = requireSession(
        (await tx.query<AuthSession[]>(sessionQuery, [hash]))[0],
        this.clock.now(),
        'password-change',
      );
      const c = (
        await tx.query<Credential[]>(
          'SELECT * FROM app.auth_credentials WHERE user_id=$1',
          [s.user_id],
        )
      )[0];
      return { s, c };
    });
    await this.attempt(`change:${snapshot.s.user_id}`, 'account', 5);
    if (await this.hasher.verify(password, snapshot.c.password_hash))
      throw new AccessError('INVALID_INPUT', 400);
    const newHash = await this.hasher.hash(password);
    await this.store.transaction(async (tx) => {
      const s = requireSession(
        (await tx.query<AuthSession[]>(sessionQuery, [hash]))[0],
        this.clock.now(),
        'password-change',
      );
      if (s.credential_version !== snapshot.c.version)
        throw new AccessError('UNAUTHENTICATED', 401);
      await tx.query(
        'UPDATE app.auth_credentials SET password_hash=$2,must_change=false,temporary_expires_at=NULL,version=version+1,updated_at=$3 WHERE user_id=$1',
        [s.user_id, newHash, this.clock.now()],
      );
      await tx.query(
        'UPDATE app.auth_sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE user_id=$1',
        [s.user_id, this.clock.now()],
      );
      await this.event(tx, s.user_id, s.user_id, 'change');
    });
  }
  private async replaceCredential(
    tx: EntityManager,
    user: TeamUser,
    c: Credential,
    temp: { temporaryPassword: string; hash: string },
    actor: string | null,
    kind: string,
  ) {
    const now = this.clock.now(),
      expires = new Date(now.getTime() + 86400000);
    await tx.query(
      'UPDATE app.auth_credentials SET password_hash=$2,must_change=true,temporary_expires_at=$3,version=version+1,updated_at=$4 WHERE user_id=$1',
      [user.id, temp.hash, expires, now],
    );
    await tx.query(
      'UPDATE app.auth_sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE user_id=$1',
      [user.id, now],
    );
    await this.event(tx, actor, user.id, kind);
    return {
      id: user.id,
      email: c.email,
      role: user.role,
      temporaryPassword: temp.temporaryPassword,
      temporaryExpiresAt: expires.toISOString(),
      credentialVersion: c.version + 1,
    };
  }
  async reset(subject: string, id: string, input: unknown) {
    uuidOf(id);
    const version = exact(input, [
      'expectedCredentialVersion',
    ]).expectedCredentialVersion;
    if (
      typeof version !== 'number' ||
      !Number.isSafeInteger(version) ||
      version < 1 ||
      version >= 2147483647
    )
      throw new AccessError('INVALID_INPUT', 400);
    await this.store.transaction((tx) => this.admin(tx, subject));
    const temp = await this.temporary();
    return this.store.transaction(async (tx) => {
      const actor = await this.admin(tx, subject),
        user = await this.target(tx, id);
      const c = (
        await tx.query<Credential[]>(
          'SELECT * FROM app.auth_credentials WHERE user_id=$1',
          [id],
        )
      )[0];
      if (!c) throw new AccessError('NOT_FOUND', 404);
      if (c.version !== version) throw new AccessError('VERSION_CONFLICT', 409);
      return this.replaceCredential(tx, user, c, temp, actor.id, 'reset');
    });
  }
  async bootstrap(input: unknown) {
    const email = emailOf(exact(input, ['email']).email),
      temp = await this.temporary();
    return this.store.transaction(async (tx) => {
      if (
        (await tx.query<TeamUser[]>('SELECT id FROM app.team_users LIMIT 1'))
          .length
      )
        throw new AccessError('TEAM_EXISTS', 409);
      const user: TeamUser = {
        id: randomUUID(),
        subject: randomUUID(),
        role: 'admin',
        active: true,
        version: 1,
      };
      await tx.query(
        "INSERT INTO app.team_users VALUES($1,$2,'admin',true,1)",
        [user.id, user.subject],
      );
      return this.insertCredential(tx, user, email, temp, null, 'bootstrap');
    });
  }
  async recoverAdmin(id: string, email?: string) {
    uuidOf(id);
    const normalized = email === undefined ? undefined : emailOf(email),
      temp = await this.temporary();
    return this.store.transaction(async (tx) => {
      const user = await this.target(tx, id);
      const admins = await tx.query<TeamUser[]>(
        "SELECT id FROM app.team_users WHERE active AND role='admin'",
      );
      if (
        !user.active ||
        user.role !== 'admin' ||
        admins.length !== 1 ||
        admins[0].id !== id
      )
        throw new AccessError('FORBIDDEN', 403);
      const c = (
        await tx.query<Credential[]>(
          'SELECT * FROM app.auth_credentials WHERE user_id=$1',
          [id],
        )
      )[0];
      if (c) {
        if (normalized && normalized !== c.email)
          throw new AccessError('INVALID_INPUT', 400);
        return this.replaceCredential(
          tx,
          user,
          c,
          temp,
          null,
          'technical-reset',
        );
      }
      if (!normalized) throw new AccessError('EMAIL_REQUIRED', 400);
      await this.assertEmail(tx, normalized);
      return this.insertCredential(
        tx,
        user,
        normalized,
        temp,
        null,
        'technical-reset',
      );
    });
  }
}
