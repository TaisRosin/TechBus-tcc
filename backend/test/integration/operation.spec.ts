import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { RegistryService } from '../../src/registry/application/registry.service';
import { CalendarService } from '../../src/registry/application/calendar.service';
import { LocationService } from '../../src/registry/application/location.service';
import { JourneyService } from '../../src/journey/application/journey.service';
import { FleetService } from '../../src/fleet/application/fleet.service';
import { OperationService } from '../../src/operation/application/operation.service';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../src/registry/application/ports';
import { OperationPlanning1793500000000 } from '../../src/infrastructure/database/migrations/1793500000000-operation-planning';

describe('Operation planning on isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    other: PostgresRegistryStore,
    service: OperationService,
    second: OperationService,
    journeys: JourneyService,
    places: LocationService,
    fleet: FleetService;
  const actor = randomUUID(),
    provider = randomUUID(),
    students: string[] = [],
    catalog: string[] = [],
    vehicles: string[] = [],
    drivers: string[] = [],
    dates: string[] = [];
  let day = 0,
    date: string,
    instant: string,
    pickup: string,
    dropoff: string,
    point: string,
    ownsCalendar = false;
  const clock = { now: () => new Date(instant) };
  const answer = async (id: string, kind = 'going') => {
    const r = await journeys.receive(id, randomUUID());
    return journeys.apply(id, r.id, { kind });
  };
  const student = async (validPlaces = true) => {
    const { student: s } = await new RegistryService(store).createStudent(
      actor,
      {
        name: 'B12 sintético',
        phone: `+55469${randomInt(10000000, 99999999)}`,
        universityId: 'unimater',
        habitualDays: [],
        contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
      },
    );
    students.push(s.id);
    if (validPlaces) {
      await places.setDefault(actor, s.id, 'pickup', {
        pointId: point,
        source: 'initial',
        evidence: 'Teste sintético',
        expectedVersion: 0,
      });
      await places.setDefault(actor, s.id, 'dropoff', {
        address: 'Endereço sintético',
        source: 'initial',
        evidence: 'Teste sintético',
        expectedVersion: 0,
      });
    }
    return s.id;
  };
  const vehicle = async (seats = 44) => {
    const v = await fleet.createVehicle(actor, {
      identifier: randomUUID(),
      plate: randomUUID().replaceAll('-', '').slice(0, 12),
      kind: 'bus',
      seats,
    });
    vehicles.push(v.id);
    await fleet.setWeek(actor, v.id, {
      week: Array(7).fill(true),
      expectedVersion: 1,
    });
    return v.id;
  };
  const trips = async (seats = 44) => {
    const v = await vehicle(seats),
      d = await fleet.createDriver(actor, {
        name: 'B12 motorista',
        phone: '+5546999990000',
      });
    drivers.push(d.id);
    return [
      {
        kind: 'local',
        vehicleId: v,
        driverId: d.id,
        groupId: pickup,
        stage: 'collection',
        start: 1020,
        end: 1050,
      },
      {
        kind: 'intermunicipal',
        vehicleId: v,
        universityId: 'unimater',
        outbound: { driverId: d.id, start: 1050, end: 1110 },
        return: { driverId: d.id, start: 1320, end: 1380 },
      },
      {
        kind: 'local',
        vehicleId: v,
        driverId: d.id,
        groupId: dropoff,
        stage: 'distribution',
        start: 1380,
        end: 1410,
      },
    ];
  };
  const draft = async (values: unknown[]) => {
    const s = await service.current(actor);
    return service.saveDraft(actor, {
      expectedVersion: s.version,
      demandToken: s.demandToken,
      trips: values,
    });
  };
  const confirm = async () => {
    const s = await service.current(actor);
    return service.confirm(actor, {
      expectedVersion: s.version,
      demandToken: s.demandToken,
    });
  };
  const close = async () => {
    instant = `${date}T20:00:00Z`;
    await journeys.closeDay(date);
  };
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    const rows = await source.query<
      { days: number[] | null; version: number }[]
    >(
      "SELECT days,version FROM app.university_calendars WHERE university_id='unimater'",
    );
    if (rows[0].days !== null || rows[0].version !== 1)
      throw new Error('Existing calendar preserved');
    if (
      (
        await source.query<unknown[]>(
          "SELECT 1 FROM app.calendar_exceptions WHERE university_id='unimater'",
        )
      ).length
    )
      throw new Error('Existing calendar exceptions preserved');
    ownsCalendar = true;
    await source.query(
      "UPDATE app.university_calendars SET days=ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE university_id='unimater'",
    );
    await source.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'operator',true)",
      [actor],
    );
    store = new PostgresRegistryStore(readEnvironment(env).database);
    other = new PostgresRegistryStore(readEnvironment(env).database);
    service = new OperationService(store, clock);
    second = new OperationService(other, clock);
    journeys = new JourneyService(store, clock);
    fleet = new FleetService(store);
    const setup = new LocationService(store, {
      validate: () => Promise.reject(new Error('unused')),
    });
    pickup = (
      await setup.create(actor, 'group', {
        name: 'Coleta B12',
        direction: 'pickup',
      })
    ).id;
    catalog.push(pickup);
    dropoff = (
      await setup.create(actor, 'group', {
        name: 'Distribuição B12',
        direction: 'dropoff',
      })
    ).id;
    catalog.push(dropoff);
    point = (
      await setup.create(actor, 'point', {
        name: 'Ponto B12',
        address: 'Sintético',
        groupId: pickup,
      })
    ).id;
    catalog.push(point);
    const region = (
      await setup.create(actor, 'region', {
        name: 'Região B12',
        groupId: dropoff,
      })
    ).id;
    catalog.push(region);
    places = new LocationService(store, {
      validate: () =>
        Promise.resolve({
          status: 'inside',
          provider,
          key: 'fixture',
          label: 'Sintético',
          regionId: region,
          evidence: 'Porta simulada',
        }),
    });
  });
  beforeEach(async () => {
    date = `2026-11-${String(++day).padStart(2, '0')}`;
    const existing = await source.query<unknown[]>(
      'SELECT 1 FROM app.operation_plans WHERE date=$1',
      [date],
    );
    if (existing.length) throw new Error('Existing plan preserved');
    dates.push(date);
    instant = `${date}T19:00:00Z`;
  });
  afterAll(async () => {
    await store?.close();
    await other?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.operation_occupancies WHERE plan_date IN (SELECT date FROM app.operation_plans WHERE confirmed_by=$1) OR plan_date=ANY($2::date[])',
        [actor, dates],
      );
      await source.query(
        'DELETE FROM app.operation_manifests WHERE date IN (SELECT date FROM app.operation_plans WHERE confirmed_by=$1 OR date=ANY($2::date[]))',
        [actor, dates],
      );
      await source.query(
        'DELETE FROM app.operation_plans WHERE confirmed_by=$1 OR date=ANY($2::date[])',
        [actor, dates],
      );
      for (const table of [
        'journey_receipts',
        'daily_journeys',
        'student_place_defaults',
        'contracts',
      ])
        await source.query(
          `DELETE FROM app.${table} WHERE student_id=ANY($1::uuid[])`,
          [students],
        );
      await source.query('DELETE FROM app.students WHERE id=ANY($1::uuid[])', [
        students,
      ]);
      await source.query('DELETE FROM app.return_locations WHERE provider=$1', [
        provider,
      ]);
      for (const table of [
        'boarding_points',
        'service_regions',
        'local_groups',
      ])
        await source.query(
          `DELETE FROM app.${table} WHERE id=ANY($1::uuid[])`,
          [catalog],
        );
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
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      if (ownsCalendar)
        await source.query(
          "DELETE FROM app.calendar_exceptions WHERE university_id='unimater' AND date=ANY($1::date[])",
          [dates],
        );
      if (ownsCalendar)
        await source.query(
          "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unimater'",
        );
      await source.destroy();
    }
  });
  it('counts confirmed legs even without places and recommends all smallest available options', async () => {
    const a = await student(),
      b = await student(false);
    await answer(a);
    await answer(b, 'only_dropoff');
    const v = await vehicle(2),
      equivalent = await vehicle(2),
      larger = await vehicle(4);
    const current = await service.current(actor);
    expect(current.universities).toContainEqual({
      universityId: 'unimater',
      pickup: 1,
      dropoff: 2,
      required: 2,
    });
    expect(current.issues).toContainEqual({
      studentId: b,
      code: 'DROPOFF_LOCATION_INVALID',
    });
    const options = await service.options(actor, {
      universityId: 'unimater',
      start: 1050,
      end: 1400,
    });
    expect(options.recommended.map((x) => x.id).sort()).toEqual(
      [v, equivalent].sort(),
    );
    expect(options.available.map((x) => x.id)).toContain(larger);
    expect(options.demandToken).toBe(current.demandToken);
    await fleet.setException(actor, v, date, {
      available: false,
      expectedVersion: 2,
    });
    expect(
      (
        await service.options(actor, {
          universityId: 'unimater',
          start: 1050,
          end: 1400,
        })
      ).recommended.map((x) => x.id),
    ).toEqual([equivalent]);
    expect(
      (
        await service.options(actor, {
          universityId: 'unidep',
          start: 1050,
          end: 1400,
        })
      ).issue,
    ).toBe('NO_DEMAND');
  });
  it('persists incomplete drafts without reservations and rejects concurrent/stale revisions and demand', async () => {
    const id = await student();
    await answer(id);
    const snapshot = await service.current(actor),
      input = {
        expectedVersion: 0,
        demandToken: snapshot.demandToken,
        trips: [],
      };
    const results = await Promise.allSettled([
      service.saveDraft(actor, input),
      second.saveDraft(actor, input),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (results.find((r) => r.status === 'rejected') as PromiseRejectedResult)
        .reason,
    ).toMatchObject({ code: 'VERSION_CONFLICT' });
    expect((await second.current(actor)).plan).toMatchObject({
      version: 1,
      draft: [],
      confirmedVersion: null,
    });
    expect(
      await source.query(
        'SELECT count(*)::int AS n FROM app.operation_occupancies WHERE plan_date=$1',
        [date],
      ),
    ).toEqual([{ n: 0 }]);
    await answer(id, 'only_pickup');
    await expect(
      service.saveDraft(actor, { ...input, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: 'DEMAND_CHANGED' });
  });
  it('confirms only after closing with all demand covered, accepts larger manual selection and is idempotent', async () => {
    const id = await student();
    await answer(id);
    const values = await trips(50);
    await draft(values);
    await expect(confirm()).rejects.toMatchObject({ code: 'CLOSURE_NOT_DUE' });
    instant = `${date}T20:00:00Z`;
    await expect(confirm()).rejects.toMatchObject({
      code: 'PLANNING_REQUIRES_ADJUSTMENT',
    });
    await close();
    await draft([]);
    await expect(confirm()).rejects.toMatchObject({
      code: 'PLANNING_REQUIRES_ADJUSTMENT',
    });
    await draft(values);
    const s = await service.current(actor),
      input = { expectedVersion: s.version, demandToken: s.demandToken };
    const results = await Promise.all([
      service.confirm(actor, input),
      second.confirm(actor, input),
    ]);
    expect(results[0]).toMatchObject({
      status: 'confirmed',
      plan: { confirmedVersion: 3 },
    });
    expect(results[1]).toEqual(results[0]);
    expect(
      await source.query(
        'SELECT count(*)::int AS n FROM app.operation_occupancies WHERE plan_date=$1 AND active',
        [date],
      ),
    ).toEqual([{ n: 7 }]);
    expect((await second.current(actor)).status).toBe('confirmed');
    expect(
      (
        await service.options(actor, {
          universityId: 'unimater',
          start: 1040,
          end: 1400,
        })
      ).available.map((v) => v.id),
    ).toContain(values[0].vehicleId);
  });
  it('blocks invalid places, unresolved interpretation, insufficient capacity and overlapping trips', async () => {
    const id = await student(false);
    await answer(id);
    await close();
    const values = await trips(1);
    await draft(values);
    await expect(confirm()).rejects.toMatchObject({
      code: 'PLANNING_REQUIRES_ADJUSTMENT',
    });
    instant = `${date}T19:00:00Z`;
    const missing = await journeys.receive(id, randomUUID());
    await journeys.apply(id, missing.id, {
      kind: 'places',
      pointId: point,
      locationId: (await places.resolveReturn(actor, { address: 'Sintético' }))
        .location.id,
    });
    const b = await student();
    await answer(b);
    await close();
    await draft(values);
    await expect(confirm()).rejects.toMatchObject({
      code: 'PLANNING_REQUIRES_ADJUSTMENT',
    });
    const valid = await trips(4);
    await draft([...valid, valid[1]]);
    await expect(confirm()).rejects.toMatchObject({
      code: 'PLANNING_REQUIRES_ADJUSTMENT',
    });
    await draft(valid);
    await journeys.receiveUnordered(id, randomUUID());
    expect((await service.current(actor)).issues).toContainEqual({
      studentId: id,
      code: 'COMMAND_PENDING',
    });
    await expect(confirm()).rejects.toMatchObject({ code: 'DEMAND_CHANGED' });
    await draft(valid);
    await expect(confirm()).rejects.toMatchObject({
      code: 'PLANNING_REQUIRES_ADJUSTMENT',
    });
  });
  it('preserves confirmed choices and occupancies on failed replacement and cancellation', async () => {
    const id = await student();
    await answer(id);
    await close();
    const values = await trips();
    await draft(values);
    await confirm();
    const occupied = await source.query<{ id: string }[]>(
      'SELECT id FROM app.operation_occupancies WHERE plan_date=$1 AND active ORDER BY id',
      [date],
    );
    const next = await trips();
    await draft(next);
    class BrokenStore extends RegistryStore {
      transaction<T>(
        work: (tx: RegistryTransaction) => Promise<T>,
      ): Promise<T> {
        return store.transaction((tx) =>
          work({
            ...tx,
            operations: {
              ...tx.operations,
              replaceOccupancies: async (d, v, rows) => {
                await tx.operations.replaceOccupancies(d, v, rows);
                throw new Error('Synthetic failure');
              },
            },
          }),
        );
      }
    }
    const snapshot = await service.current(actor);
    await expect(
      new OperationService(new BrokenStore(), clock).confirm(actor, {
        expectedVersion: snapshot.version,
        demandToken: snapshot.demandToken,
      }),
    ).rejects.toMatchObject({ code: 'REGISTRY_UNAVAILABLE' });
    const preserved = (await second.current(actor)).plan;
    expect(preserved).toMatchObject({
      confirmedVersion: 1,
      version: 2,
    });
    expect(preserved?.confirmedTrips?.map((t) => t.vehicleId)).toEqual(
      values.map((t) => t.vehicleId),
    );
    expect(
      await source.query(
        'SELECT id FROM app.operation_occupancies WHERE plan_date=$1 AND active ORDER BY id',
        [date],
      ),
    ).toEqual(occupied);
    instant = `${date}T21:00:00Z`;
    await answer(id, 'cancel_return');
    const cancelled = await service.current(actor);
    expect(cancelled.status).toBe('needs_adjustment');
    expect(cancelled.plan?.needsAdjustment).toBe(true);
    expect(cancelled.universities[0]).toMatchObject({
      pickup: 1,
      dropoff: 0,
      required: 1,
    });
    await expect(confirm()).rejects.toMatchObject({ code: 'DEMAND_CHANGED' });
    expect(
      await source.query(
        'SELECT id FROM app.operation_occupancies WHERE plan_date=$1 AND active ORDER BY id',
        [date],
      ),
    ).toEqual(occupied);
    const runner = source.createQueryRunner();
    await runner.connect();
    try {
      await expect(
        new OperationPlanning1793500000000().down(runner),
      ).rejects.toThrow('B12_DATA_REQUIRES_PRESERVATION');
    } finally {
      await runner.release();
    }
  });
  it('revalidates fleet and calendar after a draft and marks an existing confirmation for adjustment', async () => {
    const id = await student();
    await answer(id);
    await close();
    const values = await trips();
    await draft(values);
    await confirm();
    const vehicleId = values[0].vehicleId;
    await fleet.setException(actor, vehicleId, date, {
      available: false,
      expectedVersion: 2,
    });
    expect((await service.current(actor)).status).toBe('needs_adjustment');
    await expect(confirm()).rejects.toMatchObject({
      code: 'PLANNING_REQUIRES_ADJUSTMENT',
    });
    await fleet.setException(actor, vehicleId, date, {
      available: null,
      expectedVersion: 3,
    });
    const d = values[0].driverId!;
    await fleet.updateDriver(actor, d, {
      name: 'B12 motorista',
      phone: '+5546999990000',
      active: false,
      expectedVersion: 1,
    });
    await expect(confirm()).rejects.toMatchObject({
      code: 'PLANNING_REQUIRES_ADJUSTMENT',
    });
    await fleet.updateDriver(actor, d, {
      name: 'B12 motorista',
      phone: '+5546999990000',
      active: true,
      expectedVersion: 2,
    });
    await new CalendarService(store).exception(actor, 'unimater', date, {
      operates: false,
      reason: 'Teste B12',
      expectedVersion: 1,
    });
    expect((await service.current(actor)).issues).toContainEqual({
      studentId: id,
      code: 'NO_OPERATION',
    });
    await expect(confirm()).rejects.toMatchObject({ code: 'DEMAND_CHANGED' });
    await draft(values);
    await expect(confirm()).rejects.toMatchObject({
      code: 'PLANNING_REQUIRES_ADJUSTMENT',
    });
  });
  it('allocates independently on adjacent days without clock conflicts', async () => {
    const firstDate = date,
      id = await student();
    await answer(id);
    await close();
    const values = await trips();
    // The new public payload has no operational clock fields.
    const daily = values.map((t) =>
      t.kind === 'local'
        ? {
            kind: t.kind,
            vehicleId: t.vehicleId,
            driverId: t.driverId,
            groupId: t.groupId,
            stage: t.stage,
          }
        : {
            kind: t.kind,
            vehicleId: t.vehicleId,
            universityId: t.universityId,
            outbound: { driverId: t.outbound!.driverId },
            return: { driverId: t.return!.driverId },
          },
    );
    await draft(daily);
    const firstSnapshot = await service.current(actor);
    const firstService = new OperationService(store, {
      now: () => new Date(`${firstDate}T20:00:00Z`),
    });
    date = `2026-11-${String(++day).padStart(2, '0')}`;
    dates.push(date);
    instant = `${date}T19:00:00Z`;
    await answer(id);
    await close();
    await draft(daily);
    const snapshot = await service.current(actor);
    const results = await Promise.allSettled([
      firstService.confirm(actor, {
        expectedVersion: firstSnapshot.version,
        demandToken: firstSnapshot.demandToken,
      }),
      second.confirm(actor, {
        expectedVersion: snapshot.version,
        demandToken: snapshot.demandToken,
      }),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
    expect((await service.current(actor)).status).toBe('confirmed');
    expect((await firstService.current(actor)).status).toBe('confirmed');
    expect(
      (
        await service.options(actor, { universityId: 'unimater' })
      ).available.map((v) => v.id),
    ).toContain(values[0].vehicleId);
    expect(
      (await service.options(actor, { universityId: 'unidep' })).available.map(
        (v) => v.id,
      ),
    ).not.toContain(values[0].vehicleId);
  });
});
