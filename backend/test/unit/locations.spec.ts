import {
  parseCatalog,
  parseDefault,
  validatedAddress,
} from '../../src/registry/domain/locations';

describe('Location input boundaries', () => {
  it('accepts manual groups of each direction', () => {
    expect(
      parseCatalog('group', { name: ' Coleta A ', direction: 'pickup' }, false),
    ).toEqual({ name: 'Coleta A', direction: 'pickup' });
    expect(
      parseCatalog('group', { name: 'Volta A', direction: 'dropoff' }, false)
        .direction,
    ).toBe('dropoff');
  });
  it.each([
    { name: '', direction: 'pickup' },
    { name: 'A', direction: 'both' },
    { name: 'A', direction: 'pickup', active: true },
  ])('rejects invalid group %j', (input) => {
    expect(() => parseCatalog('group', input, false)).toThrow('INVALID_INPUT');
  });
  it('rejects invalid references and silent pattern changes', () => {
    expect(() =>
      parseCatalog('region', { name: 'A', groupId: 'bad' }, false),
    ).toThrow('INVALID_INPUT');
    expect(() =>
      parseDefault('pickup', {
        pointId: 'bad',
        source: 'request',
        evidence: 'msg',
        expectedVersion: 0,
      }),
    ).toThrow('INVALID_INPUT');
    expect(() =>
      parseDefault('dropoff', {
        address: 'Rua A',
        source: 'automatic',
        evidence: 'msg',
        expectedVersion: 0,
      }),
    ).toThrow('INVALID_INPUT');
  });
  it('requires a complete validator result and never treats ambiguous as valid', () => {
    expect(() => validatedAddress({ status: 'outside' })).toThrow(
      'OUTSIDE_SERVICE_AREA',
    );
    expect(() => validatedAddress({ status: 'indeterminate' })).toThrow(
      'GROUP_UNRESOLVED',
    );
    expect(() =>
      validatedAddress({ status: 'inside', regionId: 'bad' }),
    ).toThrow('ADDRESS_VALIDATION_UNAVAILABLE');
  });
});
