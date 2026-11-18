import { returnItem } from './return-item';
import { randomUUID } from 'node:crypto';
import { AccessError } from '../../access/domain/access';
import { RegistryStore, type RegistryTransaction } from './ports';
import { AddressValidator } from './location-ports';
import {
  type CatalogKind,
  type CatalogRecord,
  type Direction,
  type ReturnLocation,
  type PlaceDefault,
  parseCatalog,
  parseDefault,
  page,
  textField,
  validatedAddress,
  direction,
} from '../domain/locations';
import { exact, uuid } from '../domain/registry';

export class LocationService {
  constructor(
    private readonly store: RegistryStore,
    private readonly validator: AddressValidator,
  ) {}
  private run<T>(actor: string, work: (tx: RegistryTransaction) => Promise<T>) {
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      await tx.places.lock();
      return work(tx);
    });
  }
  private async required(
    tx: RegistryTransaction,
    kind: CatalogKind,
    id: string,
  ) {
    const value = await tx.places.get(kind, uuid(id));
    if (!value) throw new AccessError('NOT_FOUND', 404);
    return value;
  }
  private async group(
    tx: RegistryTransaction,
    id: string,
    side: Direction,
    active = true,
  ) {
    const group = await this.required(tx, 'group', id);
    if (group.direction !== side)
      throw new AccessError('GROUP_DIRECTION_MISMATCH', 409);
    if (active && !group.active)
      throw new AccessError('LOCATION_INACTIVE', 409);
    return group;
  }
  async list(actor: string, kind: CatalogKind, query: unknown = {}) {
    const { limit, offset } = page(query);
    return this.run(actor, (tx) => tx.places.list(kind, limit, offset));
  }
  async create(actor: string, kind: CatalogKind, input: unknown) {
    const parsed = parseCatalog(kind, input, false);
    return this.run(actor, async (tx) => {
      if (kind !== 'group')
        await this.group(
          tx,
          parsed.groupId!,
          kind === 'point' ? 'pickup' : 'dropoff',
        );
      const value: CatalogRecord = {
        ...parsed,
        id: randomUUID(),
        active: true,
        version: 1,
        ...(kind === 'point' || kind === 'dropoff'
          ? {
              addressDetails: parsed.addressDetails ?? null,
              stopReference: parsed.stopReference ?? '',
              legacyAddress: parsed.addressDetails ? null : parsed.address!,
            }
          : {}),
      };
      await tx.places.save(kind, value, true);
      return value;
    });
  }
  async update(actor: string, kind: CatalogKind, id: string, input: unknown) {
    const { expectedVersion, ...parsed } = parseCatalog(kind, input, true);
    return this.run(actor, async (tx) => {
      const previous = await this.required(tx, kind, id);
      if (previous.version !== expectedVersion)
        throw new AccessError('VERSION_CONFLICT', 409);
      if (kind !== 'group')
        await this.group(
          tx,
          parsed.groupId!,
          kind === 'point' ? 'pickup' : 'dropoff',
          parsed.active || parsed.groupId !== previous.groupId,
        );
      const value = {
        ...previous,
        ...parsed,
        ...(kind === 'point' || kind === 'dropoff'
          ? {
              addressDetails:
                parsed.addressDetails ??
                (parsed.address === previous.address
                  ? (previous.addressDetails ?? null)
                  : null),
              stopReference:
                parsed.stopReference ?? previous.stopReference ?? '',
            }
          : {}),
        active: parsed.active!,
        version: previous.version + 1,
      };
      await tx.places.save(kind, value, false);
      return value;
    });
  }
  private async validateAddress(actor: string, address: string) {
    // Authorize before invoking the external seam, but hold no database locks while waiting.
    await this.store.transaction((tx) => tx.authorize(actor));
    let result: unknown;
    try {
      result = await this.validator.validate(address);
    } catch {
      throw new AccessError('ADDRESS_VALIDATION_UNAVAILABLE', 503);
    }
    return validatedAddress(result);
  }
  private async regionGroup(tx: RegistryTransaction, regionId: string) {
    const region = await tx.places.get('region', regionId);
    if (!region) throw new AccessError('GROUP_UNRESOLVED', 409);
    if (!region.active) throw new AccessError('LOCATION_INACTIVE', 409);
    const group = await this.group(tx, region.groupId!, 'dropoff');
    return group.id;
  }
  private async persistReturn(
    tx: RegistryTransaction,
    validated: Omit<ReturnLocation, 'id'>,
  ) {
    const groupId = await this.regionGroup(tx, validated.regionId);
    let location = await tx.places.byIdentity(
      validated.provider,
      validated.externalKey,
    );
    if (location && location.regionId !== validated.regionId)
      throw new AccessError('GROUP_UNRESOLVED', 409);
    if (!location) {
      location = { ...validated, id: randomUUID() };
      await tx.places.insertLocation(location);
    }
    return { location, groupId };
  }
  async resolveReturn(actor: string, input: unknown) {
    const address = textField(exact(input, ['address']).address),
      validated = await this.validateAddress(actor, address);
    return this.run(actor, (tx) => this.persistReturn(tx, validated));
  }
  private async student(tx: RegistryTransaction, id: string) {
    if (!(await tx.student(uuid(id), true)))
      throw new AccessError('NOT_FOUND', 404);
  }
  private async pickup(tx: RegistryTransaction, id: string) {
    const point = await this.required(tx, 'point', id);
    if (!point.active) throw new AccessError('LOCATION_INACTIVE', 409);
    await this.group(tx, point.groupId!, 'pickup');
    return point;
  }
  async validatePickup(pointId: string) {
    return this.store.transaction(async (tx) => {
      await tx.places.lock();
      return this.pickup(tx, pointId);
    });
  }
  async setDefault(
    actor: string,
    studentId: string,
    side: Direction,
    input: unknown,
  ) {
    direction(side);
    uuid(studentId);
    const command = parseDefault(side, input);
    const validated =
      side === 'dropoff' && !command.locationId
        ? await this.validateAddress(actor, command.address!)
        : null;
    return this.run(actor, async (tx) => {
      await this.student(tx, studentId);
      const previous = (await tx.places.defaults(studentId)).find(
        (v) => v.direction === side,
      );
      if ((previous?.version ?? 0) !== command.expectedVersion)
        throw new AccessError('VERSION_CONFLICT', 409);
      if (previous && command.source === 'initial')
        throw new AccessError('CONSENT_REQUIRED', 409);
      let locationId: string | null = null;
      if (side === 'pickup') await this.pickup(tx, command.pointId!);
      else if (command.locationId) {
        const point = await this.required(tx, 'dropoff', command.locationId);
        if (!point.active) throw new AccessError('LOCATION_INACTIVE', 409);
        await this.group(tx, point.groupId!, 'dropoff');
        locationId = point.id;
      } else
        locationId = (await this.persistReturn(tx, validated!)).location.id;
      const value: PlaceDefault = {
        studentId,
        direction: side,
        pointId: command.pointId,
        locationId,
        source: command.source,
        evidence: command.evidence,
        version: (previous?.version ?? 0) + 1,
      };
      await tx.places.saveDefault(value);
      return value;
    });
  }
  async defaults(actor: string, studentId: string) {
    return this.run(actor, async (tx) => {
      await this.student(tx, studentId);
      const values = await tx.places.defaults(studentId);
      const status = async (side: Direction) => {
        const value = values.find((v) => v.direction === side) ?? null;
        if (!value) return { value, usable: false, issue: 'NOT_CONFIGURED' };
        try {
          if (side === 'pickup') await this.pickup(tx, value.pointId!);
          else {
            const location = await tx.places.location(value.locationId!);
            if (!location) throw new AccessError('NOT_FOUND', 404);
            const item = await returnItem(tx.places, location);
            if (!item?.active || !item.groupId)
              throw new AccessError('LOCATION_INACTIVE', 409);
            await this.group(tx, item.groupId, 'dropoff');
          }
          return { value, usable: true, issue: null };
        } catch (error) {
          if (
            error instanceof AccessError &&
            [
              'LOCATION_INACTIVE',
              'NOT_FOUND',
              'GROUP_UNRESOLVED',
              'GROUP_DIRECTION_MISMATCH',
            ].includes(error.code)
          )
            return { value, usable: false, issue: error.code };
          throw error;
        }
      };
      const pickup = await status('pickup'),
        dropoff = await status('dropoff');
      return {
        pickup,
        dropoff,
        needsAdjustment: !pickup.usable || !dropoff.usable,
      };
    });
  }
}
