import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { RegistryService } from '../../src/registry/application/registry.service';
import { JourneyService } from '../../src/journey/application/journey.service';
import { LocationService } from '../../src/registry/application/location.service';

describe('Closing and cancellation in isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    second: PostgresRegistryStore;
  let service: JourneyService;
  let instant = '2026-10-24T19:59:59.000Z';
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
    instant = '2026-10-24T19:59:59.000Z';
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
  it('closes at 17h, records origin and preserves counts without a return location', async () => {
    const id = await student(),
      receipt = await service.receive(id, randomUUID());
    await service.apply(id, receipt.id, {
      kind: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    await expect(service.close(id, '2026-10-24')).rejects.toMatchObject({
      code: 'CLOSURE_NOT_DUE',
    });
    instant = '2026-10-24T20:00:00Z';
    const closed = await service.close(id, '2026-10-24');
    expect(closed.journey).toMatchObject({
      dropoff: { state: 'confirmado', origin: 'padrao_fechamento' },
    });
    expect(await service.close(id, '2026-10-24')).toEqual(closed);
    expect(await service.today(actor, id)).toMatchObject({
      counts: { pickup: 1, dropoff: 1 },
      needsAdjustment: true,
    });
  });
  it.each(['inactive', 'contract', 'calendar'] as const)(
    'blocks new default after losing %s eligibility and does not retry it silently',
    async (reason) => {
      const id = await student(),
        receipt = await service.receive(id, randomUUID());
      await service.apply(id, receipt.id, {
        kind: 'answer',
        pickup: 'yes',
        dropoff: 'unsure',
      });
      if (reason === 'inactive')
        await source.query('UPDATE app.students SET active=false WHERE id=$1', [
          id,
        ]);
      if (reason === 'contract')
        await source.query(
          "UPDATE app.contracts SET end_date='2026-10-23' WHERE student_id=$1",
          [id],
        );
      if (reason === 'calendar')
        await source.query(
          "UPDATE app.university_calendars SET days='{}' WHERE university_id='unimater'",
        );
      instant = '2026-10-24T20:00:00Z';
      try {
        const closed = await service.close(id, '2026-10-24');
        expect(closed.journey).toMatchObject({
          pickup: { state: 'confirmado' },
          dropoff: { state: 'indeciso' },
          closureIssue: {
            inactive: 'INACTIVE_STUDENT',
            contract: 'NO_VALID_CONTRACT',
            calendar: 'NO_OPERATION',
          }[reason],
        });
        expect((await service.today(actor, id)).needsAdjustment).toBe(true);
        await source.query('UPDATE app.students SET active=true WHERE id=$1', [
          id,
        ]);
        await source.query(
          "UPDATE app.contracts SET end_date='2026-12-31' WHERE student_id=$1",
          [id],
        );
        await source.query(
          "UPDATE app.university_calendars SET days=ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE university_id='unimater'",
        );
        expect(await service.close(id, '2026-10-24')).toEqual(closed);
      } finally {
        await source.query(
          "UPDATE app.university_calendars SET days=ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE university_id='unimater'",
        );
      }
    },
  );
  it.each(['going', 'only_dropoff', 'uncertain'] as const)(
    'cancels a confirmed return from %s and never changes outbound',
    async (kind) => {
      const id = await student(),
        receipt = await service.receive(id, randomUUID());
      await service.apply(
        id,
        receipt.id,
        kind === 'uncertain'
          ? { kind: 'answer', pickup: 'yes', dropoff: 'unsure' }
          : { kind },
      );
      instant = '2026-10-24T20:00:00Z';
      const cancel = await service.receive(id, randomUUID());
      expect(
        await service.apply(id, cancel.id, { kind: 'cancel_return' }),
      ).toMatchObject({ status: 'applied' });
      const view = await service.today(actor, id);
      expect(view.journey?.dropoff.state).toBe('cancelado');
      expect(view.counts).toEqual({
        pickup: kind === 'only_dropoff' ? 0 : 1,
        dropoff: 0,
      });
      const version = view.journey?.version;
      await service.apply(id, cancel.id, { kind: 'cancel_return' });
      await service.close(id, '2026-10-24');
      expect((await service.today(actor, id)).journey?.version).toBe(version);
    },
  );
  it('enforces exact cancellation bounds using durable receipt and allows withdrawal after inactivation', async () => {
    const id = await student(),
      receipt = await service.receive(id, randomUUID());
    await service.apply(id, receipt.id, { kind: 'going' });
    const early = await service.receive(id, randomUUID());
    expect(
      await service.apply(id, early.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'rejected', code: 'CANCEL_WINDOW_NOT_OPEN' });
    instant = '2026-10-25T00:59:59.999Z';
    const timely = await service.receive(id, randomUUID());
    instant = '2026-10-25T01:00:00.000Z';
    const late = await service.receive(id, randomUUID());
    expect(
      await service.apply(id, late.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'rejected', code: 'DEADLINE_PASSED' });
    await source.query('UPDATE app.students SET active=false WHERE id=$1', [
      id,
    ]);
    instant = '2026-10-25T01:05:00Z';
    expect(
      await service.apply(id, timely.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'applied' });
    expect((await service.today(actor, id)).counts).toEqual({
      pickup: 1,
      dropoff: 0,
    });
  });
  it('never cancels an unconfirmed return or accepts ordinary late changes', async () => {
    const id = await student();
    instant = '2026-10-24T20:00:00Z';
    const cancel = await service.receive(id, randomUUID());
    expect(
      await service.apply(id, cancel.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'rejected', code: 'RETURN_NOT_CONFIRMED' });
    const ordinary = await service.receive(id, randomUUID());
    expect(
      await service.apply(id, ordinary.id, { kind: 'going' }),
    ).toMatchObject({ status: 'rejected', code: 'DEADLINE_PASSED' });
    expect((await service.close(id, '2026-10-24')).journey).toBeNull();
  });
  it('reconciles timely refusal or outbound uncertainty after default without treating default as explicit', async () => {
    for (const command of [
      { kind: 'only_pickup' },
      { kind: 'answer', pickup: 'unsure' },
    ]) {
      const id = await student(),
        first = await service.receive(id, randomUUID());
      await service.apply(id, first.id, {
        kind: 'answer',
        pickup: 'yes',
        dropoff: 'unsure',
      });
      const timely = await service.receive(id, randomUUID());
      instant = '2026-10-24T20:05:00Z';
      await service.close(id, '2026-10-24');
      await service.apply(id, timely.id, command);
      const view = await service.today(actor, id);
      expect(view.counts).toEqual({
        pickup: command.kind === 'only_pickup' ? 1 : 0,
        dropoff: 0,
      });
      expect(view.journey?.dropoff.state).toBe(
        command.kind === 'only_pickup' ? 'recusado' : 'indeciso',
      );
      await service.close(id, '2026-10-24');
      expect((await service.today(actor, id)).counts).toEqual(view.counts);
      instant = '2026-10-24T19:59:59Z';
    }
  });
  it('closes an undecided timely response even when interpretation is after the executor', async () => {
    const id = await student(),
      pending = await service.receive(id, randomUUID());
    instant = '2026-10-24T20:05:00Z';
    const before = await service.close(id, '2026-10-24');
    expect(before.journey).toBeNull();
    expect(before.pending).toContain('INTERPRETATION_PENDING');
    await service.apply(id, pending.id, {
      kind: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    expect((await service.today(actor, id)).journey?.dropoff).toEqual({
      state: 'confirmado',
      origin: 'padrao_fechamento',
    });
  });
  it('does not lose a cancellation that depends on a pending timely confirmation', async () => {
    const id = await student(),
      initial = await service.receive(id, randomUUID());
    instant = '2026-10-24T20:05:00Z';
    const cancel = await service.receive(id, randomUUID());
    expect(
      await service.apply(id, cancel.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'pending', code: 'AWAITING_TIMELY_COMMAND' });
    await service.apply(id, initial.id, {
      kind: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    expect((await service.today(actor, id)).counts).toEqual({
      pickup: 1,
      dropoff: 0,
    });
    expect((await service.today(actor, id)).journey?.dropoff.state).toBe(
      'cancelado',
    );
    expect(
      await service.apply(id, cancel.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'applied' });
  });
  it('applies the older outbound information without restoring a later cancelled return', async () => {
    const id = await student(),
      first = await service.receive(id, randomUUID());
    await service.apply(id, first.id, { kind: 'going' });
    const ordinary = await service.receive(id, randomUUID());
    instant = '2026-10-24T20:10:00Z';
    const cancel = await service.receive(id, randomUUID());
    await service.apply(id, cancel.id, { kind: 'cancel_return' });
    await service.apply(id, ordinary.id, { kind: 'only_dropoff' });
    expect((await service.today(actor, id)).counts).toEqual({
      pickup: 0,
      dropoff: 0,
    });
    expect((await service.today(actor, id)).journey?.dropoff.state).toBe(
      'cancelado',
    );
  });
  it('settles a waiting cancellation as rejected when the pending reply is a refusal', async () => {
    const id = await student(),
      pending = await service.receive(id, randomUUID());
    instant = '2026-10-24T20:00:00Z';
    const cancel = await service.receive(id, randomUUID());
    await service.apply(id, cancel.id, { kind: 'cancel_return' });
    await service.apply(id, pending.id, { kind: 'not_going' });
    expect(
      await service.apply(id, cancel.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'rejected', code: 'RETURN_NOT_CONFIRMED' });
    expect((await service.today(actor, id)).counts).toEqual({
      pickup: 0,
      dropoff: 0,
    });
  });
  it('serializes closing, interpretation and cancellation across independent connections', async () => {
    const id = await student(),
      first = await service.receive(id, randomUUID());
    await service.apply(id, first.id, {
      kind: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    const change = await service.receive(id, randomUUID());
    instant = '2026-10-24T20:00:00Z';
    const cancel = await service.receive(id, randomUUID()),
      other = new JourneyService(second, clock);
    await Promise.all([
      service.close(id, '2026-10-24'),
      other.apply(id, change.id, { kind: 'answer', pickup: 'no' }),
      service.apply(id, cancel.id, { kind: 'cancel_return' }),
    ]);
    // If withdrawal of outbound wins first, no return was confirmed to cancel.
    // In every ordering neither leg remains in demand; no repeated closure resurrects it.
    expect((await service.today(actor, id)).counts).toEqual({
      pickup: 0,
      dropoff: 0,
    });
    await Promise.all([
      service.close(id, '2026-10-24'),
      other.close(id, '2026-10-24'),
    ]);
    expect((await service.today(actor, id)).counts).toEqual({
      pickup: 0,
      dropoff: 0,
    });
  });
  it('keeps uncertain-order cancellation pending without removing a confirmed return', async () => {
    const id = await student(),
      first = await service.receive(id, randomUUID());
    await service.apply(id, first.id, { kind: 'going' });
    instant = '2026-10-24T20:00:00Z';
    const uncertain = await service.receive(id, randomUUID(), 'uncertain');
    expect(
      await service.apply(id, uncertain.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'pending', code: 'ORDER_UNCERTAIN' });
    expect((await service.today(actor, id)).counts).toEqual({
      pickup: 1,
      dropoff: 1,
    });
  });
  it('closes bounded pages including students with only pending receipts, without creating silence confirmations', async () => {
    const withReply = await student(),
      receipt = await service.receive(withReply, randomUUID());
    await service.apply(withReply, receipt.id, { kind: 'only_pickup' });
    const withoutReply = await student();
    await service.receive(withoutReply, randomUUID());
    const noReceipt = await student();
    instant = '2026-10-24T20:00:00Z';
    const visited: string[] = [];
    let cursor: string | undefined;
    do {
      const batch = await service.closeDay('2026-10-24', cursor, 2);
      expect(batch.results.length).toBeLessThanOrEqual(2);
      visited.push(...batch.results.map((r) => r.studentId));
      cursor = batch.nextCursor ?? undefined;
    } while (cursor);
    expect(visited).toContain(withReply);
    expect(visited).toContain(withoutReply);
    expect(visited).not.toContain(noReceipt);
    expect(new Set(visited).size).toBe(visited.length);
    expect((await service.today(actor, withoutReply)).journey).toBeNull();
    await expect(
      service.closeDay('2026-10-24', undefined, 101),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('uses a valid return default, preserves it after deactivation and never adopts inactive defaults', async () => {
    const id = await student(),
      otherId = await student(),
      locations = places();
    const group = await locations.create(actor, 'group', {
      name: 'Retorno B08',
      direction: 'dropoff',
    });
    catalogIds.push(group.id);
    const region = await locations.create(actor, 'region', {
      name: 'Região sintética B08',
      groupId: group.id,
    });
    catalogIds.push(region.id);
    const validated = new LocationService(store, {
      validate: () =>
        Promise.resolve({
          status: 'inside',
          provider,
          key: 'closing-default',
          label: 'Rua sintética',
          regionId: region.id,
          evidence: 'Área simulada',
        }),
    });
    const back = await validated.setDefault(actor, id, 'dropoff', {
      address: 'Rua sintética',
      source: 'initial',
      evidence: 'Cadastro',
      expectedVersion: 0,
    });
    await validated.setDefault(actor, otherId, 'dropoff', {
      address: 'Rua sintética',
      source: 'initial',
      evidence: 'Cadastro',
      expectedVersion: 0,
    });
    for (const value of [id, otherId]) {
      const receipt = await service.receive(value, randomUUID());
      await service.apply(value, receipt.id, {
        kind: 'answer',
        pickup: 'yes',
        dropoff: 'unsure',
      });
    }
    instant = '2026-10-24T20:00:00Z';
    expect((await service.close(id, '2026-10-24')).journey?.locationId).toBe(
      back.locationId,
    );
    await locations.update(actor, 'group', group.id, {
      name: group.name,
      active: false,
      expectedVersion: 1,
    });
    expect((await service.close(otherId, '2026-10-24')).journey).toMatchObject({
      dropoff: { state: 'confirmado' },
      locationId: null,
    });
    expect((await service.today(actor, id)).issues).toContain(
      'DROPOFF_LOCATION_INVALID',
    );
    expect((await service.today(actor, id)).counts.dropoff).toBe(1);
    expect(
      (await locations.defaults(actor, id)).dropoff.value?.locationId,
    ).toBe(back.locationId);
  });
  it('keeps the first pending cancellation intent when the same receipt is reinterpreted', async () => {
    const id = await student(),
      initial = await service.receive(id, randomUUID());
    instant = '2026-10-24T20:05:00Z';
    const cancel = await service.receive(id, randomUUID());
    const pending = await service.apply(id, cancel.id, {
      kind: 'cancel_return',
    });
    expect(await service.apply(id, cancel.id, { kind: 'going' })).toEqual(
      pending,
    );
    await service.apply(id, initial.id, { kind: 'going' });
    expect((await service.today(actor, id)).journey?.dropoff.state).toBe(
      'cancelado',
    );
  });
  it('honors a cancellation interpreted after midnight without exposing past journeys over today', async () => {
    const id = await student(),
      first = await service.receive(id, randomUUID());
    await service.apply(id, first.id, { kind: 'going' });
    instant = '2026-10-25T00:59:59Z';
    const cancel = await service.receive(id, randomUUID());
    instant = '2026-10-25T04:00:00Z';
    expect(
      await service.apply(id, cancel.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'applied' });
    expect((await service.today(actor, id)).journey).toBeNull();
    expect((await service.close(id, '2026-10-24')).journey?.dropoff.state).toBe(
      'cancelado',
    );
  });
});
