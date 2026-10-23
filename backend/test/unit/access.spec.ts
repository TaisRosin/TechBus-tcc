import { AccessService } from '../../src/access/application/access.service';
import { MemoryTeamStore } from '../support/memory-team-store';
import type { Action, Role } from '../../src/access/domain/access';

describe('Team access', () => {
  const adminId = '00000000-0000-4000-8000-000000000001';
  const otherId = '00000000-0000-4000-8000-000000000002';
  it('lets drivers read only current assignments, never edit, and does not leak other trips', async () => {
    let assigned = true;
    const service = new AccessService(
      new MemoryTeamStore([
        {
          id: otherId,
          subject: otherId,
          role: 'driver',
          active: true,
          version: 1,
        },
      ]),
      {
        isAssigned: (user, trip) =>
          Promise.resolve(assigned && user === otherId && trip === 'own'),
      },
    );
    await expect(
      service.authorize(otherId, 'trips:read', 'own'),
    ).resolves.toMatchObject({ id: otherId });
    await expect(
      service.authorize(otherId, 'trips:read', 'other'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      service.authorize(otherId, 'trips:read'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      service.authorize(otherId, 'operations:manage', 'own'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    assigned = false;
    await expect(
      service.authorize(otherId, 'trips:read', 'own'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('allows an active administrator to manage users', async () => {
    const store = new MemoryTeamStore([
      {
        id: 'a',
        subject: 'identity-a',
        role: 'admin',
        active: true,
        version: 1,
      },
    ]);
    const access = new AccessService(store, {
      isAssigned: () => Promise.resolve(false),
    });
    await expect(
      access.authorize('identity-a', 'users:manage'),
    ).resolves.toMatchObject({ id: 'a', role: 'admin' });
  });
  it.each<[Role, Action, boolean]>([
    ['admin', 'settings:manage', true],
    ['operator', 'operations:manage', true],
    ['operator', 'users:manage', false],
    ['operator', 'settings:manage', false],
    ['driver', 'operations:manage', false],
    ['driver', 'users:manage', false],
    ['driver', 'settings:manage', false],
    ['driver', 'session', true],
    ['operator', 'trips:read', true],
  ])('%s authorization for %s is %s', async (role, action, allowed) => {
    const service = new AccessService(
      new MemoryTeamStore([
        { id: 'u', subject: 's', role, active: true, version: 1 },
      ]),
      { isAssigned: () => Promise.resolve(false) },
    );
    if (allowed)
      await expect(service.authorize('s', action)).resolves.toMatchObject({
        role,
      });
    else
      await expect(service.authorize('s', action)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
  });
  it('refuses unknown and deactivated identities even with an admin role', async () => {
    const service = new AccessService(
      new MemoryTeamStore([
        { id: 'a', subject: 's', role: 'admin', active: false, version: 1 },
      ]),
      { isAssigned: () => Promise.resolve(false) },
    );
    await expect(service.authorize('unknown', 'session')).rejects.toMatchObject(
      { code: 'FORBIDDEN' },
    );
    await expect(service.authorize('s', 'session')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('changes a current member and makes the new permissions effective', async () => {
    const store = new MemoryTeamStore([
      {
        id: adminId,
        subject: adminId,
        role: 'admin',
        active: true,
        version: 1,
      },
      {
        id: otherId,
        subject: otherId,
        role: 'operator',
        active: true,
        version: 1,
      },
    ]);
    const service = new AccessService(store, {
      isAssigned: () => Promise.resolve(false),
    });
    await expect(
      service.changeAccess(adminId, otherId, {
        role: 'driver',
        active: true,
        expectedVersion: 1,
      }),
    ).resolves.toEqual({
      id: otherId,
      role: 'driver',
      active: true,
      version: 2,
    });
    await expect(
      service.authorize(otherId, 'operations:manage'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it.each(['demote', 'deactivate'])(
    'refuses to %s the last active administrator',
    async (action) => {
      const store = new MemoryTeamStore([
        {
          id: adminId,
          subject: adminId,
          role: 'admin',
          active: true,
          version: 1,
        },
      ]);
      const service = new AccessService(store, {
        isAssigned: () => Promise.resolve(false),
      });
      await expect(
        service.changeAccess(adminId, adminId, {
          role: action === 'demote' ? 'operator' : 'admin',
          active: action !== 'deactivate',
          expectedVersion: 1,
        }),
      ).rejects.toMatchObject({ code: 'LAST_ADMIN' });
      await expect(
        service.authorize(adminId, 'session'),
      ).resolves.toMatchObject({ role: 'admin', active: true, version: 1 });
    },
  );
  it('does not let an operator promote themselves or reuse a consumed revision', async () => {
    const store = new MemoryTeamStore([
      {
        id: adminId,
        subject: adminId,
        role: 'admin',
        active: true,
        version: 1,
      },
      {
        id: otherId,
        subject: otherId,
        role: 'operator',
        active: true,
        version: 1,
      },
    ]);
    const service = new AccessService(store, {
      isAssigned: () => Promise.resolve(false),
    });
    await expect(
      service.changeAccess(otherId, otherId, {
        role: 'admin',
        active: true,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await service.changeAccess(adminId, otherId, {
      role: 'operator',
      active: false,
      expectedVersion: 1,
    });
    await expect(
      service.changeAccess(adminId, otherId, {
        role: 'admin',
        active: true,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(service.authorize(otherId, 'session')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it.each([
    { role: ['admin', 'driver'], active: true, expectedVersion: 1 },
    { role: 'custom', active: true, expectedVersion: 1 },
    { role: 'admin', active: 'true', expectedVersion: 1 },
    { role: 'admin', active: true, expectedVersion: 0 },
    {
      role: 'admin',
      active: true,
      expectedVersion: 1,
      permissions: ['anything'],
    },
    null,
  ])(
    'refuses invalid access commands without changing the record: %j',
    async (command) => {
      const store = new MemoryTeamStore([
        {
          id: adminId,
          subject: adminId,
          role: 'admin',
          active: true,
          version: 1,
        },
      ]);
      const service = new AccessService(store, {
        isAssigned: () => Promise.resolve(false),
      });
      await expect(
        service.changeAccess(adminId, adminId, command),
      ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
      await expect(
        service.authorize(adminId, 'session'),
      ).resolves.toMatchObject({ version: 1, role: 'admin' });
    },
  );
});
