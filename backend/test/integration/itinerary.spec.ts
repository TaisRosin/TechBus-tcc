import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { LocationService } from '../../src/registry/application/location.service';
import { ItineraryService } from '../../src/itinerary/application/itinerary.service';
import { OperationService } from '../../src/operation/application/operation.service';
import { ConsultationService } from '../../src/operation/application/consultation.service';
import { RegistryService } from '../../src/registry/application/registry.service';
import { JourneyService } from '../../src/journey/application/journey.service';
import { FleetService } from '../../src/fleet/application/fleet.service';
describe('Itinerary operation on isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    service: ItineraryService,
    places: LocationService;
  const admin = randomUUID(),
    operator = randomUUID(),
    driver = randomUUID(),
    groups: string[] = [],
    points: string[] = [];
  let instant = '2026-11-23T16:00:00-03:00',
    ownsCalendar = false,
    ownsPlan = false;
  const date = '2026-11-23',
    provider = randomUUID(),
    students: string[] = [],
    regions: string[] = [],
    fixedPoints: string[] = [],
    vehicles: string[] = [],
    drivers: string[] = [];
  const clock = { now: () => new Date(instant) };
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    for (const [id, role] of [
      [admin, 'admin'],
      [operator, 'operator'],
      [driver, 'driver'],
    ])
      await source.query(
        'INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,$2,true)',
        [id, role],
      );
    store = new PostgresRegistryStore(readEnvironment(env).database);
    const operations = new OperationService(store, clock);
    service = new ItineraryService(
      store,
      clock,
      operations,
      new ConsultationService(store, clock, operations),
    );
    places = new LocationService(store, {
      validate: () => Promise.reject(new Error('unused')),
    });
    for (let i = 0; i < 2; i++)
      groups.push(
        (
          await places.create(admin, 'group', {
            name: 'B16 coleta',
            direction: 'pickup',
          })
        ).id,
      );
    for (let i = 0; i < 3; i++)
      points.push(
        (
          await places.create(admin, 'point', {
            name: 'B16 ponto',
            address: 'Sintético',
            stopReference: 'Embarque pelo portão lateral',
            groupId: groups[i === 2 ? 1 : 0],
          })
        ).id,
      );
  });
  afterAll(async () => {
    await store?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.published_itineraries WHERE group_id=ANY($1::uuid[])',
        [groups],
      );
      if (ownsPlan)
        for (const table of [
          'operation_manifests',
          'operation_occupancies',
          'operation_plans',
        ])
          await source.query(
            `DELETE FROM app.${table} WHERE ${table === 'operation_occupancies' ? 'plan_date' : 'date'}=$1`,
            [date],
          );
      for (const table of [
        'student_place_defaults',
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
        'DELETE FROM app.driver_access_links WHERE user_id=$1',
        [driver],
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
        'DELETE FROM app.group_stop_orders WHERE group_id=ANY($1::uuid[])',
        [groups],
      );
      await source.query(
        'DELETE FROM app.return_locations WHERE provider=$1 OR id=ANY($2::uuid[])',
        [provider, fixedPoints],
      );
      await source.query(
        'DELETE FROM app.service_regions WHERE id=ANY($1::uuid[])',
        [regions],
      );
      await source.query(
        'DELETE FROM app.boarding_points WHERE id=ANY($1::uuid[])',
        [points],
      );
      await source.query(
        'DELETE FROM app.local_groups WHERE id=ANY($1::uuid[])',
        [groups],
      );
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [[admin, operator, driver]],
      );
      if (ownsCalendar)
        await source.query(
          "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unimater'",
        );
      await source.destroy();
    }
  });
  it('lets staff order only active stops in the group, with exclusive concurrent edits', async () => {
    expect(await service.order(operator, groups[0])).toMatchObject({
      version: 0,
      stopIds: [],
    });
    await expect(
      service.setOrder(driver, groups[0], {
        expectedVersion: 0,
        stopIds: [points[0]],
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      service.setOrder(admin, groups[0], {
        expectedVersion: 0,
        stopIds: [points[2]],
      }),
    ).rejects.toMatchObject({ code: 'STOP_NOT_IN_GROUP' });
    const edits = await Promise.allSettled([
      service.setOrder(admin, groups[0], {
        expectedVersion: 0,
        stopIds: [points[0], points[1]],
      }),
      service.setOrder(operator, groups[0], {
        expectedVersion: 0,
        stopIds: [points[1], points[0]],
      }),
    ]);
    expect(edits.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await service.order(admin, groups[0])).toMatchObject({ version: 1 });
  });
  it('blocks incomplete or stale publication and retains the published sequence until explicit replacement', async () => {
    const existing = await source.query<unknown[]>(
      'SELECT 1 FROM app.operation_plans WHERE date=$1',
      [date],
    );
    if (existing.length) throw new Error('Existing plan preserved');
    ownsPlan = true;
    const calendars = await source.query<
      { days: number[] | null; version: number }[]
    >(
      "SELECT days,version FROM app.university_calendars WHERE university_id='unimater'",
    );
    if (calendars[0].days !== null || calendars[0].version !== 1)
      throw new Error('Existing calendar preserved');
    ownsCalendar = true;
    await source.query(
      "UPDATE app.university_calendars SET days=ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE university_id='unimater'",
    );
    const group = (
      await places.create(admin, 'group', {
        name: 'B16 volta',
        direction: 'dropoff',
      })
    ).id;
    groups.push(group);
    const region = (
      await places.create(admin, 'region', {
        name: 'B16 região',
        groupId: group,
      })
    ).id;
    regions.push(region);
    const journeys = new JourneyService(store, clock),
      registry = new RegistryService(store),
      stops: string[] = [];
    for (let i = 0; i < 2; i++) {
      const { student } = await registry.createStudent(admin, {
        name: 'B16 aluno',
        phone: `+55469${randomInt(10000000, 99999999)}`,
        universityId: 'unimater',
        habitualDays: [],
        contract: { startDate: '2026-01-01', endDate: '2026-12-31' },
      });
      students.push(student.id);
      const fixed = await places.create(admin, 'dropoff', {
        name: `B16 ponto ${i}`,
        address: `B16 endereço ${i}`,
        stopReference: 'Embarque pelo portão lateral',
        groupId: group,
      });
      fixedPoints.push(fixed.id);
      const value = await places.setDefault(admin, student.id, 'dropoff', {
        locationId: fixed.id,
        source: 'initial',
        evidence: 'Teste',
        expectedVersion: 0,
      });
      stops.push(value.locationId!);
      const receipt = await journeys.receive(student.id, randomUUID());
      await journeys.apply(student.id, receipt.id, { kind: 'only_dropoff' });
    }
    const fleet = new FleetService(store),
      d = await fleet.createDriver(admin, {
        name: 'B16 motorista',
        phone: '+5546999912345',
      });
    drivers.push(d.id);
    const vehicle = await fleet.createVehicle(admin, {
      identifier: randomUUID(),
      plate: 'B16' + randomInt(1000, 9999),
      kind: 'bus',
      seats: 40,
    });
    vehicles.push(vehicle.id);
    await fleet.setWeek(admin, vehicle.id, {
      expectedVersion: 1,
      week: Array(7).fill(true),
    });
    const operations = new OperationService(store, clock),
      consultations = new ConsultationService(store, clock, operations);
    await consultations.link(admin, driver, {
      driverId: d.id,
      expectedVersion: 0,
    });
    const trips = [
      {
        kind: 'intermunicipal',
        vehicleId: vehicle.id,
        universityId: 'unimater',
        outbound: { driverId: d.id, start: 1050, end: 1110 },
        return: { driverId: d.id, start: 1380, end: 1440 },
      },
      {
        kind: 'local',
        vehicleId: vehicle.id,
        driverId: d.id,
        groupId: group,
        stage: 'distribution',
        start: 1440,
        end: 1470,
      },
    ];
    instant = `${date}T17:00:00-03:00`;
    await journeys.closeDay(date);
    const before = await operations.current(admin);
    await operations.saveDraft(admin, {
      expectedVersion: before.version,
      demandToken: before.demandToken,
      trips,
    });
    const ready = await operations.current(admin);
    await operations.confirm(admin, {
      expectedVersion: ready.version,
      demandToken: ready.demandToken,
    });
    await service.setOrder(admin, group, {
      expectedVersion: 0,
      stopIds: [stops[0]],
    });
    const incomplete = await service.preview(admin, group, { date });
    expect(incomplete.candidate.pending.map((p) => p.id)).toEqual([stops[1]]);
    await expect(
      service.publish(admin, group, {
        date,
        expectedVersion: 0,
        previewToken: incomplete.previewToken,
      }),
    ).rejects.toMatchObject({ code: 'ITINERARY_INCOMPLETE' });
    await service.setOrder(admin, group, {
      expectedVersion: 1,
      stopIds: stops,
    });
    await expect(
      service.publish(admin, group, {
        date,
        expectedVersion: 0,
        previewToken: incomplete.previewToken,
      }),
    ).rejects.toMatchObject({ code: 'PREVIEW_CHANGED' });
    const complete = await service.preview(admin, group, { date });
    const assigned = (await consultations.trips(driver)).find(
      (t) => t.stage === 'distribution',
    )!;
    expect(await service.driverItinerary(driver, assigned.id)).toMatchObject({
      status: 'unpublished',
      ordered: [],
    });
    expect(
      (
        await service.publish(admin, group, {
          date,
          expectedVersion: 0,
          previewToken: complete.previewToken,
        })
      ).version,
    ).toBe(1);
    expect(
      (await service.driverItinerary(driver, assigned.id)).ordered.map(
        (s) => s.id,
      ),
    ).toEqual(stops);
    expect(
      (await service.driverItinerary(driver, assigned.id)).ordered[0]
        .stopReference,
    ).toBe('Embarque pelo portão lateral');
    await expect(
      service.driverItinerary(operator, assigned.id),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      service.driverItinerary(driver, `${date}:9999:0:0`),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await service.setOrder(operator, group, {
      expectedVersion: 2,
      stopIds: [...stops].reverse(),
    });
    const edited = await service.preview(operator, group, { date });
    expect(edited.publication?.stopIds).toEqual(stops);
    expect(edited.needsAdjustment).toBe(true);
    expect(await service.driverItinerary(driver, assigned.id)).toMatchObject({
      needsAdjustment: true,
    });
    expect(
      (await service.driverItinerary(driver, assigned.id)).ordered.map(
        (s) => s.id,
      ),
    ).toEqual(stops);
    const publications = await Promise.allSettled(
      [admin, operator].map((subject) =>
        service.publish(subject, group, {
          date,
          expectedVersion: 1,
          previewToken: edited.previewToken,
        }),
      ),
    );
    expect(publications.filter((r) => r.status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(
      (await service.preview(admin, group, { date })).publication?.stopIds,
    ).toEqual([...stops].reverse());
    expect(
      (await service.driverItinerary(driver, assigned.id)).ordered.map(
        (s) => s.id,
      ),
    ).toEqual([...stops].reverse());
    // A replacement planning version cannot inherit publication from a previous assignment.
    const next = await operations.current(admin);
    await operations.saveDraft(admin, {
      expectedVersion: next.version,
      demandToken: next.demandToken,
      trips,
    });
    expect(
      (await service.driverItinerary(driver, assigned.id)).ordered.map(
        (s) => s.id,
      ),
    ).toEqual([...stops].reverse());
    const replacement = await operations.current(admin);
    await operations.confirm(admin, {
      expectedVersion: replacement.version,
      demandToken: replacement.demandToken,
    });
    await expect(
      service.driverItinerary(driver, assigned.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const current = (await consultations.trips(driver)).find(
      (t) => t.stage === 'distribution',
    )!;
    expect(await service.driverItinerary(driver, current.id)).toMatchObject({
      status: 'unpublished',
      ordered: [],
    });
    const preview = await service.preview(admin, group, { date });
    await service.publish(admin, group, {
      date,
      expectedVersion: preview.version,
      previewToken: preview.previewToken,
    });
    instant = `${date}T21:00:00-03:00`;
    const cancellation = await journeys.receive(students[0], randomUUID());
    await journeys.apply(students[0], cancellation.id, {
      kind: 'cancel_return',
    });
    expect(
      (await service.driverItinerary(driver, current.id)).ordered.map(
        (s) => s.id,
      ),
    ).toEqual([stops[1]]);
    const link = await consultations.getLink(admin, driver);
    await consultations.link(admin, driver, {
      driverId: null,
      expectedVersion: link.version,
    });
    await expect(
      service.driverItinerary(driver, current.id),
    ).rejects.toMatchObject({ code: 'DRIVER_ACCESS_REQUIRED' });
    await consultations.link(admin, driver, {
      driverId: d.id,
      expectedVersion: link.version + 1,
    });
    instant = '2026-11-24T00:29:59-03:00';
    await expect(
      service.driverItinerary(driver, current.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    instant = '2026-11-24T00:30:00-03:00';
    await expect(
      service.driverItinerary(driver, current.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
