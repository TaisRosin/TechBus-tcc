import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { ConsultationService } from '../../src/operation/application/consultation.service';
import { FleetService } from '../../src/fleet/application/fleet.service';
import { OperationService } from '../../src/operation/application/operation.service';
import { RegistryService } from '../../src/registry/application/registry.service';
import { JourneyService } from '../../src/journey/application/journey.service';
import { LocationService } from '../../src/registry/application/location.service';
import { CorrectionService } from '../../src/journey/application/correction.service';
describe('Operational consultations on isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    service: ConsultationService,
    fleet: FleetService;
  const admin = randomUUID(),
    operator = randomUUID(),
    driverUser = randomUUID(),
    otherUser = randomUUID(),
    users = [admin, operator, driverUser, otherUser],
    drivers: string[] = [];
  let instant = '2026-11-20T18:00:00-03:00';
  const clock = { now: () => new Date(instant) };
  const students: string[] = [];
  let ownsCalendar = false;
  const catalog: string[] = [],
    vehicles: string[] = [],
    dates: string[] = [],
    provider = randomUUID();
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    for (let i = 0; i < users.length; i++)
      await source.query(
        'INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,$2,true)',
        [users[i], ['admin', 'operator', 'driver', 'driver'][i]],
      );
    store = new PostgresRegistryStore(readEnvironment(env).database);
    fleet = new FleetService(store);
    service = new ConsultationService(
      store,
      clock,
      new OperationService(store, clock),
    );
    const calendar = await source.query<
      { days: number[] | null; version: number }[]
    >(
      "SELECT days,version FROM app.university_calendars WHERE university_id='unimater'",
    );
    if (calendar[0].days !== null || calendar[0].version !== 1)
      throw new Error('Existing calendar preserved');
    ownsCalendar = true;
    await source.query(
      "UPDATE app.university_calendars SET days=ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE university_id='unimater'",
    );
  });
  afterAll(async () => {
    await store?.close();
    if (source?.isInitialized) {
      for (const table of [
        'operation_manifests',
        'operation_occupancies',
        'operation_plans',
      ])
        await source.query(
          `DELETE FROM app.${table} WHERE ${table === 'operation_occupancies' ? 'plan_date' : 'date'}=ANY($1::date[])`,
          [dates],
        );
      await source.query(
        'DELETE FROM app.student_place_defaults WHERE student_id=ANY($1::uuid[])',
        [students],
      );
      for (const table of [
        'team_corrections',
        'daily_journeys',
        'journey_receipts',
        'contracts',
      ])
        await source.query(
          `DELETE FROM app.${table} WHERE student_id=ANY($1::uuid[])`,
          [students],
        );
      await source.query('DELETE FROM app.students WHERE id=ANY($1::uuid[])', [
        students,
      ]);
      await source.query(
        'DELETE FROM app.driver_access_links WHERE user_id=ANY($1::uuid[])',
        [users],
      );
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
        'DELETE FROM app.fleet_vehicles WHERE id=ANY($1::uuid[])',
        [vehicles],
      );
      await source.query(
        'DELETE FROM app.fleet_drivers WHERE id=ANY($1::uuid[])',
        [drivers],
      );
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [users],
      );
      if (ownsCalendar)
        await source.query(
          "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unimater'",
        );
      await source.destroy();
    }
  });
  it('consolidates current responses, counts missing places and never changes a journey on read', async () => {
    instant = '2026-11-20T16:00:00-03:00';
    for (let i = 0; i < 2; i++) {
      const { student: s } = await new RegistryService(store).createStudent(
        admin,
        {
          name: 'B15 aluno',
          phone: `+55469${randomInt(10000000, 99999999)}`,
          universityId: 'unimater',
          habitualDays: [0, 1, 2, 3, 4, 5, 6],
          contract: { startDate: '2026-01-01', endDate: '2026-12-31' },
        },
      );
      students.push(s.id);
    }
    const journeys = new JourneyService(store, clock),
      r = await journeys.receive(students[0], randomUUID());
    await journeys.apply(students[0], r.id, { kind: 'going' });
    const before = await store.transaction((tx) =>
      tx.journeys.get(students[0], '2026-11-20'),
    );
    const view = await service.overview(operator, {});
    expect(view.total).toBe(2);
    expect(view.counts.pickup.confirmado).toBe(1);
    expect(view.counts.pickup.sem_resposta).toBe(1);
    expect(
      view.students.find((s) => s.studentId === students[0])?.issues,
    ).toContain('PICKUP_LOCATION_INVALID');
    expect(
      await store.transaction((tx) =>
        tx.journeys.get(students[0], '2026-11-20'),
      ),
    ).toEqual(before);
    await expect(service.overview(driverUser, {})).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      service.overview(admin, { date: '2026-11-19' }),
    ).rejects.toMatchObject({ code: 'OPERATION_NOT_AVAILABLE' });
  });
  it('only admin links identities, concurrent claims are exclusive and revocation is versioned', async () => {
    const d = await fleet.createDriver(admin, {
      name: 'B15 sintético',
      phone: `+55469${randomInt(10000000, 99999999)}`,
    });
    drivers.push(d.id);
    await expect(
      service.link(operator, driverUser, {
        driverId: d.id,
        expectedVersion: 0,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const results = await Promise.allSettled([
      service.link(admin, driverUser, { driverId: d.id, expectedVersion: 0 }),
      service.link(admin, otherUser, { driverId: d.id, expectedVersion: 0 }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const first = await service.getLink(admin, driverUser),
      owner = first.driverId ? driverUser : otherUser;
    const linked = await service.getLink(admin, owner);
    expect(linked.driverId).toBe(d.id);
    await expect(
      service.link(admin, owner, { driverId: null, expectedVersion: 0 }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(
      await service.link(admin, owner, {
        driverId: null,
        expectedVersion: linked.version,
      }),
    ).toMatchObject({ driverId: null, version: 2 });
    await expect(service.trips(owner)).rejects.toMatchObject({
      code: 'DRIVER_ACCESS_REQUIRED',
    });
  });
  it('publishes confirmed assignments by direction, removes cancelled passengers and keeps the previous night only while active', async () => {
    const date = '2026-11-21';
    if (
      (
        await source.query<unknown[]>(
          'SELECT 1 FROM app.operation_plans WHERE date=$1',
          [date],
        )
      ).length
    )
      throw new Error('Existing plan preserved');
    dates.push(date);
    instant = `${date}T16:00:00-03:00`;
    const places = new LocationService(store, {
      validate: () => Promise.reject(new Error('unused')),
    });
    const pickup = await places.create(admin, 'group', {
        name: 'B15 coleta',
        direction: 'pickup',
      }),
      dropoff = await places.create(admin, 'group', {
        name: 'B15 distribuição',
        direction: 'dropoff',
      });
    catalog.push(pickup.id, dropoff.id);
    const point = await places.create(admin, 'point', {
        name: 'B15 ponto',
        address: 'Sintético',
        groupId: pickup.id,
      }),
      region = await places.create(admin, 'region', {
        name: 'B15 região',
        groupId: dropoff.id,
      });
    catalog.push(point.id, region.id);
    const validated = new LocationService(store, {
      validate: () =>
        Promise.resolve({
          status: 'inside',
          provider,
          key: 'b15',
          label: 'B15 endereço',
          regionId: region.id,
          evidence: 'Simulado',
        }),
    });
    const { student: s } = await new RegistryService(store).createStudent(
      admin,
      {
        name: 'B15 passageiro',
        phone: `+55469${randomInt(10000000, 99999999)}`,
        universityId: 'unimater',
        habitualDays: [],
        contract: { startDate: '2026-01-01', endDate: '2026-12-31' },
      },
    );
    students.push(s.id);
    await places.setDefault(admin, s.id, 'pickup', {
      pointId: point.id,
      source: 'initial',
      evidence: 'Teste',
      expectedVersion: 0,
    });
    await validated.setDefault(admin, s.id, 'dropoff', {
      address: 'Sintético',
      source: 'initial',
      evidence: 'Teste',
      expectedVersion: 0,
    });
    const journeys = new JourneyService(store, clock),
      receipt = await journeys.receive(s.id, randomUUID());
    await journeys.apply(s.id, receipt.id, { kind: 'going' });
    const d = await fleet.createDriver(admin, {
        name: 'B15 ida',
        phone: '+5546999991111',
      }),
      back = await fleet.createDriver(admin, {
        name: 'B15 volta',
        phone: '+5546999992222',
      });
    drivers.push(d.id, back.id);
    for (const user of [driverUser, otherUser]) {
      const link = await service.getLink(admin, user);
      await service.link(admin, user, {
        driverId: null,
        expectedVersion: link.version,
      });
    }
    await service.link(admin, driverUser, {
      driverId: d.id,
      expectedVersion: (await service.getLink(admin, driverUser)).version,
    });
    await service.link(admin, otherUser, {
      driverId: back.id,
      expectedVersion: (await service.getLink(admin, otherUser)).version,
    });
    const v = await fleet.createVehicle(admin, {
      identifier: randomUUID(),
      plate: 'B15' + randomInt(1000, 9999),
      kind: 'bus',
      seats: 40,
    });
    vehicles.push(v.id);
    await fleet.setWeek(admin, v.id, {
      expectedVersion: 1,
      week: Array(7).fill(true),
    });
    const operations = new OperationService(store, clock);
    const trips = [
      {
        kind: 'local',
        vehicleId: v.id,
        driverId: d.id,
        groupId: pickup.id,
        stage: 'collection',
        start: 1020,
        end: 1050,
      },
      {
        kind: 'intermunicipal',
        vehicleId: v.id,
        universityId: 'unimater',
        outbound: { driverId: d.id, start: 1050, end: 1110 },
        return: { driverId: back.id, start: 1380, end: 1440 },
      },
      {
        kind: 'local',
        vehicleId: v.id,
        driverId: back.id,
        groupId: dropoff.id,
        stage: 'distribution',
        start: 1440,
        end: 1470,
      },
    ];
    const before = await operations.current(admin);
    await operations.saveDraft(admin, {
      expectedVersion: before.version,
      demandToken: before.demandToken,
      trips,
    });
    expect(await service.trips(driverUser)).toEqual([]);
    instant = `${date}T17:00:00-03:00`;
    await journeys.closeDay(date);
    const closed = await operations.current(admin);
    await operations.saveDraft(admin, {
      expectedVersion: closed.version,
      demandToken: closed.demandToken,
      trips,
    });
    const ready = await operations.current(admin);
    await operations.confirm(admin, {
      expectedVersion: ready.version,
      demandToken: ready.demandToken,
    });
    const assigned = await service.trips(driverUser),
      returns = await service.trips(otherUser);
    expect(assigned).toHaveLength(2);
    expect(returns).toHaveLength(2);
    const outbound = assigned.find((t) => t.stage === 'intermunicipal')!;
    expect(outbound.side).toBe('pickup');
    expect(returns.find((t) => t.stage === 'intermunicipal')?.side).toBe(
      'dropoff',
    );
    expect(
      (await service.trip(driverUser, outbound.id)).students.map(
        (p) => p.studentId,
      ),
    ).toEqual([s.id]);
    await expect(service.trip(otherUser, outbound.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await source.query('DELETE FROM app.operation_manifests WHERE date=$1', [
      date,
    ]);
    expect(await service.trip(driverUser, outbound.id)).toMatchObject({
      students: [],
      needsAdjustment: true,
    });
    await operations.confirm(admin, {
      expectedVersion: ready.version,
      demandToken: ready.demandToken,
    });
    expect((await service.trip(driverUser, outbound.id)).students).toHaveLength(
      1,
    );
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      driverUser,
    ]);
    await expect(service.trips(driverUser)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await source.query('UPDATE app.team_users SET active=true WHERE id=$1', [
      driverUser,
    ]);
    await source.query(
      "UPDATE app.team_users SET role='operator' WHERE id=$1",
      [driverUser],
    );
    await expect(service.trips(driverUser)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await source.query("UPDATE app.team_users SET role='driver' WHERE id=$1", [
      driverUser,
    ]);
    await source.query(
      'UPDATE app.fleet_drivers SET active=false WHERE id=$1',
      [d.id],
    );
    await expect(service.trips(driverUser)).rejects.toMatchObject({
      code: 'DRIVER_ACCESS_REQUIRED',
    });
    await source.query('UPDATE app.fleet_drivers SET active=true WHERE id=$1', [
      d.id,
    ]);
    // B17: invalid local pickup does not make the university assignment ambiguous.
    await places.update(admin, 'point', point.id, {
      name: point.name,
      address: point.address,
      groupId: pickup.id,
      active: false,
      expectedVersion: point.version,
    });
    expect(await service.trip(driverUser, outbound.id)).toMatchObject({
      needsAdjustment: true,
      students: [{ studentId: s.id, place: null }],
    });
    expect(
      (
        await service.trip(
          driverUser,
          assigned.find((t) => t.stage === 'collection')!.id,
        )
      ).students,
    ).toEqual([]);
    await places.update(admin, 'point', point.id, {
      name: point.name,
      address: point.address,
      groupId: pickup.id,
      active: true,
      expectedVersion: point.version + 1,
    });
    instant = `${date}T21:00:00-03:00`;
    const cancel = await journeys.receive(s.id, randomUUID());
    await journeys.apply(s.id, cancel.id, { kind: 'cancel_return' });
    expect((await service.trip(otherUser, returns[0].id)).students).toEqual([]);
    expect((await service.trip(driverUser, outbound.id)).needsAdjustment).toBe(
      true,
    );
    expect((await service.trip(driverUser, outbound.id)).students).toHaveLength(
      1,
    );
    const newGroup = await places.create(admin, 'group', {
      name: 'B15 outro grupo',
      direction: 'pickup',
    });
    catalog.push(newGroup.id);
    const newPoint = await places.create(admin, 'point', {
      name: 'B15 outro ponto',
      address: 'Sintético',
      groupId: newGroup.id,
    });
    catalog.push(newPoint.id);
    const corrections = new CorrectionService(store, clock),
      context = await corrections.current(admin, s.id);
    await corrections.correct(admin, s.id, {
      operationId: randomUUID(),
      expectedVersion: context.version,
      reason: 'Novo ponto conferido',
      reviewedReceiptIds: [],
      changes: { pointId: newPoint.id },
    });
    expect(
      (
        await service.trip(
          driverUser,
          assigned.find((t) => t.stage === 'collection')!.id,
        )
      ).students,
    ).toEqual([]);
    expect((await service.trip(driverUser, outbound.id)).students).toHaveLength(
      1,
    );
    instant = '2026-11-22T00:29:59-03:00';
    await expect(service.overview(admin, { date })).rejects.toMatchObject({
      code: 'OPERATION_NOT_AVAILABLE',
    });
    expect(await service.trips(otherUser)).toEqual([]);
    instant = '2026-11-22T00:30:00-03:00';
    expect(await service.trips(otherUser)).toEqual([]);
    await expect(service.overview(admin, { date })).rejects.toMatchObject({
      code: 'OPERATION_NOT_AVAILABLE',
    });
  });
});
