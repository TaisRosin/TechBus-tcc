import {
  parseCatalog,
  parseDefault,
  validatedAddress,
} from '../../src/registry/domain/locations';

describe('Location input boundaries', () => {
  it.each([
    { number: '' },
    { noNumber: true },
    { state: 'XX' },
    { postalCode: '123' },
    { city: '' },
    { country: 'US' },
    { validated: true },
    { noNumber: 'false' },
  ])('rejects inconsistent structured address %j', (change) => {
    expect(() =>
      parseCatalog(
        'point',
        {
          name: 'Ponto',
          groupId: '12345678-1234-4234-8234-123456789012',
          addressDetails: {
            street: 'Rua A',
            number: '12A',
            noNumber: false,
            neighborhood: '',
            city: 'Pato Branco',
            state: 'PR',
            country: 'BR',
            postalCode: '',
            complement: '',
            ...change,
          },
        },
        false,
      ),
    ).toThrow('INVALID_INPUT');
  });
  it('formats a company address and keeps the stop reference separate', () => {
    const addressDetails = {
      street: ' Rua das Flores ',
      number: '12A',
      noNumber: false,
      neighborhood: 'Centro',
      city: 'São Lourenço do Oeste',
      state: 'sc',
      country: 'BR',
      postalCode: '89990-000',
      complement: 'Bloco B',
    };
    expect(
      parseCatalog(
        'point',
        {
          name: 'Praça',
          groupId: '12345678-1234-4234-8234-123456789012',
          addressDetails,
          stopReference: ' Portão lateral ',
        },
        false,
      ),
    ).toMatchObject({
      address:
        'Rua das Flores, 12A, Bloco B — Centro — São Lourenço do Oeste/SC — CEP 89990-000 — Brasil',
      addressDetails: {
        ...addressDetails,
        street: 'Rua das Flores',
        state: 'SC',
        postalCode: '89990000',
      },
      stopReference: 'Portão lateral',
    });
  });
  it('accepts a fixed dropoff catalog and an explicit default reference', () => {
    const id = '12345678-1234-4234-8234-123456789012';
    expect(
      parseCatalog(
        'dropoff',
        { name: 'Praça', address: 'Rua A', groupId: id },
        false,
      ),
    ).toEqual({ name: 'Praça', address: 'Rua A', groupId: id });
    expect(
      parseDefault('dropoff', {
        locationId: id,
        source: 'initial',
        evidence: 'Cadastro',
        expectedVersion: 0,
      }).locationId,
    ).toBe(id);
  });
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
