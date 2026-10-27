import { randomUUID } from 'node:crypto';
import { filterOrder, stopIds } from '../../src/itinerary/domain/itinerary';
describe('Manual itinerary', () => {
  it('preserves the relative order, groups shared stops and exposes unordered stops without appending them', () => {
    expect(filterOrder(['a', 'b', 'c'], ['c', 'a', 'c', 'new'])).toEqual({
      ordered: ['a', 'c'],
      pending: ['new'],
    });
    expect(filterOrder(['a', 'b'], [])).toEqual({ ordered: [], pending: [] });
  });
  it('rejects repeated, malformed and oversized orders', () => {
    const id = randomUUID();
    expect(stopIds([id])).toEqual([id]);
    expect(stopIds([])).toEqual([]);
    expect(() => stopIds([id, id])).toThrow();
    expect(() => stopIds(['unknown'])).toThrow();
    expect(() =>
      stopIds(Array.from({ length: 1001 }, () => randomUUID())),
    ).toThrow();
  });
});
