import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { RegistryService } from '../../src/registry/application/registry.service';
import { LocationService } from '../../src/registry/application/location.service';
import { JourneyService } from '../../src/journey/application/journey.service';
import { CorrectionService } from '../../src/journey/application/correction.service';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../src/registry/application/ports';
import { FleetService } from '../../src/fleet/application/fleet.service';
import { OperationService } from '../../src/operation/application/operation.service';
import { TeamCorrections1793600000000 } from '../../src/infrastructure/database/migrations/1793600000000-team-corrections';
import { PatternService } from '../../src/journey/application/pattern.service';
import { CalendarService } from '../../src/registry/application/calendar.service';
describe('Team corrections in isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    other: PostgresRegistryStore,
    service: CorrectionService,
    second: CorrectionService,
    journeys: JourneyService,
    places: LocationService;
  let point: string,
    location: string,
    pickup: string,
    dropoff: string,
    date: string,
    instant: string,
    day = 0,
    ownsCalendar = false;
  const actor = randomUUID(),
    provider = randomUUID(),
    students: string[] = [],
    catalog: string[] = [],
    dates: string[] = [],
    vehicles: string[] = [],
    drivers: string[] = [];
  const clock = { now: () => new Date(instant) };
  const student = async () => {
    const { student: s } = await new RegistryService(store).createStudent(
      actor,
      {
        name: 'B13 sintético',
        phone: `+55469${randomInt(10000000, 99999999)}`,
        universityId: 'unimater',
        habitualDays: [],
        contract: { startDate: '2026-01-01', endDate: '2026-12-31' },
      },
    );
    students.push(s.id);
    return s;
  };
  const input = async (id: string, changes: Record<string, unknown>) => {
    const context = await service.current(actor, id);
    return {
      operationId: randomUUID(),
      expectedVersion: context.version,
      reason: 'Informação conferida por telefone',
      reviewedReceiptIds: context.pendingReceipts.map((r) => r.id),
      changes,
    };
  };
  const correct = async (id: string, changes: Record<string, unknown>) =>
    service.correct(actor, id, await input(id, changes));
  const command = async (id: string, kind: string) => {
    const r = await journeys.receive(id, randomUUID());
    return journeys.apply(id, r.id, { kind });
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
    if (
      rows[0].days !== null ||
      rows[0].version !== 1 ||
      (
        await source.query<unknown[]>(
          "SELECT 1 FROM app.calendar_exceptions WHERE university_id='unimater'",
        )
      ).length
    )
      throw new Error('Existing calendar preserved');
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
    service = new CorrectionService(store, clock);
    second = new CorrectionService(other, clock);
    journeys = new JourneyService(store, clock);
    const setup = new LocationService(store, {
      validate: () => Promise.reject(new Error('unused')),
    });
    pickup = (
      await setup.create(actor, 'group', {
        name: 'Coleta B13',
        direction: 'pickup',
      })
    ).id;
    catalog.push(pickup);
    dropoff = (
      await setup.create(actor, 'group', {
        name: 'Distribuição B13',
        direction: 'dropoff',
      })
    ).id;
    catalog.push(dropoff);
    point = (
      await setup.create(actor, 'point', {
        name: 'Ponto B13',
        address: 'Sintético',
        groupId: pickup,
      })
    ).id;
    catalog.push(point);
    const region = (
      await setup.create(actor, 'region', {
        name: 'Região B13',
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
    location = (await places.resolveReturn(actor, { address: 'Sintético' }))
      .location.id;
  });
  beforeEach(async () => {
    date = `2026-12-${String(++day).padStart(2, '0')}`;
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
    instant = `${date}T20:30:00Z`;
  });
  afterAll(async () => {
    await store?.close();
    await other?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.operation_occupancies WHERE plan_date=ANY($1::date[])',
        [dates],
      );
      await source.query(
        'DELETE FROM app.operation_manifests WHERE date=ANY($1::date[])',
        [dates],
      );
      await source.query(
        'DELETE FROM app.operation_plans WHERE date=ANY($1::date[])',
        [dates],
      );
      for (const t of [
        'team_corrections',
        'place_pattern_decisions',
        'journey_receipts',
        'daily_journeys',
        'student_place_defaults',
        'contracts',
      ])
        await source.query(
          `DELETE FROM app.${t} WHERE student_id=ANY($1::uuid[])`,
          [students],
        );
      await source.query('DELETE FROM app.students WHERE id=ANY($1::uuid[])', [
        students,
      ]);
      await source.query('DELETE FROM app.return_locations WHERE provider=$1', [
        provider,
      ]);
      for (const t of ['boarding_points', 'service_regions', 'local_groups'])
        await source.query(`DELETE FROM app.${t} WHERE id=ANY($1::uuid[])`, [
          catalog,
        ]);
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
      if (ownsCalendar) {
        await source.query(
          "DELETE FROM app.calendar_exceptions WHERE university_id='unimater' AND date=ANY($1::date[])",
          [dates],
        );
        await source.query(
          "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unimater'",
        );
      }
      await source.destroy();
    }
  });
  it('corrects one leg after 17h with team origin, preserving defaults and the other leg', async () => {
    const s = await student();
    const result = await correct(s.id, {
      pickup: 'confirmado',
      pointId: point,
    });
    expect(result.journey).toMatchObject({
      pickup: { state: 'confirmado', origin: 'equipe' },
      dropoff: { state: 'sem_resposta', origin: 'none' },
      pointId: point,
      version: 1,
    });
    expect((await journeys.close(s.id, date)).journey?.dropoff.state).toBe(
      'sem_resposta',
    );
    expect((await places.defaults(actor, s.id)).pickup.value).toBeNull();
    await correct(s.id, { dropoff: 'confirmado', locationId: location });
    expect(await command(s.id, 'cancel_return')).toMatchObject({
      status: 'applied',
    });
    expect((await service.current(actor, s.id)).journey?.pickup.origin).toBe(
      'equipe',
    );
    instant = `${date}T23:30:00Z`;
    await correct(s.id, { dropoff: 'confirmado' });
    expect((await journeys.close(s.id, date)).journey?.dropoff.state).toBe(
      'confirmado',
    );
  });
  it('requires explicit review of every pending receipt and prevents older interpretation from undoing a correction', async () => {
    const s = await student();
    instant = `${date}T19:00:00Z`;
    const old = await journeys.receive(s.id, randomUUID());
    const proposed = await input(s.id, {
      pickup: 'confirmado',
      dropoff: 'recusado',
      pointId: point,
    });
    const uncertain = await journeys.receiveUnordered(s.id, randomUUID());
    await journeys.apply(s.id, uncertain.id, { kind: 'going' });
    instant = `${date}T20:00:00Z`;
    await expect(service.correct(actor, s.id, proposed)).rejects.toMatchObject({
      code: 'PENDING_REVIEW_REQUIRED',
    });
    const reviewed = await input(s.id, {
      pickup: 'confirmado',
      dropoff: 'recusado',
      pointId: point,
    });
    await service.correct(actor, s.id, reviewed);
    expect((await service.current(actor, s.id)).pendingReceipts).toEqual([]);
    expect(await journeys.apply(s.id, old.id, { kind: 'going' })).toEqual({
      status: 'rejected',
      code: 'RESOLVED_BY_TEAM',
    });
    expect(await journeys.apply(s.id, uncertain.id, { kind: 'going' })).toEqual(
      { status: 'rejected', code: 'RESOLVED_BY_TEAM' },
    );
    expect((await journeys.close(s.id, date)).journey?.dropoff).toEqual({
      state: 'recusado',
      origin: 'equipe',
    });
    expect(await command(s.id, 'going')).toMatchObject({
      status: 'rejected',
      code: 'DEADLINE_PASSED',
    });
  });
  it('serializes edits and replays the original result without overwriting newer corrections', async () => {
    const s = await student(),
      a = await input(s.id, { pickup: 'confirmado', pointId: point }),
      b = {
        ...a,
        operationId: randomUUID(),
        changes: { dropoff: 'confirmado', locationId: location },
      };
    const races = await Promise.allSettled([
      service.correct(actor, s.id, a),
      second.correct(actor, s.id, b),
    ]);
    expect(races.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (races.find((r) => r.status === 'rejected') as PromiseRejectedResult)
        .reason,
    ).toMatchObject({ code: 'VERSION_CONFLICT' });
    const next = await input(s.id, { pickup: 'recusado', dropoff: 'recusado' });
    const repeated = await Promise.all([
      service.correct(actor, s.id, next),
      second.correct(actor, s.id, next),
    ]);
    expect(repeated[1]).toEqual(repeated[0]);
    await correct(s.id, { pickup: 'confirmado' });
    expect(await service.correct(actor, s.id, next)).toEqual(repeated[0]);
    expect((await service.current(actor, s.id)).journey?.pickup.state).toBe(
      'confirmado',
    );
    await expect(
      service.correct(actor, s.id, { ...next, reason: 'Outro motivo' }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    const runner = source.createQueryRunner();
    await runner.connect();
    try {
      await expect(
        new TeamCorrections1793600000000().down(runner),
      ).rejects.toThrow('B13_DATA_REQUIRES_PRESERVATION');
    } finally {
      await runner.release();
    }
  });
  it('revalidates eligibility and places but allows removing existing confirmations from an inactive student', async () => {
    const s = await student();
    await correct(s.id, {
      pickup: 'confirmado',
      dropoff: 'confirmado',
      pointId: point,
      locationId: location,
    });
    await expect(
      correct(s.id, { pointId: randomUUID() }),
    ).rejects.toMatchObject({ code: 'LOCATION_INVALID' });
    expect((await service.current(actor, s.id)).journey?.pointId).toBe(point);
    await new RegistryService(store).updateStudent(actor, s.id, {
      name: s.name,
      phone: s.phone,
      universityId: s.universityId,
      habitualDays: s.habitualDays,
      active: false,
      expectedVersion: s.version,
    });
    await correct(s.id, { pickup: 'recusado', dropoff: 'recusado' });
    await expect(correct(s.id, { pickup: 'confirmado' })).rejects.toMatchObject(
      { code: 'INACTIVE_STUDENT' },
    );
    expect((await service.current(actor, s.id)).journey?.pickup.state).toBe(
      'recusado',
    );
  });
  it('rolls back pending resolution, journey and sequence when recording the correction fails', async () => {
    const s = await student(),
      r = await journeys.receive(s.id, randomUUID()),
      proposed = await input(s.id, { pickup: 'confirmado', pointId: point });
    class BrokenStore extends RegistryStore {
      transaction<T>(
        work: (tx: RegistryTransaction) => Promise<T>,
      ): Promise<T> {
        return store.transaction((tx) =>
          work({
            ...tx,
            corrections: {
              ...tx.corrections,
              insert: async (v) => {
                await tx.corrections.insert(v);
                throw new Error('Synthetic failure');
              },
            },
          }),
        );
      }
    }
    await expect(
      new CorrectionService(new BrokenStore(), clock).correct(
        actor,
        s.id,
        proposed,
      ),
    ).rejects.toMatchObject({ code: 'REGISTRY_UNAVAILABLE' });
    const snapshot = await service.current(actor, s.id);
    expect(snapshot.version).toBe(0);
    expect(snapshot.pendingReceipts.map((p) => p.id)).toEqual([r.id]);
    expect((await service.correct(actor, s.id, proposed)).version).toBe(1);
  });
  it('invalidates planning on excess demand while preserving all previous occupancies', async () => {
    const first = await student();
    await correct(first.id, {
      pickup: 'confirmado',
      dropoff: 'confirmado',
      pointId: point,
      locationId: location,
    });
    const fleet = new FleetService(store),
      operation = new OperationService(store, clock);
    const v = await fleet.createVehicle(actor, {
      identifier: randomUUID(),
      plate: randomUUID().replaceAll('-', '').slice(0, 12),
      kind: 'van',
      seats: 1,
    });
    vehicles.push(v.id);
    await fleet.setWeek(actor, v.id, {
      expectedVersion: 1,
      week: Array(7).fill(true),
    });
    const d = await fleet.createDriver(actor, {
      name: 'B13 motorista',
      phone: '+5546999990000',
    });
    drivers.push(d.id);
    const trips = [
      {
        kind: 'local',
        vehicleId: v.id,
        driverId: d.id,
        groupId: pickup,
        stage: 'collection',
        start: 1050,
        end: 1080,
      },
      {
        kind: 'intermunicipal',
        vehicleId: v.id,
        universityId: 'unimater',
        outbound: { driverId: d.id, start: 1080, end: 1140 },
        return: { driverId: d.id, start: 1320, end: 1380 },
      },
      {
        kind: 'local',
        vehicleId: v.id,
        driverId: d.id,
        groupId: dropoff,
        stage: 'distribution',
        start: 1380,
        end: 1440,
      },
    ];
    let snap = await operation.current(actor);
    await operation.saveDraft(actor, {
      expectedVersion: snap.version,
      demandToken: snap.demandToken,
      trips,
    });
    await operation.confirm(actor, {
      expectedVersion: 1,
      demandToken: snap.demandToken,
    });
    const occupied = await source.query<{ id: string }[]>(
      'SELECT id FROM app.operation_occupancies WHERE plan_date=$1 AND active ORDER BY id',
      [date],
    );
    const added = await student();
    await correct(added.id, {
      pickup: 'confirmado',
      dropoff: 'confirmado',
      pointId: point,
      locationId: location,
    });
    snap = await operation.current(actor);
    expect(snap.status).toBe('needs_adjustment');
    expect(snap.planningIssues).toContain('CAPACITY_INSUFFICIENT');
    expect(snap.universities[0].required).toBe(2);
    await operation.saveDraft(actor, {
      expectedVersion: snap.version,
      demandToken: snap.demandToken,
      trips,
    });
    await expect(
      operation.confirm(actor, {
        expectedVersion: 2,
        demandToken: snap.demandToken,
      }),
    ).rejects.toMatchObject({ code: 'PLANNING_REQUIRES_ADJUSTMENT' });
    expect(
      await source.query(
        'SELECT id FROM app.operation_occupancies WHERE plan_date=$1 AND active ORDER BY id',
        [date],
      ),
    ).toEqual(occupied);
  });
  it('preserves manual refusal before 17h while allowing a later explicit student change and recalculating B10', async () => {
    const s = await student();
    instant = `${date}T18:00:00Z`;
    await correct(s.id, {
      pickup: 'confirmado',
      dropoff: 'recusado',
      pointId: point,
    });
    await command(s.id, 'going');
    expect((await service.current(actor, s.id)).journey?.dropoff).toEqual({
      state: 'recusado',
      origin: 'equipe',
    });
    const patterns = new PatternService(store, clock);
    expect((await patterns.current(actor, s.id)).pickup.count).toBe(1);
    await correct(s.id, { pickup: 'recusado' });
    expect((await patterns.current(actor, s.id)).pickup.count).toBe(0);
    const r = await journeys.receive(s.id, randomUUID());
    await journeys.apply(s.id, r.id, { kind: 'answer', dropoff: 'yes' });
    expect((await service.current(actor, s.id)).journey?.dropoff.origin).toBe(
      'aluno_explicito',
    );
    await journeys.receiveUnordered(s.id, randomUUID());
    const before = (await service.current(actor, s.id)).journey;
    await correct(s.id, {});
    expect((await service.current(actor, s.id)).journey?.dropoff).toEqual(
      before?.dropoff,
    );
  });
  it('serializes interpretation against correction without letting the older message win after correction', async () => {
    const s = await student();
    instant = `${date}T19:00:00Z`;
    const old = await journeys.receive(s.id, randomUUID());
    const proposed = await input(s.id, {
      pickup: 'recusado',
      dropoff: 'recusado',
    });
    instant = `${date}T20:00:00Z`;
    const [correction] = await Promise.allSettled([
      service.correct(actor, s.id, proposed),
      new JourneyService(other, clock).apply(s.id, old.id, { kind: 'going' }),
    ]);
    const current = await service.current(actor, s.id);
    if (correction.status === 'fulfilled')
      expect(current.journey?.pickup).toEqual({
        state: 'recusado',
        origin: 'equipe',
      });
    else {
      expect(correction.reason).toMatchObject({ code: 'VERSION_CONFLICT' });
      expect(current.journey?.pickup.origin).toBe('aluno_explicito');
    }
  });
  it('blocks new confirmations without operation and requires explicit university adoption', async () => {
    const s = await student();
    await correct(s.id, { pickup: 'confirmado', pointId: point });
    await new RegistryService(store).updateStudent(actor, s.id, {
      name: s.name,
      phone: s.phone,
      universityId: 'unidep',
      habitualDays: [],
      active: true,
      expectedVersion: 1,
    });
    await expect(
      correct(s.id, { dropoff: 'confirmado' }),
    ).rejects.toMatchObject({ code: 'CONTEXT_CHANGED' });
    await expect(
      correct(s.id, { universityId: 'unidep' }),
    ).rejects.toMatchObject({ code: 'CALENDAR_UNCONFIGURED' });
    const calendars = new CalendarService(store);
    const original = await calendars.get(actor, 'unidep');
    if (
      original.days !== null ||
      original.version !== 1 ||
      (await calendars.exceptions(actor, 'unidep', { from: date, to: date }))
        .exceptions.length
    )
      throw new Error('Existing Unidep calendar preserved');
    await calendars.exception(actor, 'unidep', date, {
      operates: true,
      reason: 'B13 fixture',
      expectedVersion: 1,
    });
    try {
      await correct(s.id, { universityId: 'unidep' });
      expect((await journeys.today(actor, s.id)).journey?.universityId).toBe(
        'unidep',
      );
    } finally {
      await source.query(
        "DELETE FROM app.calendar_exceptions WHERE university_id='unidep' AND date=$1",
        [date],
      );
      await source.query(
        "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unidep'",
      );
    }
    await new RegistryService(store).updateStudent(actor, s.id, {
      name: s.name,
      phone: s.phone,
      universityId: 'unimater',
      habitualDays: [],
      active: true,
      expectedVersion: 2,
    });
    await correct(s.id, { universityId: 'unimater' });
    await new CalendarService(store).exception(actor, 'unimater', date, {
      operates: false,
      reason: 'Teste B13',
      expectedVersion: 1,
    });
    await expect(
      correct(s.id, { dropoff: 'confirmado' }),
    ).rejects.toMatchObject({ code: 'NO_OPERATION' });
    await correct(s.id, { pickup: 'recusado' });
  });
});
