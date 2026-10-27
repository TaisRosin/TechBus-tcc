import {
  AutomaticRouting,
  DisabledAutomaticRouter,
  type RoutingRequest,
} from '../../src/itinerary/application/routing';
const input: RoutingRequest = {
  groupId: 'group',
  side: 'pickup',
  origin: { latitude: -26, longitude: -52 },
  destination: { latitude: -26.1, longitude: -52.1 },
  stops: [
    { id: 'a', latitude: -26.01, longitude: -52.01 },
    { id: 'b', latitude: -26.02, longitude: -52.02 },
  ],
};
describe('Automatic routing boundary', () => {
  it('is unavailable by default without making a network call', async () => {
    expect(
      await new AutomaticRouting(new DisabledAutomaticRouter()).calculate(
        input,
      ),
    ).toEqual({ status: 'unavailable', reason: 'ROUTER_NOT_CONFIGURED' });
  });
  it('accepts a simulated exact permutation, never missing, repeated or foreign stops', async () => {
    expect(
      await new AutomaticRouting({
        calculate: () => Promise.resolve({ orderedIds: ['b', 'a'] }),
      }).calculate(input),
    ).toEqual({ status: 'candidate', orderedIds: ['b', 'a'] });
    for (const orderedIds of [['a'], ['a', 'a'], ['a', 'outside']])
      expect(
        await new AutomaticRouting({
          calculate: () => Promise.resolve({ orderedIds }),
        }).calculate(input),
      ).toEqual({ status: 'unavailable', reason: 'INVALID_ROUTE_RESULT' });
  });
  it('does not convert failure or missing geography into a fabricated route', async () => {
    const service = new AutomaticRouting({
      calculate: () => Promise.reject(new Error('provider details')),
    });
    expect(await service.calculate(input)).toEqual({
      status: 'unavailable',
      reason: 'ROUTER_UNAVAILABLE',
    });
    expect(
      await service.calculate({
        ...input,
        origin: { latitude: NaN, longitude: 0 },
      }),
    ).toEqual({ status: 'unavailable', reason: 'GEOGRAPHY_REQUIRED' });
  });
});
