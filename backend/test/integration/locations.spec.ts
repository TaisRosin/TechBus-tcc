import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { LocationService } from '../../src/registry/application/location.service';
import { RegistryService } from '../../src/registry/application/registry.service';
import { MapsService } from '../../src/maps/maps.service';
import { GoogleMaps } from '../../src/maps/google-maps';
import { ItineraryService } from '../../src/itinerary/application/itinerary.service';
import { OperationService } from '../../src/operation/application/operation.service';
import { ConsultationService } from '../../src/operation/application/consultation.service';
import { SystemClock } from '../../src/shared/time/system-clock';

describe('Local places persisted in isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    other: PostgresRegistryStore,
    service: LocationService,
    second: LocationService;
  const actor = randomUUID(),
    ids: string[] = [],
    studentIds: string[] = [],
    provider = randomUUID();
  let validation: unknown = { status: 'indeterminate' };
  const create = async (
    kind: 'group' | 'region' | 'point' | 'dropoff',
    input: unknown,
  ) => {
    const r = await service.create(actor, kind, input);
    ids.push(r.id);
    return r;
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
    service = new LocationService(store, {
      validate: () => Promise.resolve(validation),
    });
    second = new LocationService(other, {
      validate: () => Promise.resolve(validation),
    });
  });
  afterAll(async () => {
    await store?.close();
    await other?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.student_place_defaults WHERE student_id=ANY($1::uuid[])',
        [studentIds],
      );
      await source.query(
        'DELETE FROM app.return_locations WHERE provider=$1 OR id=ANY($2::uuid[])',
        [provider, ids],
      );
      await source.query(
        'DELETE FROM app.boarding_points WHERE id=ANY($1::uuid[])',
        [ids],
      );
      await source.query(
        'DELETE FROM app.service_regions WHERE id=ANY($1::uuid[])',
        [ids],
      );
      await source.query(
        'DELETE FROM app.local_groups WHERE id=ANY($1::uuid[])',
        [ids],
      );
      await source.query(
        'DELETE FROM app.contracts WHERE student_id=ANY($1::uuid[])',
        [studentIds],
      );
      await source.query('DELETE FROM app.students WHERE id=ANY($1::uuid[])', [
        studentIds,
      ]);
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      await source.destroy();
    }
  });
  it('revalidates route order, pending stops and access before calling Google', async () => {
    const group = await create('group', { name: 'Mapa', direction: 'pickup' });
    const point = await create('point', {
      name: 'Parada',
      address: 'Rua A',
      groupId: group.id,
    });
    const last = await create('point', {
      name: 'Final',
      address: 'Rua B',
      groupId: group.id,
    });
    const middle = await create('point', {
      name: 'Meio vazio',
      address: 'Rua C',
      groupId: group.id,
    });
    const clock = new SystemClock();
    const operations = new OperationService(store, clock);
    const itineraries = new ItineraryService(
      store,
      clock,
      operations,
      new ConsultationService(store, clock, operations),
    );
    const google = new GoogleMaps('test');
    const route = jest.spyOn(google, 'route').mockResolvedValue({
      distanceMeters: 1000,
      durationSeconds: 100,
      polyline: 'encoded',
    });
    const maps = new MapsService(store, itineraries, google);
    const location = {
      placeId: 'google-place',
      lat: -26,
      lng: -52,
      address: 'Rua A',
      approximate: false,
    };
    const locations = [
      { ...location, pointId: point.id },
      { ...location, pointId: middle.id },
      { ...location, pointId: last.id },
    ];
    let view = await maps.points(actor, group.id, 'catalog');
    await expect(
      maps.route(actor, {
        groupId: group.id,
        mode: 'catalog',
        token: view.token,
        locations,
      }),
    ).rejects.toMatchObject({ code: 'ITINERARY_INCOMPLETE' });
    await itineraries.setOrder(actor, group.id, {
      expectedVersion: 0,
      stopIds: [point.id, middle.id, last.id],
    });
    await expect(
      maps.route(actor, {
        groupId: group.id,
        mode: 'catalog',
        token: view.token,
        locations,
      }),
    ).rejects.toMatchObject({ code: 'PREVIEW_CHANGED' });
    expect(
      (await maps.points(actor, group.id, 'today')).ordered.map((p) => p.id),
    ).toEqual([point.id, last.id]);
    view = await maps.points(actor, group.id, 'catalog');
    await expect(
      maps.route(actor, {
        groupId: group.id,
        mode: 'catalog',
        token: view.token,
        locations: [...locations].reverse(),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(route).not.toHaveBeenCalled();
    await expect(
      maps.route(actor, {
        groupId: group.id,
        mode: 'catalog',
        token: view.token,
        locations,
      }),
    ).resolves.toMatchObject({ distanceMeters: 1000 });
    route.mockImplementationOnce(async () => {
      await service.update(actor, 'point', point.id, {
        name: point.name,
        address: 'Rua alterada',
        groupId: group.id,
        active: true,
        expectedVersion: point.version,
      });
      return {
        distanceMeters: 1000,
        durationSeconds: 100,
        polyline: 'encoded',
      };
    });
    await expect(
      maps.route(actor, {
        groupId: group.id,
        mode: 'catalog',
        token: view.token,
        locations,
      }),
    ).rejects.toMatchObject({ code: 'PREVIEW_CHANGED' });
    await expect(
      maps.points(randomUUID(), 'direct', 'direct'),
    ).rejects.toBeDefined();
    const daily = await itineraries.preview(actor, group.id, {});
    jest.spyOn(itineraries, 'preview').mockResolvedValueOnce({
      ...daily,
      candidate: {
        ordered: [],
        pending: [{ id: randomUUID(), label: 'Local legado', studentIds: [] }],
      },
    });
    await expect(maps.points(actor, group.id, 'today')).rejects.toMatchObject({
      code: 'MAPS_POINT_UNAVAILABLE',
    });
    await source.query('DELETE FROM app.group_stop_orders WHERE group_id=$1', [
      group.id,
    ]);
  });
  it.each(['point', 'dropoff'] as const)(
    'preserves legacy text and identity when structuring a %s',
    async (kind) => {
      const group = await create('group', {
        name: 'Grupo endereço',
        direction: kind === 'point' ? 'pickup' : 'dropoff',
      });
      const original = 'Em frente à praça, portão antigo';
      const point = await create(kind, {
        name: 'Praça',
        groupId: group.id,
        address: original,
      });
      const addressDetails = {
        street: 'Praça central',
        number: '',
        noNumber: true,
        neighborhood: '',
        city: 'São Lourenço do Oeste',
        state: 'SC',
        country: 'BR',
        postalCode: '',
        complement: '',
      };
      const input = {
        name: point.name,
        groupId: group.id,
        addressDetails,
        stopReference: 'Lado da farmácia',
        active: true,
        expectedVersion: point.version,
      };
      await service.update(actor, kind, point.id, input);
      const saved = (await second.list(actor, kind, { limit: '100' })).find(
        (p) => p.id === point.id,
      );
      expect(saved).toMatchObject({
        id: point.id,
        legacyAddress: original,
        addressDetails,
        stopReference: 'Lado da farmácia',
        address: 'Praça central, s/n — São Lourenço do Oeste/SC — Brasil',
        version: 2,
      });
      await expect(
        second.update(actor, kind, point.id, input),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
      // An old client changing only the name must not erase the new fields.
      await service.update(actor, kind, point.id, {
        name: 'Praça renomeada',
        groupId: group.id,
        address: saved!.address,
        active: true,
        expectedVersion: 2,
      });
      expect(
        (await second.list(actor, kind, { limit: '100' })).find(
          (p) => p.id === point.id,
        ),
      ).toMatchObject({
        legacyAddress: original,
        addressDetails,
        stopReference: 'Lado da farmácia',
        version: 3,
      });
    },
  );

  it('creates company dropoff points without geography and preserves inactive default references', async () => {
    const group = await create('group', {
      name: 'Distribuição fixa',
      direction: 'dropoff',
    });
    const pickup = await create('group', {
      name: 'Coleta fixa',
      direction: 'pickup',
    });
    await expect(
      service.create(actor, 'dropoff', {
        name: 'Praça',
        address: 'Rua A',
        groupId: pickup.id,
      }),
    ).rejects.toMatchObject({ code: 'GROUP_DIRECTION_MISMATCH' });
    const point = await create('dropoff', {
      name: 'Praça',
      address: 'Rua A',
      groupId: group.id,
    });
    const created = await new RegistryService(store).createStudent(actor, {
      name: 'Aluno ponto fixo',
      phone: '+55469' + randomInt(10000000, 99999999),
      universityId: 'unimater',
      habitualDays: [],
      contract: { startDate: '2026-01-01', endDate: '2026-12-31' },
    });
    studentIds.push(created.student.id);
    const isolated = new LocationService(store, {
      validate: () => {
        throw new Error('GEOGRAPHY_MUST_NOT_RUN');
      },
    });
    await isolated.setDefault(actor, created.student.id, 'dropoff', {
      locationId: point.id,
      source: 'initial',
      evidence: 'Cadastro da equipe',
      expectedVersion: 0,
    });
    expect(
      (await isolated.defaults(actor, created.student.id)).dropoff.usable,
    ).toBe(true);
    const input = {
      name: point.name,
      address: point.address,
      groupId: group.id,
      active: false,
      expectedVersion: 1,
    };
    await isolated.update(actor, 'dropoff', point.id, input);
    await expect(
      isolated.update(actor, 'dropoff', point.id, input),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(
      (await isolated.defaults(actor, created.student.id)).dropoff,
    ).toMatchObject({ usable: false, value: { locationId: point.id } });
    await expect(
      isolated.setDefault(actor, created.student.id, 'dropoff', {
        locationId: point.id,
        source: 'request',
        evidence: 'Pedido',
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'LOCATION_INACTIVE' });
    expect(
      (await isolated.list(actor, 'dropoff')).some((p) => p.id === point.id),
    ).toBe(true);
  });
  it('keeps one correctly directed group per point/region and protects revisions', async () => {
    const pickup = await create('group', {
        name: 'Coleta sintética',
        direction: 'pickup',
      }),
      dropoff = await create('group', {
        name: 'Volta sintética',
        direction: 'dropoff',
      });
    await expect(
      service.create(actor, 'point', {
        name: 'Ponto',
        address: 'Referência sintética',
        groupId: dropoff.id,
      }),
    ).rejects.toMatchObject({ code: 'GROUP_DIRECTION_MISMATCH' });
    await expect(
      service.create(actor, 'region', { name: 'Região', groupId: pickup.id }),
    ).rejects.toMatchObject({ code: 'GROUP_DIRECTION_MISMATCH' });
    const point = await create('point', {
      name: 'Ponto',
      address: 'Referência sintética',
      groupId: pickup.id,
    });
    const region = await create('region', {
      name: 'Região',
      groupId: dropoff.id,
    });
    expect(
      (await second.list(actor, 'region', {})).find((r) => r.id === region.id),
    ).toEqual(region);
    expect(
      await service.update(actor, 'point', point.id, {
        name: 'Ponto corrigido',
        address: point.address,
        groupId: pickup.id,
        active: true,
        expectedVersion: 1,
      }),
    ).toMatchObject({ version: 2 });
    await expect(
      second.update(actor, 'point', point.id, {
        name: 'Antigo',
        address: point.address,
        groupId: pickup.id,
        active: true,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });
  it('accepts validated return identity without merging by spelling or assigning a route order', async () => {
    const group = await create('group', {
        name: 'Retorno',
        direction: 'dropoff',
      }),
      region = await create('region', {
        name: 'Região validada',
        groupId: group.id,
      });
    validation = {
      status: 'inside',
      provider,
      key: 'one',
      label: 'Rua sintética 10',
      regionId: region.id,
      evidence: 'fixture-area-1',
    };
    const a = await service.resolveReturn(actor, {
      address: 'Rua sintética, 10',
    });
    validation = {
      ...(validation as object),
      label: 'Outra grafia do mesmo local',
    };
    const b = await second.resolveReturn(actor, { address: 'R. sintética 10' });
    expect(b.location.id).toBe(a.location.id);
    expect(b.groupId).toBe(group.id);
    validation = { status: 'outside' };
    await expect(
      service.resolveReturn(actor, { address: 'Fora' }),
    ).rejects.toMatchObject({ code: 'OUTSIDE_SERVICE_AREA' });
    validation = { status: 'indeterminate' };
    await expect(
      service.resolveReturn(actor, { address: 'Ambíguo' }),
    ).rejects.toMatchObject({ code: 'GROUP_UNRESOLVED' });
    validation = {
      status: 'inside',
      provider,
      key: 'bad',
      label: 'Rua',
      regionId: randomUUID(),
      evidence: 'fixture',
    };
    await expect(
      service.resolveReturn(actor, { address: 'Sem região cadastrada' }),
    ).rejects.toMatchObject({ code: 'GROUP_UNRESOLVED' });
  });
  it('keeps independent defaults and preserves the last valid return after rejection', async () => {
    const registry = new RegistryService(store),
      created = await registry.createStudent(actor, {
        name: 'Aluna locais',
        phone: `+55469${randomInt(10000000, 99999999)}`,
        universityId: 'unimater',
        habitualDays: [],
        contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
      });
    studentIds.push(created.student.id);
    const pickup = await create('group', {
        name: 'Coleta padrões',
        direction: 'pickup',
      }),
      dropoff = await create('group', {
        name: 'Volta padrões',
        direction: 'dropoff',
      });
    const point = await create('point', {
        name: 'Ponto padrões',
        address: 'Referência',
        groupId: pickup.id,
      }),
      region = await create('region', {
        name: 'Região padrões',
        groupId: dropoff.id,
      });
    const initial = await service.setDefault(
      actor,
      created.student.id,
      'pickup',
      {
        pointId: point.id,
        source: 'initial',
        evidence: 'Cadastro pela equipe',
        expectedVersion: 0,
      },
    );
    validation = {
      status: 'inside',
      provider,
      key: 'default-one',
      label: 'Rua padrão',
      regionId: region.id,
      evidence: 'Área sintética',
    };
    const original = await service.setDefault(
      actor,
      created.student.id,
      'dropoff',
      {
        address: 'Rua padrão',
        source: 'initial',
        evidence: 'Cadastro pela equipe',
        expectedVersion: 0,
      },
    );
    validation = { status: 'outside' };
    await expect(
      service.setDefault(actor, created.student.id, 'dropoff', {
        address: 'Fora',
        source: 'request',
        evidence: 'Pedido sintético',
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'OUTSIDE_SERVICE_AREA' });
    expect(await second.defaults(actor, created.student.id)).toMatchObject({
      pickup: { value: initial, usable: true },
      dropoff: { value: original, usable: true },
      needsAdjustment: false,
    });
    await expect(
      service.setDefault(actor, created.student.id, 'pickup', {
        pointId: point.id,
        source: 'initial',
        evidence: 'Tentativa de substituir inicial',
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' });
    expect(
      await service.setDefault(actor, created.student.id, 'pickup', {
        pointId: point.id,
        source: 'consent',
        evidence: 'Aceite sintético',
        expectedVersion: 1,
      }),
    ).toMatchObject({ version: 2, source: 'consent' });
    await expect(
      second.setDefault(actor, created.student.id, 'pickup', {
        pointId: point.id,
        source: 'request',
        evidence: 'Antigo',
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });
  it('preserves referenced defaults when point or region becomes inactive', async () => {
    const registry = new RegistryService(store),
      created = await registry.createStudent(actor, {
        name: 'Desativação sintética',
        phone: `+55469${randomInt(10000000, 99999999)}`,
        universityId: 'unidep',
        habitualDays: [],
        contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
      });
    studentIds.push(created.student.id);
    const pickup = await create('group', {
        name: 'Coleta desativação',
        direction: 'pickup',
      }),
      dropoff = await create('group', {
        name: 'Volta desativação',
        direction: 'dropoff',
      });
    const point = await create('point', {
        name: 'Ponto desativação',
        address: 'Local',
        groupId: pickup.id,
      }),
      region = await create('region', {
        name: 'Região desativação',
        groupId: dropoff.id,
      });
    const first = await service.setDefault(
      actor,
      created.student.id,
      'pickup',
      {
        pointId: point.id,
        source: 'initial',
        evidence: 'Cadastro',
        expectedVersion: 0,
      },
    );
    validation = {
      status: 'inside',
      provider,
      key: 'deactivation',
      label: 'Casa',
      regionId: region.id,
      evidence: 'Área',
    };
    const back = await service.setDefault(
      actor,
      created.student.id,
      'dropoff',
      {
        address: 'Casa',
        source: 'initial',
        evidence: 'Cadastro',
        expectedVersion: 0,
      },
    );
    await service.update(actor, 'point', point.id, {
      name: point.name,
      address: point.address,
      groupId: pickup.id,
      active: false,
      expectedVersion: 1,
    });
    await service.update(actor, 'region', region.id, {
      name: region.name,
      groupId: dropoff.id,
      active: false,
      expectedVersion: 1,
    });
    expect(await second.defaults(actor, created.student.id)).toMatchObject({
      pickup: { value: first, usable: false, issue: 'LOCATION_INACTIVE' },
      dropoff: { value: back, usable: false, issue: 'LOCATION_INACTIVE' },
      needsAdjustment: true,
    });
    await expect(service.validatePickup(point.id)).rejects.toMatchObject({
      code: 'LOCATION_INACTIVE',
    });
    await expect(
      service.resolveReturn(actor, { address: 'Casa' }),
    ).rejects.toMatchObject({ code: 'LOCATION_INACTIVE' });
    expect(await registry.student(actor, created.student.id)).toEqual(
      created.student,
    );
  });
  it('serializes revision changes and cannot create a point under an inactive group', async () => {
    const group = await create('group', {
      name: 'Concorrência',
      direction: 'pickup',
    });
    const results = await Promise.allSettled([
      service.update(actor, 'group', group.id, {
        name: 'A',
        active: false,
        expectedVersion: 1,
      }),
      second.update(actor, 'group', group.id, {
        name: 'B',
        active: false,
        expectedVersion: 1,
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'VERSION_CONFLICT' },
    });
    await expect(
      service.create(actor, 'point', {
        name: 'Novo',
        address: 'Rua',
        groupId: group.id,
      }),
    ).rejects.toMatchObject({ code: 'LOCATION_INACTIVE' });
  });
  it('revalidates the actor after address validation and does not persist a revoked command', async () => {
    const group = await create('group', {
        name: 'Revalidação',
        direction: 'dropoff',
      }),
      region = await create('region', {
        name: 'Região revalidação',
        groupId: group.id,
      });
    const delayed = new LocationService(store, {
      validate: async () => {
        await source.query(
          'UPDATE app.team_users SET active=false WHERE id=$1',
          [actor],
        );
        return {
          status: 'inside',
          provider,
          key: 'revoked',
          label: 'Casa',
          regionId: region.id,
          evidence: 'Área',
        };
      },
    });
    try {
      await expect(
        delayed.resolveReturn(actor, { address: 'Casa' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    } finally {
      await source.query('UPDATE app.team_users SET active=true WHERE id=$1', [
        actor,
      ]);
    }
    const rows = await source.query<{ id: string }[]>(
      'SELECT id FROM app.return_locations WHERE provider=$1 AND external_key=$2',
      [provider, 'revoked'],
    );
    expect(rows).toHaveLength(0);
  });
  it('allows only one concurrent initial default and preserves it on unavailable validation', async () => {
    const created = await new RegistryService(store).createStudent(actor, {
      name: 'Concorrência padrões',
      phone: `+55469${randomInt(10000000, 99999999)}`,
      universityId: 'unimater',
      habitualDays: [],
      contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
    });
    studentIds.push(created.student.id);
    const group = await create('group', {
        name: 'Coleta concorrente',
        direction: 'pickup',
      }),
      point = await create('point', {
        name: 'Ponto concorrente',
        address: 'Rua',
        groupId: group.id,
      });
    const command = {
      pointId: point.id,
      source: 'initial',
      evidence: 'Cadastro',
      expectedVersion: 0,
    };
    const results = await Promise.allSettled([
      service.setDefault(actor, created.student.id, 'pickup', command),
      second.setDefault(actor, created.student.id, 'pickup', command),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'VERSION_CONFLICT' },
    });
    const before = await service.defaults(actor, created.student.id);
    const unavailable = new LocationService(store, {
      validate: () => Promise.reject(new Error('Internal provider detail')),
    });
    await expect(
      unavailable.setDefault(actor, created.student.id, 'dropoff', {
        address: 'Casa',
        source: 'initial',
        evidence: 'Cadastro',
        expectedVersion: 0,
      }),
    ).rejects.toMatchObject({
      code: 'ADDRESS_VALIDATION_UNAVAILABLE',
      message: 'ADDRESS_VALIDATION_UNAVAILABLE',
    });
    expect(await second.defaults(actor, created.student.id)).toEqual(before);
  });
  it('rechecks region activation after validation instead of accepting a stale result', async () => {
    const group = await create('group', {
        name: 'Volta corrida',
        direction: 'dropoff',
      }),
      region = await create('region', {
        name: 'Região corrida',
        groupId: group.id,
      });
    const delayed = new LocationService(store, {
      validate: async () => {
        await second.update(actor, 'region', region.id, {
          name: region.name,
          groupId: group.id,
          active: false,
          expectedVersion: 1,
        });
        return {
          status: 'inside',
          provider,
          key: 'stale-region',
          label: 'Casa',
          regionId: region.id,
          evidence: 'Antes da desativação',
        };
      },
    });
    await expect(
      delayed.resolveReturn(actor, { address: 'Casa' }),
    ).rejects.toMatchObject({ code: 'LOCATION_INACTIVE' });
    expect(
      await source.query(
        'SELECT id FROM app.return_locations WHERE provider=$1 AND external_key=$2',
        [provider, 'stale-region'],
      ),
    ).toHaveLength(0);
  });
});
