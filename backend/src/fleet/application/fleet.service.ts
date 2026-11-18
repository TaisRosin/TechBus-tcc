import { randomUUID } from 'node:crypto';
import { AccessError } from '../../access/domain/access';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../registry/application/ports';
import {
  exact,
  invalid,
  normalizePhone,
  revision,
  uuid,
} from '../../registry/domain/registry';
import { page, textField } from '../../registry/domain/locations';
import type { Vehicle, Driver } from './ports';
import {
  parseWeek,
  parseAvailable,
  parseProposal,
  type ProposedTrip,
} from '../domain/fleet';
import { calendarDate } from '../../registry/domain/calendar';
export class FleetService {
  constructor(private readonly store: RegistryStore) {}
  async evaluate(actor: string, input: unknown) {
    const { date, trips } = parseProposal(input);
    return this.run(actor, async (tx) => {
      await tx.places.lock();
      return this.evaluateInTransaction(tx, date, trips);
    });
  }
  async evaluateInTransaction(
    tx: RegistryTransaction,
    date: string,
    trips: ProposedTrip[],
  ) {
    const vehicles = new Map<string, Vehicle | null>(),
      drivers = new Map<string, Driver | null>();
    for (const id of [...new Set(trips.map((t) => t.vehicleId))].sort())
      vehicles.set(id, await tx.fleet.vehicle(id));
    for (const id of [
      ...new Set(trips.flatMap((t) => t.legs.map((l) => l.driverId))),
    ].sort())
      drivers.set(id, await tx.fleet.driver(id));
    const issues: { index: number; code: string }[] = [];
    for (let index = 0; index < trips.length; index++) {
      const t = trips[index],
        v = vehicles.get(t.vehicleId),
        add = (code: string) => issues.push({ index, code });
      if (!v) add('VEHICLE_NOT_FOUND');
      else if (!v.active) add('VEHICLE_INACTIVE');
      else {
        const exception = (await tx.fleet.exceptions(v.id, date, date))[0];
        const available =
          exception?.available ??
          v.week?.[new Date(`${date}T12:00:00Z`).getUTCDay()];
        if (available === undefined) add('AVAILABILITY_NOT_CONFIGURED');
        else if (!available) add('VEHICLE_UNAVAILABLE');
      }
      for (const id of new Set(t.legs.map((l) => l.driverId))) {
        const d = drivers.get(id);
        if (!d) add('DRIVER_NOT_FOUND');
        else if (!d.active) add('DRIVER_INACTIVE');
      }
      if (t.groupId) {
        const group = await tx.places.get('group', t.groupId);
        if (
          !group?.active ||
          group.direction !== (t.stage === 'collection' ? 'pickup' : 'dropoff')
        )
          add('GROUP_INVALID');
      }
      const earlier = trips.slice(0, index);
      if (
        earlier.some((p) => p.vehicleId === t.vehicleId && p.stage === t.stage)
      )
        add('VEHICLE_STAGE_CONFLICT');
      if (
        earlier.some(
          (p) =>
            p.stage === t.stage &&
            p.legs.some(
              (a, legIndex) => a.driverId === t.legs[legIndex]?.driverId,
            ),
        )
      )
        add('DRIVER_STAGE_CONFLICT');
    }
    return { eligible: issues.length === 0, issues };
  }
  private async required(tx: RegistryTransaction, id: string) {
    const v = await tx.fleet.vehicle(uuid(id));
    if (!v) throw new AccessError('NOT_FOUND', 404);
    return v;
  }
  async availability(actor: string, id: string) {
    uuid(id);
    return this.run(actor, async (tx) => {
      const v = await this.required(tx, id);
      return { vehicleId: id, version: v.version, week: v.week };
    });
  }
  async setWeek(actor: string, id: string, input: unknown) {
    uuid(id);
    const v = exact(input, ['week', 'expectedVersion']),
      week = parseWeek(v.week),
      version = revision(v.expectedVersion);
    return this.run(actor, async (tx) => {
      const old = await this.required(tx, id);
      if (old.version !== version)
        throw new AccessError('VERSION_CONFLICT', 409);
      old.week = week;
      old.version++;
      await tx.fleet.saveVehicle(old, false);
      return { vehicleId: id, version: old.version, week };
    });
  }
  async setException(actor: string, id: string, date: string, input: unknown) {
    uuid(id);
    calendarDate(date);
    const v = exact(input, ['available', 'expectedVersion']),
      available = parseAvailable(v.available),
      version = revision(v.expectedVersion);
    return this.run(actor, async (tx) => {
      const old = await this.required(tx, id);
      if (old.version !== version)
        throw new AccessError('VERSION_CONFLICT', 409);
      await tx.fleet.saveException(id, date, available);
      old.version++;
      await tx.fleet.saveVehicle(old, false);
      return { vehicleId: id, date, available, version: old.version };
    });
  }
  async exceptions(actor: string, id: string, input: unknown) {
    uuid(id);
    const v = exact(input, ['from', 'to']),
      from = calendarDate(v.from),
      to = calendarDate(v.to);
    if (from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 365)
      return invalid();
    return this.run(actor, async (tx) => {
      await this.required(tx, id);
      return tx.fleet.exceptions(id, from, to);
    });
  }
  private run<T>(actor: string, work: (tx: RegistryTransaction) => Promise<T>) {
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      return work(tx);
    });
  }
  listVehicles(actor: string, query: unknown = {}) {
    const p = page(query);
    return this.run(actor, (tx) => tx.fleet.vehicles(p.limit, p.offset));
  }
  listDrivers(actor: string, query: unknown = {}) {
    const p = page(query);
    return this.run(actor, (tx) => tx.fleet.drivers(p.limit, p.offset));
  }
  private vehicleFields(v: Record<string, unknown>) {
    const identifier = textField(v.identifier, 100).toUpperCase(),
      plate = textField(v.plate, 40).replace(/[\s-]/g, '').toUpperCase();
    if (
      !/^[A-Z0-9]{1,20}$/.test(plate) ||
      !['van', 'micro', 'bus'].includes(v.kind as string) ||
      typeof v.seats !== 'number' ||
      !Number.isInteger(v.seats) ||
      v.seats < 1 ||
      v.seats > 2147483647
    )
      return invalid();
    return {
      identifier,
      plate,
      kind: v.kind as Vehicle['kind'],
      seats: v.seats,
    };
  }
  async createVehicle(actor: string, input: unknown) {
    const fields = this.vehicleFields(
      exact(input, ['identifier', 'plate', 'kind', 'seats']),
    );
    return this.run(actor, async (tx) => {
      const value: Vehicle = {
        id: randomUUID(),
        ...fields,
        active: true,
        version: 1,
        week: null,
      };
      await tx.fleet.saveVehicle(value, true);
      return value;
    });
  }
  async updateVehicle(actor: string, id: string, input: unknown) {
    uuid(id);
    const v = exact(input, [
        'identifier',
        'plate',
        'kind',
        'seats',
        'active',
        'expectedVersion',
      ]),
      fields = this.vehicleFields(v),
      version = revision(v.expectedVersion);
    if (typeof v.active !== 'boolean') return invalid();
    const active = v.active;
    return this.run(actor, async (tx) => {
      const old = await tx.fleet.vehicle(id);
      if (!old) throw new AccessError('NOT_FOUND', 404);
      if (old.version !== version)
        throw new AccessError('VERSION_CONFLICT', 409);
      const value = { ...old, ...fields, active, version: old.version + 1 };
      await tx.fleet.saveVehicle(value, false);
      return value;
    });
  }
  async createDriver(actor: string, input: unknown) {
    const v = exact(input, ['name', 'phone']),
      name = textField(v.name, 200),
      phone = normalizePhone(v.phone);
    return this.run(actor, async (tx) => {
      const value = { id: randomUUID(), name, phone, active: true, version: 1 };
      await tx.fleet.saveDriver(value, true);
      return value;
    });
  }
  async updateDriver(actor: string, id: string, input: unknown) {
    uuid(id);
    const v = exact(input, ['name', 'phone', 'active', 'expectedVersion']),
      name = textField(v.name, 200),
      phone = normalizePhone(v.phone),
      version = revision(v.expectedVersion);
    if (typeof v.active !== 'boolean') return invalid();
    const active = v.active;
    return this.run(actor, async (tx) => {
      const old = await tx.fleet.driver(id);
      if (!old) throw new AccessError('NOT_FOUND', 404);
      if (old.version !== version)
        throw new AccessError('VERSION_CONFLICT', 409);
      const value = { ...old, name, phone, active, version: old.version + 1 };
      await tx.fleet.saveDriver(value, false);
      return value;
    });
  }
}
