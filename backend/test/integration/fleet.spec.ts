import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { FleetService } from '../../src/fleet/application/fleet.service';
import { LocationService } from '../../src/registry/application/location.service';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../src/registry/application/ports';
import { Fleet1793400000000 } from '../../src/infrastructure/database/migrations/1793400000000-fleet';
describe('Fleet on isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    other: PostgresRegistryStore,
    service: FleetService,
    second: FleetService;
  const actor = randomUUID(),
    vehicles: string[] = [],
    drivers: string[] = [],
    groups: string[] = [];
  const vehicle = async () => {
    const v = await service.createVehicle(actor, {
      identifier: randomUUID(),
      plate: randomUUID().replaceAll('-', '').slice(0, 12),
      kind: 'bus',
      seats: 44,
    });
    vehicles.push(v.id);
    return v;
  };
  const driver = async () => {
    const d = await service.createDriver(actor, {
      name: 'Motorista sintético',
      phone: '+5546999990000',
    });
    drivers.push(d.id);
    return d;
  };
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    await source.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'operator',true)",
      [actor],
    );
    store = new PostgresRegistryStore(readEnvironment(env).database);
    other = new PostgresRegistryStore(readEnvironment(env).database);
    service = new FleetService(store);
    second = new FleetService(other);
  });
  afterAll(async () => {
    await store?.close();
    await other?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.fleet_exceptions WHERE vehicle_id=ANY($1::uuid[])',
        [vehicles],
      );
      await source.query(
        'DELETE FROM app.fleet_vehicles WHERE id=ANY($1::uuid[])',
        [vehicles],
      );
      await source.query(
        'DELETE FROM app.fleet_drivers WHERE id=ANY($1::uuid[])',
        [drivers],
      );
      await source.query(
        'DELETE FROM app.local_groups WHERE id=ANY($1::uuid[])',
        [groups],
      );
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      await source.destroy();
    }
  });
  it('persists vehicles and independent drivers, rejects duplicates and protects revisions', async () => {
    const v = await vehicle(),
      d = await driver();
    expect(
      (await second.listVehicles(actor)).find((row) => row.id === v.id),
    ).toMatchObject({ seats: 44, active: true, version: 1, week: null });
    expect(
      (await second.listDrivers(actor)).find((row) => row.id === d.id)?.name,
    ).toBe('Motorista sintético');
    await expect(
      service.createVehicle(actor, {
        identifier: v.identifier.toLowerCase(),
        plate: 'ZZ9999',
        kind: 'van',
        seats: 10,
      }),
    ).rejects.toMatchObject({ code: 'VEHICLE_IDENTIFIER_IN_USE' });
    await expect(
      service.createVehicle(actor, {
        identifier: randomUUID(),
        plate: v.plate.toLowerCase(),
        kind: 'van',
        seats: 10,
      }),
    ).rejects.toMatchObject({ code: 'VEHICLE_PLATE_IN_USE' });
    const edit = {
      identifier: v.identifier,
      plate: v.plate,
      kind: v.kind,
      seats: 40,
      active: false,
      expectedVersion: 1,
    };
    expect(await service.updateVehicle(actor, v.id, edit)).toMatchObject({
      seats: 40,
      active: false,
      version: 2,
    });
    await expect(second.updateVehicle(actor, v.id, edit)).rejects.toMatchObject(
      { code: 'VERSION_CONFLICT' },
    );
    await expect(
      service.createVehicle(actor, {
        identifier: 'invalid',
        plate: 'X',
        kind: 'bus',
        seats: 0,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    const runner = source.createQueryRunner();
    try {
      await runner.connect();
      await expect(new Fleet1793400000000().down(runner)).rejects.toThrow(
        'B11_DATA_REQUIRES_PRESERVATION',
      );
    } finally {
      await runner.release();
    }
  });
  it('uses weekly availability with date overrides, restoring inheritance and rejecting stale edits', async () => {
    const v = await vehicle(),
      windows = [{ stage: 'intermunicipal', start: 1000, end: 1500 }],
      week = Array.from({ length: 7 }, () => windows);
    expect(await service.availability(actor, v.id)).toEqual({
      vehicleId: v.id,
      version: 1,
      week: null,
    });
    expect(
      await service.setWeek(actor, v.id, { week, expectedVersion: 1 }),
    ).toMatchObject({ version: 2, week });
    expect(
      await second.setException(actor, v.id, '2026-10-25', {
        windows: [],
        expectedVersion: 2,
      }),
    ).toMatchObject({ version: 3 });
    expect(
      await service.exceptions(actor, v.id, {
        from: '2026-10-25',
        to: '2026-10-25',
      }),
    ).toEqual([{ date: '2026-10-25', windows: [] }]);
    await expect(
      service.setWeek(actor, v.id, { week: null, expectedVersion: 2 }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await service.setException(actor, v.id, '2026-10-25', {
      windows: null,
      expectedVersion: 3,
    });
    expect(
      await service.exceptions(actor, v.id, {
        from: '2026-10-25',
        to: '2026-10-25',
      }),
    ).toEqual([]);
    expect((await service.availability(actor, v.id)).week).toEqual(week);
  });
  it('requires complete availability, with exceptions overriding the week and no implicit availability', async () => {
    const v = await vehicle(),
      d = await driver();
    const trip = {
      kind: 'intermunicipal',
      vehicleId: v.id,
      universityId: 'unimater',
      outbound: { driverId: d.id, start: 1000, end: 1100 },
      return: { driverId: d.id, start: 1400, end: 1500 },
    };
    const input = { date: '2026-10-25', trips: [trip] };
    expect(await service.evaluate(actor, input)).toEqual({
      eligible: false,
      issues: [{ index: 0, code: 'AVAILABILITY_NOT_CONFIGURED' }],
    });
    await service.setWeek(actor, v.id, {
      week: Array.from({ length: 7 }, () => [
        { stage: 'intermunicipal', start: 1000, end: 1500 },
      ]),
      expectedVersion: 1,
    });
    expect(await service.evaluate(actor, input)).toEqual({
      eligible: true,
      issues: [],
    });
    await service.setException(actor, v.id, input.date, {
      windows: [],
      expectedVersion: 2,
    });
    expect((await service.evaluate(actor, input)).issues).toContainEqual({
      index: 0,
      code: 'VEHICLE_UNAVAILABLE',
    });
    expect(
      (await service.evaluate(actor, { ...input, date: '2026-10-26' }))
        .eligible,
    ).toBe(true);
    await service.setException(actor, v.id, input.date, {
      windows: [{ stage: 'intermunicipal', start: 1000, end: 1499 }],
      expectedVersion: 3,
    });
    expect((await service.evaluate(actor, input)).eligible).toBe(false);
  });
  it('holds the intermunicipal vehicle during the stay but permits later local reuse and different drivers', async () => {
    const v = await vehicle(),
      a = await driver(),
      b = await driver();
    const places = new LocationService(store, {
      validate: () => Promise.reject(new Error('unused')),
    });
    const group = await places.create(actor, 'group', {
      name: 'Distribuição B11',
      direction: 'dropoff',
    });
    groups.push(group.id);
    await service.setWeek(actor, v.id, {
      week: Array.from({ length: 7 }, () => [
        { stage: 'intermunicipal', start: 1000, end: 1500 },
        { stage: 'distribution', start: 1000, end: 1600 },
      ]),
      expectedVersion: 1,
    });
    const trip = {
      kind: 'intermunicipal',
      vehicleId: v.id,
      universityId: 'unimater',
      outbound: { driverId: a.id, start: 1000, end: 1100 },
      return: { driverId: b.id, start: 1400, end: 1500 },
    };
    const local = {
      kind: 'local',
      vehicleId: v.id,
      groupId: group.id,
      stage: 'distribution',
      driverId: b.id,
      start: 1500,
      end: 1550,
    };
    expect(
      await service.evaluate(actor, {
        date: '2026-10-25',
        trips: [trip, local],
      }),
    ).toEqual({ eligible: true, issues: [] });
    expect(
      (
        await service.evaluate(actor, {
          date: '2026-10-25',
          trips: [trip, { ...local, start: 1200, end: 1250 }],
        })
      ).issues,
    ).toContainEqual({ index: 1, code: 'VEHICLE_OVERLAP' });
    expect(
      (
        await service.evaluate(actor, {
          date: '2026-10-25',
          trips: [trip, { ...local, start: 1450, end: 1550 }],
        })
      ).issues,
    ).toContainEqual({ index: 1, code: 'DRIVER_OVERLAP' });
  });
  it('uses date availability without a week and rejects inactive or mismatched resources', async () => {
    const v = await vehicle(),
      d = await driver(),
      places = new LocationService(store, {
        validate: () => Promise.reject(new Error('unused')),
      });
    const group = await places.create(actor, 'group', {
      name: 'Coleta B11',
      direction: 'pickup',
    });
    groups.push(group.id);
    const trip = {
        kind: 'local',
        vehicleId: v.id,
        groupId: group.id,
        stage: 'collection',
        driverId: d.id,
        start: 100,
        end: 200,
      },
      input = { date: '2026-10-25', trips: [trip] };
    await service.setException(actor, v.id, input.date, {
      windows: [{ stage: 'collection', start: 100, end: 200 }],
      expectedVersion: 1,
    });
    expect((await service.evaluate(actor, input)).eligible).toBe(true);
    await service.updateDriver(actor, d.id, {
      name: d.name,
      phone: d.phone,
      active: false,
      expectedVersion: 1,
    });
    expect((await service.evaluate(actor, input)).issues).toContainEqual({
      index: 0,
      code: 'DRIVER_INACTIVE',
    });
    await service.updateVehicle(actor, v.id, {
      identifier: v.identifier,
      plate: v.plate,
      kind: v.kind,
      seats: v.seats,
      active: false,
      expectedVersion: 2,
    });
    expect((await service.evaluate(actor, input)).issues).toContainEqual({
      index: 0,
      code: 'VEHICLE_INACTIVE',
    });
    expect(
      (
        await service.evaluate(actor, {
          ...input,
          trips: [{ ...trip, stage: 'distribution' }],
        })
      ).issues,
    ).toContainEqual({ index: 0, code: 'GROUP_INVALID' });
    expect(
      (
        await service.evaluate(actor, {
          ...input,
          trips: [{ ...trip, vehicleId: randomUUID(), driverId: randomUUID() }],
        })
      ).issues,
    ).toContainEqual({ index: 0, code: 'VEHICLE_NOT_FOUND' });
  });
  it('serializes concurrent schedule changes without losing an exception', async () => {
    const v = await vehicle(),
      week = Array.from({ length: 7 }, () => []);
    const results = await Promise.allSettled([
      service.setWeek(actor, v.id, { week, expectedVersion: 1 }),
      second.setException(actor, v.id, '2026-10-25', {
        windows: [],
        expectedVersion: 1,
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find(
      (r) => r.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({ code: 'VERSION_CONFLICT' });
    expect((await service.availability(actor, v.id)).version).toBe(2);
  });
  it('rolls back exception and revision together after a persistence failure', async () => {
    const v = await vehicle();
    class BrokenStore extends RegistryStore {
      transaction<T>(
        work: (tx: RegistryTransaction) => Promise<T>,
      ): Promise<T> {
        return store.transaction((tx) =>
          work({
            ...tx,
            fleet: {
              ...tx.fleet,
              saveVehicle: async (value, insert) => {
                await tx.fleet.saveVehicle(value, insert);
                throw new Error('Synthetic failure');
              },
            },
          }),
        );
      }
    }
    const broken = new FleetService(new BrokenStore());
    await expect(
      broken.setException(actor, v.id, '2026-10-25', {
        windows: [],
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'REGISTRY_UNAVAILABLE' });
    expect(
      await second.exceptions(actor, v.id, {
        from: '2026-10-25',
        to: '2026-10-25',
      }),
    ).toEqual([]);
    expect((await second.availability(actor, v.id)).version).toBe(1);
    await second.setException(actor, v.id, '2026-10-25', {
      windows: [],
      expectedVersion: 1,
    });
    expect((await service.availability(actor, v.id)).version).toBe(2);
  });
});
