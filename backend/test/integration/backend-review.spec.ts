import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { RegistryService } from '../../src/registry/application/registry.service';
import { LocationService } from '../../src/registry/application/location.service';
import { JourneyService } from '../../src/journey/application/journey.service';
import { MessageService } from '../../src/messaging/application/message.service';
import { FleetService } from '../../src/fleet/application/fleet.service';
import { OperationService } from '../../src/operation/application/operation.service';
import { ConsultationService } from '../../src/operation/application/consultation.service';
import { CorrectionService } from '../../src/journey/application/correction.service';
import { ItineraryService } from '../../src/itinerary/application/itinerary.service';

describe('B17 integrated backend acceptance', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    ownsCalendar = false,
    ownsDate = false;
  const date = '2026-11-25',
    actor = randomUUID(),
    driverUser = randomUUID(),
    provider = randomUUID();
  const students: string[] = [],
    groups: string[] = [],
    points: string[] = [],
    regions: string[] = [],
    vehicles: string[] = [],
    drivers: string[] = [];
  let instant = `${date}T05:00:00-03:00`;
  const clock = { now: () => new Date(instant) };
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    const existing = await source.query<unknown[]>(
      'SELECT 1 FROM app.operation_plans WHERE date=$1',
      [date],
    );
    if (existing.length) throw new Error('Existing plan preserved');
    ownsDate = true;
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
    for (const [id, role] of [
      [actor, 'admin'],
      [driverUser, 'driver'],
    ])
      await source.query(
        'INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,$2,true)',
        [id, role],
      );
    store = new PostgresRegistryStore(readEnvironment(env).database);
  });
  afterAll(async () => {
    await store?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.published_itineraries WHERE group_id=ANY($1::uuid[])',
        [groups],
      );
      if (ownsDate)
        for (const table of [
          'operation_manifests',
          'operation_occupancies',
          'operation_plans',
        ])
          await source.query(
            `DELETE FROM app.${table} WHERE ${table === 'operation_occupancies' ? 'plan_date' : 'date'}=$1`,
            [date],
          );
      await source.query(
        'DELETE FROM app.message_attempts WHERE message_id IN (SELECT id FROM app.outgoing_messages WHERE student_id=ANY($1::uuid[]))',
        [students],
      );
      for (const table of [
        'outgoing_messages',
        'team_corrections',
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
        [driverUser],
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
      await source.query('DELETE FROM app.return_locations WHERE provider=$1', [
        provider,
      ]);
      await source.query(
        'DELETE FROM app.boarding_points WHERE id=ANY($1::uuid[])',
        [points],
      );
      await source.query(
        'DELETE FROM app.service_regions WHERE id=ANY($1::uuid[])',
        [regions],
      );
      await source.query(
        'DELETE FROM app.local_groups WHERE id=ANY($1::uuid[])',
        [groups],
      );
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [[actor, driverUser]],
      );
      if (ownsCalendar)
        await source.query(
          "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unimater'",
        );
      await source.destroy();
    }
  });
  it('keeps messages, delayed replies, closure, planning, correction and driver itineraries consistent through cancellation', async () => {
    const registry = new RegistryService(store),
      journeys = new JourneyService(store, clock),
      operations = new OperationService(store, clock),
      consultations = new ConsultationService(store, clock, operations);
    const itineraries = new ItineraryService(
        store,
        clock,
        operations,
        consultations,
      ),
      corrections = new CorrectionService(store, clock);
    const messages = new MessageService(
      store,
      clock,
      { send: () => Promise.resolve({ status: 'failed' }) },
      journeys,
    );
    const places = new LocationService(store, {
      validate: () => Promise.reject(new Error('unused')),
    });
    const pickup = await places.create(actor, 'group', {
        name: 'B17 coleta',
        direction: 'pickup',
      }),
      dropoff = await places.create(actor, 'group', {
        name: 'B17 distribuição',
        direction: 'dropoff',
      });
    groups.push(pickup.id, dropoff.id);
    const point = await places.create(actor, 'point', {
      name: 'B17 ponto',
      address: 'Sintético',
      groupId: pickup.id,
    });
    points.push(point.id);
    const region = await places.create(actor, 'region', {
      name: 'B17 região',
      groupId: dropoff.id,
    });
    regions.push(region.id);
    const validated = new LocationService(store, {
      validate: (address: string) =>
        Promise.resolve({
          status: 'inside',
          provider,
          key: address,
          label: address,
          regionId: region.id,
          evidence: 'Somente teste',
        }),
    });
    for (let i = 0; i < 2; i++) {
      const { student } = await registry.createStudent(actor, {
        name: `B17 aluno ${i}`,
        phone: `+55469${randomInt(10000000, 99999999)}`,
        universityId: 'unimater',
        habitualDays: [0, 1, 2, 3, 4, 5, 6],
        contract: { startDate: date, endDate: date },
      });
      students.push(student.id);
      await places.setDefault(actor, student.id, 'pickup', {
        pointId: point.id,
        source: 'initial',
        evidence: 'Teste',
        expectedVersion: 0,
      });
      await validated.setDefault(actor, student.id, 'dropoff', {
        address: 'B17 original',
        source: 'initial',
        evidence: 'Teste',
        expectedVersion: 0,
      });
    }
    const initial = await messages.prepare(students[0]);
    expect(initial?.slot).toBe(5);
    expect((await messages.dispatch(initial!.id)).status).toBe('failed');
    const unanswered = await consultations.overview(actor, {});
    expect(unanswered.counts.pickup).toMatchObject({
      confirmado: 0,
      sem_resposta: 2,
    });
    expect(
      unanswered.students.find((s) => s.studentId === students[0])?.messages,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'failed' })]),
    );

    instant = `${date}T16:59:59.999-03:00`;
    const receipt = await journeys.receive(students[0], randomUUID());
    instant = `${date}T17:00:00-03:00`;
    await messages.tick();
    expect(
      (await consultations.overview(actor, {})).counts.dropoff.confirmado,
    ).toBe(0);
    const command = { kind: 'answer', pickup: 'yes', dropoff: 'unsure' };
    const applied = await journeys.apply(students[0], receipt.id, command);
    expect(applied.status).toBe('applied');
    expect(
      await Promise.all([
        journeys.apply(students[0], receipt.id, command),
        journeys.apply(students[0], receipt.id, command),
      ]),
    ).toEqual([applied, applied]);
    const closed = await consultations.overview(actor, {});
    expect(closed.counts.pickup).toMatchObject({
      confirmado: 1,
      sem_resposta: 1,
    });
    expect(closed.counts.dropoff).toMatchObject({
      confirmado: 1,
      sem_resposta: 1,
    });
    expect(
      closed.students.find((s) => s.studentId === students[0])?.dropoff.origin,
    ).toBe('padrao_fechamento');
    const notice = await messages.prepare(students[0]);
    expect(notice?.slot).toBe(17);
    const failedNotice = await messages.dispatch(notice!.id);
    expect(failedNotice.status).toBe('failed');

    const fleet = new FleetService(store),
      driver = await fleet.createDriver(actor, {
        name: 'B17 motorista',
        phone: '+5546999988888',
      });
    drivers.push(driver.id);
    const vehicle = await fleet.createVehicle(actor, {
      identifier: randomUUID(),
      plate: 'B17' + randomInt(1000, 9999),
      kind: 'bus',
      seats: 40,
    });
    vehicles.push(vehicle.id);
    await fleet.setWeek(actor, vehicle.id, {
      expectedVersion: 1,
      week: Array(7).fill(true),
    });
    await consultations.link(actor, driverUser, {
      driverId: driver.id,
      expectedVersion: 0,
    });
    const trips = [
      {
        kind: 'local',
        vehicleId: vehicle.id,
        driverId: driver.id,
        groupId: pickup.id,
        stage: 'collection',
        start: 1020,
        end: 1050,
      },
      {
        kind: 'intermunicipal',
        vehicleId: vehicle.id,
        universityId: 'unimater',
        outbound: { driverId: driver.id, start: 1050, end: 1110 },
        return: { driverId: driver.id, start: 1380, end: 1440 },
      },
      {
        kind: 'local',
        vehicleId: vehicle.id,
        driverId: driver.id,
        groupId: dropoff.id,
        stage: 'distribution',
        start: 1440,
        end: 1470,
      },
    ];
    const confirm = async () => {
      const before = await operations.current(actor);
      await operations.saveDraft(actor, {
        expectedVersion: before.version,
        demandToken: before.demandToken,
        trips,
      });
      const ready = await operations.current(actor);
      return operations.confirm(actor, {
        expectedVersion: ready.version,
        demandToken: ready.demandToken,
      });
    };
    await confirm();
    const returnPlace = closed.students.find(
      (s) => s.studentId === students[0],
    )!.dropoffPlace!.id;
    await itineraries.setOrder(actor, pickup.id, {
      expectedVersion: 0,
      stopIds: [point.id],
    });
    await itineraries.setOrder(actor, dropoff.id, {
      expectedVersion: 0,
      stopIds: [returnPlace],
    });
    const publish = async (group: string) => {
      const preview = await itineraries.preview(actor, group, { date });
      return itineraries.publish(actor, group, {
        date,
        expectedVersion: preview.version,
        previewToken: preview.previewToken,
      });
    };
    await publish(pickup.id);
    await publish(dropoff.id);
    const assigned = (await consultations.trips(driverUser)).find(
      (t) => t.stage === 'distribution',
    )!;
    expect(
      (await itineraries.driverItinerary(driverUser, assigned.id)).ordered.map(
        (s) => s.id,
      ),
    ).toEqual([returnPlace]);

    instant = `${date}T18:00:00-03:00`;
    const newPlace = (
      await validated.resolveReturn(actor, { address: 'B17 novo endereço' })
    ).location.id;
    const beforeMessages = await messages.current(actor, {}),
      current = await corrections.current(actor, students[0]);
    await corrections.correct(actor, students[0], {
      operationId: randomUUID(),
      expectedVersion: current.version,
      reason: 'Endereço conferido pela equipe',
      reviewedReceiptIds: [],
      changes: { locationId: newPlace },
    });
    expect(await messages.current(actor, {})).toEqual(beforeMessages);
    const changed = await itineraries.driverItinerary(driverUser, assigned.id);
    expect(changed.ordered).toEqual([]);
    expect(changed.pending.map((s) => s.id)).toEqual([newPlace]);
    expect(changed.needsAdjustment).toBe(true);
    const incomplete = await itineraries.preview(actor, dropoff.id, { date });
    await expect(
      itineraries.publish(actor, dropoff.id, {
        date,
        expectedVersion: incomplete.version,
        previewToken: incomplete.previewToken,
      }),
    ).rejects.toMatchObject({ code: 'ITINERARY_INCOMPLETE' });
    expect(
      (await consultations.overview(actor, {})).counts.dropoff.confirmado,
    ).toBe(1);
    await itineraries.setOrder(actor, dropoff.id, {
      expectedVersion: 1,
      stopIds: [returnPlace, newPlace],
    });
    await confirm();
    await publish(dropoff.id);
    const revised = (await consultations.trips(driverUser)).find(
      (t) => t.stage === 'distribution',
    )!;
    const confirmedPlan = (await operations.current(actor)).plan;
    expect(
      (await itineraries.driverItinerary(driverUser, revised.id)).ordered.map(
        (s) => s.id,
      ),
    ).toEqual([newPlace]);

    instant = `${date}T21:59:59.999-03:00`;
    const cancellation = await journeys.receive(students[0], randomUUID());
    instant = `${date}T22:00:00-03:00`;
    expect(
      (
        await journeys.apply(students[0], cancellation.id, {
          kind: 'cancel_return',
        })
      ).status,
    ).toBe('applied');
    await journeys.closeDay(date);
    expect(
      (await itineraries.driverItinerary(driverUser, revised.id)).ordered,
    ).toEqual([]);
    const final = await consultations.overview(actor, {});
    expect(final.counts.pickup.confirmado).toBe(1);
    expect(final.counts.dropoff).toMatchObject({
      confirmado: 0,
      cancelado: 1,
      sem_resposta: 1,
    });
    expect((await operations.current(actor)).plan).toEqual({
      ...confirmedPlan,
      needsAdjustment: true,
    });
    expect(
      (
        await messages.retry(actor, failedNotice.id, {
          expectedVersion: failedNotice.version,
        })
      ).status,
    ).toBe('skipped');
    const late = await journeys.receive(students[0], randomUUID());
    expect(
      await journeys.apply(students[0], late.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'rejected', code: 'DEADLINE_PASSED' });
  });
});
