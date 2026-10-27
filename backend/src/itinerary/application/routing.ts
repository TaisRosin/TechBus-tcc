export interface Coordinates {
  latitude: number;
  longitude: number;
}
// Trusted future integration input, never proof of address eligibility from a client.
export interface RoutingRequest {
  groupId: string;
  side: 'pickup' | 'dropoff';
  origin: Coordinates;
  destination: Coordinates;
  stops: ({ id: string } & Coordinates)[];
}
export abstract class AutomaticRouter {
  abstract calculate(request: RoutingRequest): Promise<unknown>;
}
export class DisabledAutomaticRouter extends AutomaticRouter {
  calculate(): Promise<unknown> {
    return Promise.resolve({
      status: 'unavailable',
      reason: 'ROUTER_NOT_CONFIGURED',
    });
  }
}
export type RoutingResult =
  | { status: 'candidate'; orderedIds: string[] }
  | { status: 'unavailable'; reason: string };
export class AutomaticRouting {
  constructor(
    private readonly router: AutomaticRouter = new DisabledAutomaticRouter(),
  ) {}
  async calculate(input: RoutingRequest): Promise<RoutingResult> {
    const valid = (p: Coordinates) =>
      p &&
      Number.isFinite(p.latitude) &&
      Math.abs(p.latitude) <= 90 &&
      Number.isFinite(p.longitude) &&
      Math.abs(p.longitude) <= 180;
    if (
      !valid(input.origin) ||
      !valid(input.destination) ||
      !input.stops.every(valid)
    )
      return { status: 'unavailable', reason: 'GEOGRAPHY_REQUIRED' };
    const ids = new Set(input.stops.map((s) => s.id));
    if (
      !input.groupId ||
      !['pickup', 'dropoff'].includes(input.side) ||
      !input.stops.length ||
      input.stops.length > 1000 ||
      ids.size !== input.stops.length ||
      input.stops.some((s) => !s.id)
    )
      return { status: 'unavailable', reason: 'INVALID_ROUTE_INPUT' };
    try {
      const value = await this.router.calculate(input);
      if (
        value &&
        typeof value === 'object' &&
        'status' in value &&
        value.status === 'unavailable'
      )
        return {
          status: 'unavailable',
          reason:
            this.router instanceof DisabledAutomaticRouter
              ? 'ROUTER_NOT_CONFIGURED'
              : 'ROUTER_UNAVAILABLE',
        };
      if (
        !value ||
        typeof value !== 'object' ||
        !('orderedIds' in value) ||
        !Array.isArray(value.orderedIds)
      )
        return { status: 'unavailable', reason: 'INVALID_ROUTE_RESULT' };
      const ordered: unknown[] = value.orderedIds;
      if (
        ordered.length !== ids.size ||
        new Set(ordered).size !== ids.size ||
        !ordered.every(
          (id): id is string => typeof id === 'string' && ids.has(id),
        )
      )
        return { status: 'unavailable', reason: 'INVALID_ROUTE_RESULT' };
      return { status: 'candidate', orderedIds: ordered };
    } catch {
      return { status: 'unavailable', reason: 'ROUTER_UNAVAILABLE' };
    }
  }
}
