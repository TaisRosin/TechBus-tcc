import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { RegistryService } from '../../src/registry/application/registry.service';
import { JourneyService } from '../../src/journey/application/journey.service';
import { LocationService } from '../../src/registry/application/location.service';

describe('Daily journeys in isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    second: PostgresRegistryStore;
  let service: JourneyService;
  let instant = '2026-10-23T19:59:59.000Z';
  const actor = randomUUID(),
    students: string[] = [];
  const catalogIds: string[] = [],
    provider = randomUUID();
  const places = () =>
    new LocationService(store, {
      validate: () => Promise.reject(new Error('Unavailable')),
    });
  let ownsCalendar = false;
  const clock = { now: () => new Date(instant) };
  const student = async () => {
    const result = await new RegistryService(store).createStudent(actor, {
      name: 'Jornada sintética',
      phone: `+55469${randomInt(10000000, 99999999)}`,
      universityId: 'unimater',
      habitualDays: [],
      contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
    });
    students.push(result.student.id);
    return result.student.id;
  };
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    const calendars = await source.query<
      { days: number[] | null; version: number }[]
    >(
      "SELECT days,version FROM app.university_calendars WHERE university_id='unimater'",
    );
    const exceptions = await source.query<unknown[]>(
      "SELECT 1 FROM app.calendar_exceptions WHERE university_id='unimater'",
    );
    if (
      calendars[0].days !== null ||
      calendars[0].version !== 1 ||
      exceptions.length
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
    second = new PostgresRegistryStore(readEnvironment(env).database);
    service = new JourneyService(store, clock);
  });
  beforeEach(() => {
    instant = '2026-10-23T19:59:59.000Z';
  });
  afterAll(async () => {
    await store?.close();
    await second?.close();
    if (source?.isInitialized) {
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
          [catalogIds],
        );
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      if (ownsCalendar)
        await source.query(
          "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unimater'",
        );
      await source.destroy();
    }
  });
  it('durably receives before interpretation and counts confirmation without a location', async () => {
    const id = await student();
    const receipt = await service.receive(id, randomUUID());
    instant = '2026-10-23T20:05:00.000Z';
    const later = new JourneyService(second, clock);
    expect(await later.apply(id, receipt.id, { kind: 'going' })).toMatchObject({
      status: 'applied',
      version: 1,
    });
    expect(await service.today(actor, id)).toMatchObject({
      journey: {
        origin: 'extra',
        pickup: { state: 'confirmado' },
        dropoff: { state: 'confirmado' },
      },
      counts: { pickup: 1, dropoff: 1 },
      needsAdjustment: true,
      issues: expect.arrayContaining([
        'PICKUP_LOCATION_REQUIRED',
        'DROPOFF_LOCATION_REQUIRED',
      ]) as unknown,
    });
  });
  it('does not repeat effects or allow an older receipt to overwrite a newer explicit refusal', async () => {
    const id = await student(),
      event = randomUUID();
    const old = await service.receive(id, event);
    expect((await service.receive(id, event)).sequence).toBe(old.sequence);
    const latest = await service.receive(id, randomUUID());
    const result = await service.apply(id, latest.id, { kind: 'only_pickup' });
    expect(await service.apply(id, latest.id, { kind: 'going' })).toEqual(
      result,
    );
    expect(await service.apply(id, old.id, { kind: 'going' })).toMatchObject({
      status: 'rejected',
      code: 'STALE_COMMAND',
    });
    const next = await service.receive(id, randomUUID());
    await service.apply(id, next.id, { kind: 'going' });
    expect(await service.today(actor, id)).toMatchObject({
      journey: { version: 2, dropoff: { state: 'recusado' } },
      counts: { pickup: 1, dropoff: 0 },
    });
  });
  it('preserves valid states and exposes clarification, persistent incomprehension and uncertain order', async () => {
    const id = await student();
    const initial = await service.receive(id, randomUUID());
    await service.apply(id, initial.id, { kind: 'going' });
    const unclear = await service.receive(id, randomUUID());
    expect(
      await service.apply(id, unclear.id, {
        kind: 'unclear',
        persistent: false,
      }),
    ).toMatchObject({ status: 'pending', code: 'CLARIFICATION_REQUIRED' });
    const persistent = await service.receive(id, randomUUID());
    await service.apply(id, persistent.id, {
      kind: 'unclear',
      persistent: true,
    });
    const uncertain = await service.receive(id, randomUUID(), 'uncertain');
    expect(
      await service.apply(id, uncertain.id, { kind: 'not_going' }),
    ).toMatchObject({ status: 'pending', code: 'ORDER_UNCERTAIN' });
    expect(await service.today(actor, id)).toMatchObject({
      journey: { version: 1 },
      counts: { pickup: 1, dropoff: 1 },
      pending: expect.arrayContaining([
        'TEAM_REVIEW_REQUIRED',
        'ORDER_UNCERTAIN',
      ]) as unknown,
    });
  });
  it('rejects arrival at 17h and revalidates eligibility after receipt', async () => {
    const id = await student();
    instant = '2026-10-23T20:00:00.000Z';
    const late = await service.receive(id, randomUUID());
    expect(await service.apply(id, late.id, { kind: 'going' })).toMatchObject({
      status: 'rejected',
      code: 'DEADLINE_PASSED',
    });
    instant = '2026-10-23T19:59:59.000Z';
    const earlier = await service.receive(id, randomUUID());
    await source.query('UPDATE app.students SET active=false WHERE id=$1', [
      id,
    ]);
    expect(
      await service.apply(id, earlier.id, { kind: 'going' }),
    ).toMatchObject({ status: 'rejected', code: 'INACTIVE_STUDENT' });
    expect(await service.today(actor, id)).toMatchObject({
      journey: null,
      counts: { pickup: 0, dropoff: 0 },
    });
  });
  it('serializes concurrent repeats to one change', async () => {
    const id = await student(),
      key = randomUUID();
    const other = new JourneyService(second, clock);
    const received = await Promise.all([
      service.receive(id, key),
      other.receive(id, key),
    ]);
    expect(received[0].sequence).toBe(received[1].sequence);
    const results = await Promise.all([
      service.apply(id, key, { kind: 'going' }),
      other.apply(id, key, { kind: 'going' }),
    ]);
    expect(results).toEqual([
      { status: 'applied', version: 1 },
      { status: 'applied', version: 1 },
    ]);
  });
  it('copies usable defaults, changes only daily places and preserves references after deactivation', async () => {
    const id = await student(),
      locations = places();
    const group = await locations.create(actor, 'group', {
      name: 'Coleta',
      direction: 'pickup',
    });
    catalogIds.push(group.id);
    const dropGroup = await locations.create(actor, 'group', {
      name: 'Distribuição',
      direction: 'dropoff',
    });
    catalogIds.push(dropGroup.id);
    const region = await locations.create(actor, 'region', {
      name: 'Área sintética',
      groupId: dropGroup.id,
    });
    catalogIds.push(region.id);
    const point = await locations.create(actor, 'point', {
      name: 'Padrão',
      address: 'Rua sintética',
      groupId: group.id,
    });
    catalogIds.push(point.id);
    const alternate = await locations.create(actor, 'point', {
      name: 'Alternativo',
      address: 'Outra rua sintética',
      groupId: group.id,
    });
    catalogIds.push(alternate.id);
    await locations.setDefault(actor, id, 'pickup', {
      pointId: point.id,
      source: 'initial',
      evidence: 'Cadastro sintético',
      expectedVersion: 0,
    });
    const validated = new LocationService(store, {
      validate: () =>
        Promise.resolve({
          status: 'inside',
          provider,
          key: randomUUID(),
          label: 'Casa sintética',
          regionId: region.id,
          evidence: 'Validação simulada',
        }),
    });
    const back = await validated.setDefault(actor, id, 'dropoff', {
      address: 'Casa sintética',
      source: 'initial',
      evidence: 'Cadastro sintético',
      expectedVersion: 0,
    });
    const initial = await service.receive(id, randomUUID());
    await service.apply(id, initial.id, { kind: 'going' });
    expect(await service.today(actor, id)).toMatchObject({
      journey: { pointId: point.id, locationId: back.locationId },
      needsAdjustment: false,
    });
    const daily = await service.receive(id, randomUUID());
    await service.apply(id, daily.id, {
      kind: 'places',
      pointId: alternate.id,
    });
    expect(await service.today(actor, id)).toMatchObject({
      journey: { pointId: alternate.id },
      needsAdjustment: false,
    });
    expect(await locations.defaults(actor, id)).toMatchObject({
      pickup: { value: { pointId: point.id } },
    });
    const invalid = await service.receive(id, randomUUID());
    expect(
      await service.apply(id, invalid.id, {
        kind: 'places',
        locationId: randomUUID(),
      }),
    ).toMatchObject({ status: 'rejected', code: 'LOCATION_INVALID' });
    expect(await service.today(actor, id)).toMatchObject({
      journey: { locationId: back.locationId, version: 2 },
    });
    await locations.update(actor, 'group', group.id, {
      name: 'Desativado',
      active: false,
      expectedVersion: 1,
    });
    expect(await service.today(actor, id)).toMatchObject({
      journey: { pointId: alternate.id },
      counts: { pickup: 1, dropoff: 1 },
      needsAdjustment: true,
      issues: expect.arrayContaining(['PICKUP_LOCATION_INVALID']) as unknown,
    });
    const inactive = await service.receive(id, randomUUID());
    expect(
      await service.apply(id, inactive.id, {
        kind: 'places',
        pointId: point.id,
      }),
    ).toMatchObject({ status: 'rejected', code: 'LOCATION_INVALID' });
  });
  it('preserves confirmations after inactivation, but rejects new confirmations', async () => {
    const id = await student();
    const first = await service.receive(id, randomUUID());
    await service.apply(id, first.id, { kind: 'only_pickup' });
    await source.query('UPDATE app.students SET active=false WHERE id=$1', [
      id,
    ]);
    expect(await service.today(actor, id)).toMatchObject({
      counts: { pickup: 1, dropoff: 0 },
      needsAdjustment: true,
      issues: expect.arrayContaining(['INACTIVE_STUDENT']) as unknown,
    });
    const next = await service.receive(id, randomUUID());
    expect(
      await service.apply(id, next.id, { kind: 'answer', dropoff: 'yes' }),
    ).toMatchObject({ status: 'rejected', code: 'INACTIVE_STUDENT' });
    const no = await service.receive(id, randomUUID());
    expect(await service.apply(id, no.id, { kind: 'not_going' })).toMatchObject(
      { status: 'applied' },
    );
    expect(await service.today(actor, id)).toMatchObject({
      counts: { pickup: 0, dropoff: 0 },
    });
  });
  it('flags changed university without moving the existing daily context', async () => {
    const id = await student(),
      first = await service.receive(id, randomUUID());
    await service.apply(id, first.id, { kind: 'going' });
    await source.query(
      "UPDATE app.students SET university_id='unidep' WHERE id=$1",
      [id],
    );
    const next = await service.receive(id, randomUUID());
    expect(await service.apply(id, next.id, { kind: 'going' })).toMatchObject({
      status: 'pending',
      code: 'CONTEXT_CHANGED',
    });
    expect(await service.today(actor, id)).toMatchObject({
      journey: { universityId: 'unimater' },
      issues: expect.arrayContaining(['CONTEXT_CHANGED']) as unknown,
    });
  });
  it('does not silently adopt a later default while processing a response for the other leg', async () => {
    const id = await student(),
      initial = await service.receive(id, randomUUID());
    await service.apply(id, initial.id, { kind: 'going' });
    const locations = places();
    const group = await locations.create(actor, 'group', {
      name: 'Novo padrão',
      direction: 'pickup',
    });
    catalogIds.push(group.id);
    const point = await locations.create(actor, 'point', {
      name: 'Novo ponto',
      address: 'Rua sintética',
      groupId: group.id,
    });
    catalogIds.push(point.id);
    await locations.setDefault(actor, id, 'pickup', {
      pointId: point.id,
      source: 'initial',
      evidence: 'Cadastro posterior',
      expectedVersion: 0,
    });
    await source.query('UPDATE app.students SET active=false WHERE id=$1', [
      id,
    ]);
    const reply = await service.receive(id, randomUUID());
    await service.apply(id, reply.id, { kind: 'answer', dropoff: 'no' });
    expect(await service.today(actor, id)).toMatchObject({
      journey: { pointId: null },
      counts: { pickup: 1, dropoff: 0 },
      needsAdjustment: true,
    });
  });
  it('rechecks calendar and contract in the application transaction, preserving previous demand', async () => {
    const id = await student();
    const first = await service.receive(id, randomUUID());
    await service.apply(id, first.id, { kind: 'only_pickup' });
    const next = await service.receive(id, randomUUID());
    try {
      await source.query(
        "UPDATE app.university_calendars SET days='{}' WHERE university_id='unimater'",
      );
      expect(
        await service.apply(id, next.id, { kind: 'answer', dropoff: 'yes' }),
      ).toMatchObject({ status: 'rejected', code: 'NO_OPERATION' });
      expect(await service.today(actor, id)).toMatchObject({
        counts: { pickup: 1, dropoff: 0 },
        issues: expect.arrayContaining(['NO_OPERATION']) as unknown,
      });
    } finally {
      await source.query(
        "UPDATE app.university_calendars SET days=ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE university_id='unimater'",
      );
    }
    const expired = await service.receive(id, randomUUID());
    await source.query(
      "UPDATE app.contracts SET end_date='2026-10-22' WHERE student_id=$1",
      [id],
    );
    expect(
      await service.apply(id, expired.id, { kind: 'answer', dropoff: 'yes' }),
    ).toMatchObject({ status: 'rejected', code: 'NO_VALID_CONTRACT' });
    expect(await service.today(actor, id)).toMatchObject({
      counts: { pickup: 1, dropoff: 0 },
    });
  });
  it('does not accept a receipt belonging to another student or a forged arrival time', async () => {
    const a = await student(),
      b = await student();
    const receipt = await service.receive(a, randomUUID());
    await expect(
      service.apply(b, receipt.id, { kind: 'going' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      service.apply(a, receipt.id, {
        kind: 'going',
        receivedAt: '2026-10-23T12:00:00Z',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(await service.today(actor, a)).toMatchObject({ journey: null });
    await expect(service.today(randomUUID(), a)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('keeps an undecided return unconfirmed until the closing executor runs and separates operational days', async () => {
    const id = await student();
    await source.query(
      'UPDATE app.students SET habitual_days=ARRAY[5]::smallint[] WHERE id=$1',
      [id],
    );
    const receipt = await service.receive(id, randomUUID());
    await service.apply(id, receipt.id, {
      kind: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    instant = '2026-10-23T21:00:00Z';
    expect(await service.today(actor, id)).toMatchObject({
      journey: { origin: 'habitual', dropoff: { state: 'indeciso' } },
      counts: { pickup: 1, dropoff: 0 },
    });
    instant = '2026-10-24T03:00:00Z';
    expect(await service.today(actor, id)).toMatchObject({
      journey: null,
      counts: { pickup: 0, dropoff: 0 },
    });
  });
});
