import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../src/registry/application/ports';
import { RegistryService } from '../../src/registry/application/registry.service';
import { PatternService } from '../../src/journey/application/pattern.service';
import { PlacePatterns1793300000000 } from '../../src/infrastructure/database/migrations/1793300000000-place-patterns';
import { LocationService } from '../../src/registry/application/location.service';
import { JourneyService } from '../../src/journey/application/journey.service';

// Faults decorate a public persistence port inside the real PostgreSQL transaction.
// They do not replace the database or inspect private service state.
class FaultStore extends RegistryStore {
  constructor(
    private readonly actual: RegistryStore,
    private readonly decorate: (tx: RegistryTransaction) => RegistryTransaction,
  ) {
    super();
  }
  transaction<T>(work: (tx: RegistryTransaction) => Promise<T>): Promise<T> {
    return this.actual.transaction((tx) => work(this.decorate(tx)));
  }
}
describe('Place patterns in isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    otherStore: PostgresRegistryStore;
  let service: JourneyService,
    other: JourneyService,
    ownsCalendar = false;
  let instant = '2026-10-24T19:59:59.000Z';
  let patterns: PatternService, second: PatternService, places: LocationService;
  let pointA: string, pointB: string, pointC: string;
  const catalogIds: string[] = [];
  const clock = { now: () => new Date(instant) },
    actor = randomUUID(),
    ids: string[] = [];
  const student = async () => {
    const created = await new RegistryService(store).createStudent(actor, {
      name: 'Resiliência sintética',
      phone: `+55469${randomInt(10000000, 99999999)}`,
      universityId: 'unimater',
      habitualDays: [],
      contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
    });
    ids.push(created.student.id);
    return created.student.id;
  };
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    const config = await source.query<
      { days: number[] | null; version: number }[]
    >(
      "SELECT days,version FROM app.university_calendars WHERE university_id='unimater'",
    );
    const exceptions = await source.query<unknown[]>(
      "SELECT 1 FROM app.calendar_exceptions WHERE university_id='unimater'",
    );
    if (config[0].days !== null || config[0].version !== 1 || exceptions.length)
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
    otherStore = new PostgresRegistryStore(readEnvironment(env).database);
    service = new JourneyService(store, clock);
    other = new JourneyService(otherStore, clock);
    patterns = new PatternService(store, clock);
    second = new PatternService(otherStore, clock);
    places = new LocationService(store, {
      validate: () => Promise.resolve({ status: 'unavailable' }),
    });
    const group = await places.create(actor, 'group', {
      name: 'Coleta B10',
      direction: 'pickup',
    });
    catalogIds.push(group.id);
    const points: string[] = [];
    for (const name of ['A', 'B', 'C']) {
      const p = await places.create(actor, 'point', {
        name,
        address: 'Sintético',
        groupId: group.id,
      });
      points.push(p.id);
      catalogIds.push(p.id);
    }
    [pointA, pointB, pointC] = points;
  });
  beforeEach(() => {
    instant = '2026-10-24T19:59:59.000Z';
  });
  afterAll(async () => {
    await store?.close();
    await otherStore?.close();
    if (source?.isInitialized) {
      for (const table of [
        'place_pattern_decisions',
        'student_place_defaults',
        'journey_receipts',
        'daily_journeys',
        'contracts',
      ])
        await source.query(
          `DELETE FROM app.${table} WHERE student_id=ANY($1::uuid[])`,
          [ids],
        );
      await source.query('DELETE FROM app.students WHERE id=ANY($1::uuid[])', [
        ids,
      ]);
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      await source.query(
        'DELETE FROM app.boarding_points WHERE id=ANY($1::uuid[])',
        [catalogIds],
      );
      await source.query('DELETE FROM app.return_locations WHERE provider=$1', [
        actor,
      ]);
      await source.query(
        'DELETE FROM app.service_regions WHERE id=ANY($1::uuid[])',
        [catalogIds],
      );
      await source.query(
        'DELETE FROM app.local_groups WHERE id=ANY($1::uuid[])',
        [catalogIds],
      );
      if (ownsCalendar)
        await source.query(
          "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unimater'",
        );
      await source.destroy();
    }
  });
  const setup = async () => {
    const id = await student();
    await places.setDefault(actor, id, 'pickup', {
      pointId: pointA,
      source: 'initial',
      evidence: 'synthetic',
      expectedVersion: 0,
    });
    return id;
  };
  const use = async (id: string, day: number, pointId = pointB) => {
    instant = `2026-10-${String(day).padStart(2, '0')}T18:00:00Z`;
    let receipt = await service.receive(id, randomUUID());
    await service.apply(id, receipt.id, { kind: 'places', pointId });
    receipt = await service.receive(id, randomUUID());
    await service.apply(id, receipt.id, { kind: 'only_pickup' });
  };
  const decide = async (
    id: string,
    suggestionKey: string,
    decision: 'accept' | 'refuse',
    expectedVersion = 1,
  ) => {
    const receipt = await service.receive(id, randomUUID());
    return patterns.apply(id, receipt.id, {
      kind: 'decide_suggestion',
      direction: 'pickup',
      suggestionKey,
      decision,
      expectedVersion,
    });
  };
  it('does not repeat a refused suggestion until a different place and four new uses', async () => {
    const id = await setup();
    for (const day of [1, 2, 3, 4]) await use(id, day);
    const key = (await patterns.current(actor, id)).pickup.suggestion!.key;
    expect((await decide(id, key, 'refuse')).status).toBe('applied');
    await use(id, 5);
    expect((await second.current(actor, id)).pickup.suggestion).toBeNull();
    expect((await places.defaults(actor, id)).pickup.value?.pointId).toBe(
      pointA,
    );
    await use(id, 6, pointC);
    for (const day of [7, 8, 9]) await use(id, day);
    expect((await patterns.current(actor, id)).pickup.suggestion).toBeNull();
    await use(id, 10);
    expect((await patterns.current(actor, id)).pickup.suggestion!.key).not.toBe(
      key,
    );
  });
  it('offers a fourth-use suggestion without changing the default or mixing directions', async () => {
    const id = await setup();
    for (const day of [2, 5, 7]) await use(id, day);
    expect((await patterns.current(actor, id)).pickup.suggestion).toBeNull();
    await use(id, 9);
    const view = await second.current(actor, id);
    expect(view.pickup.count).toBe(4);
    expect(view.pickup.suggestion).toMatchObject({
      placeId: pointB,
      expectedVersion: 1,
      direction: 'pickup',
    });
    expect(view.dropoff.suggestion).toBeNull();
    expect((await places.defaults(actor, id)).pickup.value?.pointId).toBe(
      pointA,
    );
  });
  it('accepts with evidence exactly once without changing the daily journey', async () => {
    const id = await setup();
    for (const day of [1, 2, 3, 4]) await use(id, day);
    const suggestion = (await patterns.current(actor, id)).pickup.suggestion!;
    const before = await service.today(actor, id),
      receipt = await service.receive(id, randomUUID());
    const command = {
      kind: 'decide_suggestion',
      direction: 'pickup',
      suggestionKey: suggestion.key,
      decision: 'accept',
      expectedVersion: 1,
    };
    expect(await patterns.apply(id, receipt.id, command)).toEqual({
      status: 'applied',
      version: 2,
    });
    expect(await second.apply(id, receipt.id, command)).toEqual({
      status: 'applied',
      version: 2,
    });
    expect((await places.defaults(actor, id)).pickup.value).toMatchObject({
      pointId: pointB,
      version: 2,
      source: 'consent',
      evidence: receipt.id,
    });
    expect((await service.today(actor, id)).journey).toEqual(before.journey);
    expect((await patterns.current(actor, id)).pickup.suggestion).toBeNull();
  });
  it('allows an explicit request without four uses and never confirms a journey', async () => {
    const id = await student(),
      receipt = await service.receive(id, randomUUID());
    expect(
      await patterns.apply(id, receipt.id, {
        kind: 'request_default',
        direction: 'pickup',
        placeId: pointB,
        expectedVersion: 0,
      }),
    ).toEqual({ status: 'applied', version: 1 });
    expect((await places.defaults(actor, id)).pickup.value).toMatchObject({
      pointId: pointB,
      source: 'request',
      evidence: receipt.id,
      version: 1,
    });
    expect((await service.today(actor, id)).journey).toBeNull();
  });
  it('revalidates proposals after revision and default changes', async () => {
    const id = await setup();
    for (const day of [1, 2, 3, 4]) await use(id, day);
    const key = (await patterns.current(actor, id)).pickup.suggestion!.key;
    const r = await service.receive(id, randomUUID());
    await service.apply(id, r.id, { kind: 'not_going' });
    expect(await decide(id, key, 'accept')).toMatchObject({
      status: 'rejected',
      code: 'SUGGESTION_STALE',
    });
    await use(id, 5);
    await places.setDefault(actor, id, 'pickup', {
      pointId: pointC,
      source: 'request',
      evidence: 'manual',
      expectedVersion: 1,
    });
    expect(await decide(id, key, 'accept')).toMatchObject({
      status: 'rejected',
      code: 'VERSION_CONFLICT',
    });
    expect((await places.defaults(actor, id)).pickup.value?.pointId).toBe(
      pointC,
    );
  });
  it('serializes conflicting requests and keeps older decisions from winning', async () => {
    const id = await setup();
    const old = await service.receive(id, randomUUID()),
      fresh = await other.receive(id, randomUUID());
    const command = {
      kind: 'request_default',
      direction: 'pickup',
      placeId: pointB,
      expectedVersion: 1,
    };
    expect(await second.apply(id, fresh.id, command)).toMatchObject({
      status: 'applied',
      version: 2,
    });
    expect(
      await patterns.apply(id, old.id, {
        ...command,
        expectedVersion: 2,
        placeId: pointC,
      }),
    ).toMatchObject({ status: 'rejected', code: 'STALE_COMMAND' });
    const a = await service.receive(id, randomUUID()),
      b = await other.receive(id, randomUUID());
    const results = await Promise.all([
      patterns.apply(id, a.id, {
        ...command,
        expectedVersion: 2,
        placeId: pointA,
      }),
      second.apply(id, b.id, {
        ...command,
        expectedVersion: 2,
        placeId: pointC,
      }),
    ]);
    expect(results.filter((r) => r.status === 'applied')).toHaveLength(1);
    expect((await places.defaults(actor, id)).pickup.value?.version).toBe(3);
  });
  it('uses durable time, rejects exact 17h and holds unordered decisions', async () => {
    const id = await setup(),
      command = {
        kind: 'request_default',
        direction: 'pickup',
        placeId: pointB,
        expectedVersion: 1,
      };
    instant = '2026-10-24T19:59:59.999Z';
    const timely = await service.receive(id, randomUUID());
    instant = '2026-10-24T20:00:00Z';
    expect(await patterns.apply(id, timely.id, command)).toEqual({
      status: 'applied',
      version: 2,
    });
    const late = await service.receive(id, randomUUID());
    expect(
      await patterns.apply(id, late.id, { ...command, expectedVersion: 2 }),
    ).toMatchObject({ status: 'rejected', code: 'DEADLINE_PASSED' });
    instant = '2026-10-25T18:00:00Z';
    const uncertain = await service.receiveUnordered(id, randomUUID());
    expect(
      await patterns.apply(id, uncertain.id, {
        ...command,
        expectedVersion: 2,
      }),
    ).toMatchObject({ status: 'pending', code: 'ORDER_UNCERTAIN' });
    expect((await places.defaults(actor, id)).pickup.value?.version).toBe(2);
  });
  it('rolls back default, decision and receipt result together before retry', async () => {
    const id = await setup(),
      r = await service.receive(id, randomUUID()),
      command = {
        kind: 'request_default',
        direction: 'pickup',
        placeId: pointB,
        expectedVersion: 1,
      };
    const broken = new PatternService(
      new FaultStore(store, (tx) => ({
        ...tx,
        journeys: {
          ...tx.journeys,
          finish: async (studentId, event, result) => {
            await tx.journeys.finish(studentId, event, result);
            throw new Error('Synthetic failure');
          },
        },
      })),
      clock,
    );
    await expect(broken.apply(id, r.id, command)).rejects.toMatchObject({
      code: 'REGISTRY_UNAVAILABLE',
    });
    expect((await places.defaults(actor, id)).pickup.value).toMatchObject({
      pointId: pointA,
      version: 1,
    });
    expect((await other.receive(id, r.id)).result).toBeNull();
    expect(await second.apply(id, r.id, command)).toEqual({
      status: 'applied',
      version: 2,
    });
    expect(
      await patterns.apply(id, r.id, { ...command, placeId: pointC }),
    ).toEqual({ status: 'applied', version: 2 });
    expect((await places.defaults(actor, id)).pickup.value?.pointId).toBe(
      pointB,
    );
    const runner = source.createQueryRunner();
    try {
      await runner.connect();
      await expect(
        new PlacePatterns1793300000000().down(runner),
      ).rejects.toThrow('B10_DATA_REQUIRES_PRESERVATION');
    } finally {
      await runner.release();
    }
  });
  it('rejects inactive students, inactive places, and forged validation fields', async () => {
    const id = await setup(),
      command = {
        kind: 'request_default',
        direction: 'pickup',
        placeId: pointB,
        expectedVersion: 1,
      };
    let r = await service.receive(id, randomUUID());
    await expect(
      patterns.apply(id, r.id, { ...command, validated: true }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(
      await patterns.apply(id, r.id, { ...command, placeId: randomUUID() }),
    ).toMatchObject({ status: 'rejected', code: 'LOCATION_INVALID' });
    const record = (await places.list(actor, 'point')).find(
      (p) => p.id === pointB,
    )!;
    await places.update(actor, 'point', pointB, {
      name: record.name,
      address: record.address,
      groupId: record.groupId,
      active: false,
      expectedVersion: record.version,
    });
    try {
      r = await service.receive(id, randomUUID());
      expect(await patterns.apply(id, r.id, command)).toMatchObject({
        status: 'rejected',
        code: 'LOCATION_INVALID',
      });
    } finally {
      await places.update(actor, 'point', pointB, {
        name: record.name,
        address: record.address,
        groupId: record.groupId,
        active: true,
        expectedVersion: record.version + 1,
      });
    }
    await source.query('UPDATE app.students SET active=false WHERE id=$1', [
      id,
    ]);
    r = await service.receive(id, randomUUID());
    expect(await patterns.apply(id, r.id, command)).toMatchObject({
      status: 'rejected',
      code: 'STUDENT_INACTIVE',
    });
  });
  it('counts return confirmations independently and retracts the fourth-use proposal after cancellation', async () => {
    const group = await places.create(actor, 'group', {
      name: 'Volta B10',
      direction: 'dropoff',
    });
    catalogIds.push(group.id);
    const region = await places.create(actor, 'region', {
      name: 'Região B10',
      groupId: group.id,
    });
    catalogIds.push(region.id);
    const validator = new LocationService(store, {
      validate: (address) =>
        Promise.resolve({
          status: 'inside',
          provider: actor,
          key: address,
          label: address,
          regionId: region.id,
          evidence: 'synthetic',
        }),
    });
    const id = await student();
    await validator.setDefault(actor, id, 'dropoff', {
      address: 'Base',
      source: 'initial',
      evidence: 'synthetic',
      expectedVersion: 0,
    });
    const alternate = (
      await validator.resolveReturn(actor, { address: 'Alternativo' })
    ).location.id;
    for (const day of [1, 2, 3, 4]) {
      instant = `2026-10-0${day}T18:00:00Z`;
      let r = await service.receive(id, randomUUID());
      await service.apply(id, r.id, { kind: 'places', locationId: alternate });
      r = await service.receive(id, randomUUID());
      await service.apply(id, r.id, { kind: 'only_dropoff' });
    }
    const view = await patterns.current(actor, id);
    expect(view.dropoff.suggestion?.placeId).toBe(alternate);
    expect(view.pickup.count).toBe(0);
    const accept = await service.receive(id, randomUUID());
    instant = '2026-10-04T20:00:00Z';
    const cancel = await service.receive(id, randomUUID());
    await service.apply(id, cancel.id, { kind: 'cancel_return' });
    expect((await patterns.current(actor, id)).dropoff).toMatchObject({
      count: 3,
      suggestion: null,
    });
    expect(
      await patterns.apply(id, accept.id, {
        kind: 'decide_suggestion',
        direction: 'dropoff',
        suggestionKey: view.dropoff.suggestion!.key,
        decision: 'accept',
        expectedVersion: 1,
      }),
    ).toMatchObject({ status: 'rejected', code: 'SUGGESTION_STALE' });
    instant = '2026-10-05T18:00:00Z';
    const request = await service.receive(id, randomUUID());
    expect(
      await patterns.apply(id, request.id, {
        kind: 'request_default',
        direction: 'dropoff',
        placeId: alternate,
        expectedVersion: 1,
      }),
    ).toEqual({ status: 'applied', version: 2 });
    expect((await validator.defaults(actor, id)).dropoff.value).toMatchObject({
      locationId: alternate,
      source: 'request',
    });
  });
  it('suspends an unknown confirmed place and recalculates after a delayed valid interpretation', async () => {
    const id = await student();
    for (const day of [1, 2, 3]) await use(id, day);
    instant = '2026-10-04T18:00:00Z';
    const unknown = await service.receive(id, randomUUID());
    await service.apply(id, unknown.id, { kind: 'only_pickup' });
    const correction = await service.receive(id, randomUUID());
    await places.setDefault(actor, id, 'pickup', {
      pointId: pointA,
      source: 'initial',
      evidence: 'synthetic',
      expectedVersion: 0,
    });
    await use(id, 5);
    expect((await patterns.current(actor, id)).pickup).toMatchObject({
      suspended: true,
      issue: 'SEQUENCE_LOCATION_REQUIRED',
      suggestion: null,
    });
    await service.apply(id, correction.id, { kind: 'places', pointId: pointB });
    expect((await patterns.current(actor, id)).pickup).toMatchObject({
      count: 5,
      suspended: false,
    });
    expect((await patterns.current(actor, id)).pickup.suggestion?.placeId).toBe(
      pointB,
    );
  });
  it('recalculates revisions and ignores days with no confirmed use', async () => {
    const id = await setup();
    for (const day of [1, 2, 3, 4]) await use(id, day);
    const old = (await patterns.current(actor, id)).pickup.suggestion!.key;
    const receipt = await service.receive(id, randomUUID());
    await service.apply(id, receipt.id, { kind: 'places', pointId: pointC });
    expect((await patterns.current(actor, id)).pickup).toMatchObject({
      count: 1,
      suggestion: null,
    });
    const cancel = await service.receive(id, randomUUID());
    await service.apply(id, cancel.id, { kind: 'not_going' });
    expect((await patterns.current(actor, id)).pickup).toMatchObject({
      count: 3,
      suggestion: null,
    });
    await use(id, 5);
    expect((await patterns.current(actor, id)).pickup.suggestion?.key).toBe(
      old,
    );
  });
});
