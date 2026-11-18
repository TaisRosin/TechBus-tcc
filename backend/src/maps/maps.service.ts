import { createHash } from 'node:crypto';
import { AccessError } from '../access/domain/access';
import { RegistryStore } from '../registry/application/ports';
import { ItineraryService } from '../itinerary/application/itinerary.service';
import { exact, invalid, uuid } from '../registry/domain/registry';
import { textField } from '../registry/domain/locations';
import { GoogleMaps, type MapLocation } from './google-maps';

export class MapsService {
  constructor(
    private readonly store: RegistryStore,
    private readonly itineraries: ItineraryService,
    private readonly google: GoogleMaps,
  ) {}
  private authorize(actor: string) {
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
    });
  }
  async geocode(actor: string, input: unknown) {
    const body = exact(input, ['address']);
    const address = textField(body.address);
    await this.authorize(actor);
    const candidates = await this.google.geocode(address);
    await this.authorize(actor);
    return { candidates };
  }
  async points(actor: string, groupId: string, mode: string) {
    if (groupId === 'direct' && mode === 'direct') {
      await this.authorize(actor);
      return { ordered: [], pending: [], token: 'direct' };
    }
    uuid(groupId);
    if (!['catalog', 'today'].includes(mode)) return invalid();
    const data = await this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      await tx.places.lock();
      const group = await tx.places.get('group', groupId);
      if (!group?.active) throw new AccessError('GROUP_UNAVAILABLE', 409);
      const order = await tx.itineraries.order(groupId);
      const points = [];
      for (let offset = 0; ; offset += 100) {
        const batch = await tx.places.list(
          group.direction === 'pickup' ? 'point' : 'dropoff',
          100,
          offset,
        );
        points.push(
          ...batch.filter((point) => point.active && point.groupId === groupId),
        );
        if (batch.length < 100) break;
      }
      return { points, order: order?.stopIds ?? [] };
    });
    const ids = data.order;
    let selected = data.points;
    let dayToken = '';
    if (mode === 'today') {
      const preview = await this.itineraries.preview(actor, groupId, {});
      const endpoints = data.order.length
        ? [data.order[0], data.order[data.order.length - 1]]
        : [];
      const dailyIds = preview.candidate.ordered.map((stop) => stop.id);
      const wanted = new Set([
        ...endpoints,
        ...dailyIds,
        ...preview.candidate.pending.map((stop) => stop.id),
      ]);
      if ([...wanted].some((id) => !selected.some((point) => point.id === id)))
        throw new AccessError('MAPS_POINT_UNAVAILABLE', 409);
      selected = selected.filter((point) => wanted.has(point.id));
      dayToken = preview.previewToken;
    }
    const endpoints = data.order.length
      ? [data.order[0], data.order[data.order.length - 1]]
      : [];
    if (endpoints.some((id) => !data.points.some((point) => point.id === id)))
      throw new AccessError('MAPS_POINT_UNAVAILABLE', 409);
    const byId = new Map(selected.map((point) => [point.id, point]));
    const ordered = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    const pending = selected.filter((point) => !ids.includes(point.id));
    const token = createHash('sha256')
      .update(JSON.stringify([ordered, pending, dayToken]))
      .digest('hex');
    return { ordered, pending, token };
  }
  async route(actor: string, input: unknown) {
    const body = exact(input, ['groupId', 'mode', 'token', 'locations']);
    const groupId = textField(body.groupId, 36);
    if (groupId !== 'direct') uuid(groupId);
    const mode = textField(body.mode, 10);
    const token = textField(body.token, 64);
    if (
      !Array.isArray(body.locations) ||
      body.locations.length < 2 ||
      body.locations.length > 27
    )
      return invalid();
    const locations = body.locations.map((raw: unknown) => {
      const item = exact(raw, [
        'placeId',
        'lat',
        'lng',
        'address',
        'approximate',
        'pointId',
      ]);
      if (
        typeof item.lat !== 'number' ||
        !Number.isFinite(item.lat) ||
        Math.abs(item.lat) > 90 ||
        typeof item.lng !== 'number' ||
        !Number.isFinite(item.lng) ||
        Math.abs(item.lng) > 180 ||
        typeof item.approximate !== 'boolean'
      )
        return invalid();
      return {
        placeId: textField(item.placeId, 1000),
        lat: item.lat,
        lng: item.lng,
        address: textField(item.address),
        approximate: item.approximate,
        pointId:
          item.pointId === null ? null : uuid(textField(item.pointId, 36)),
      };
    });
    const current = await this.points(actor, groupId, mode);
    if (current.token !== token) throw new AccessError('PREVIEW_CHANGED', 409);
    if (current.pending.length)
      throw new AccessError('ITINERARY_INCOMPLETE', 409);
    const expected =
      mode === 'direct'
        ? [null, null]
        : current.ordered.map((point) => point.id);
    if (
      JSON.stringify(locations.map((point) => point.pointId)) !==
      JSON.stringify(expected)
    )
      return invalid();
    const route = await this.google.route(locations as MapLocation[]);
    const after = await this.points(actor, groupId, mode);
    if (after.token !== token) throw new AccessError('PREVIEW_CHANGED', 409);
    return route;
  }
}
