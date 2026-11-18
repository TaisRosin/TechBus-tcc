import { AccessError } from '../access/domain/access';

export interface MapLocation {
  address: string;
  placeId: string;
  lat: number;
  lng: number;
  approximate: boolean;
}
interface GeocodeResponse {
  status: string;
  results?: Array<{
    formatted_address: string;
    place_id: string;
    partial_match?: boolean;
    geometry: { location: { lat: number; lng: number }; location_type: string };
  }>;
}
interface RouteResponse {
  routes?: Array<{
    distanceMeters: number;
    duration: string;
    polyline: { encodedPolyline: string };
  }>;
}
export class GoogleMaps {
  constructor(
    private readonly key?: string,
    private readonly request: typeof fetch = fetch,
  ) {}
  private async json<T>(url: string, options?: RequestInit): Promise<T> {
    if (!this.key) throw new AccessError('MAPS_UNCONFIGURED', 503);
    try {
      const response = await this.request(url, {
        ...options,
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('provider');
      return (await response.json()) as T;
    } catch {
      throw new AccessError('MAPS_UNAVAILABLE', 503);
    }
  }
  async geocode(address: string): Promise<MapLocation[]> {
    const query = new URLSearchParams({
      address,
      key: this.key ?? '',
      language: 'pt-BR',
      components: 'country:BR',
    });
    const result = await this.json<GeocodeResponse>(
      `https://maps.googleapis.com/maps/api/geocode/json?${query}`,
    );
    if (result.status === 'ZERO_RESULTS') return [];
    if (result.status !== 'OK') throw new AccessError('MAPS_UNAVAILABLE', 503);
    return (result.results ?? []).slice(0, 5).map((item) => ({
      address: item.formatted_address,
      placeId: item.place_id,
      lat: item.geometry.location.lat,
      lng: item.geometry.location.lng,
      approximate:
        item.partial_match === true ||
        !['ROOFTOP', 'RANGE_INTERPOLATED'].includes(
          item.geometry.location_type,
        ),
    }));
  }
  async route(locations: MapLocation[]) {
    const waypoint = (location: MapLocation) => ({ placeId: location.placeId });
    const data = await this.json<RouteResponse>(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.key ?? '',
          'X-Goog-FieldMask':
            'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: waypoint(locations[0]),
          destination: waypoint(locations[locations.length - 1]),
          intermediates: locations.slice(1, -1).map(waypoint),
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE',
          optimizeWaypointOrder: false,
          languageCode: 'pt-BR',
          units: 'METRIC',
        }),
      },
    );
    const route = data.routes?.[0];
    if (!route) throw new AccessError('MAPS_ROUTE_NOT_FOUND', 422);
    const durationSeconds = Number(route.duration?.replace(/s$/, ''));
    if (
      !Number.isFinite(route.distanceMeters) ||
      !Number.isFinite(durationSeconds) ||
      !route.polyline?.encodedPolyline
    )
      throw new AccessError('MAPS_UNAVAILABLE', 503);
    return {
      distanceMeters: route.distanceMeters,
      durationSeconds,
      polyline: route.polyline.encodedPolyline,
    };
  }
}
