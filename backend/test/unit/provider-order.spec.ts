import { compareProviderOrder } from '../../src/whatsapp/provider-order';

describe('Approved provider ordering policy', () => {
  const evidence = (seconds: number) => ({ source: 'wa-stanza-v1', seconds });
  it('orders by original evidence rather than arrival', () => {
    expect(compareProviderOrder(evidence(100), evidence(200))).toBe('older');
    expect(compareProviderOrder(evidence(200), evidence(100))).toBe('newer');
  });
  it('keeps same-second messages uncertain', () => {
    expect(compareProviderOrder(evidence(100), evidence(100))).toBe(
      'uncertain',
    );
  });
  it.each([
    null,
    {},
    { source: 'messageTimestamp', seconds: 100 },
    { source: 'wa-stanza-v1', seconds: 1.5 },
    { source: 'wa-stanza-v1', seconds: -1 },
  ])('does not manufacture missing or invalid evidence %j', (invalid) => {
    expect(compareProviderOrder(invalid, evidence(100))).toBe('uncertain');
    expect(compareProviderOrder(evidence(100), invalid)).toBe('uncertain');
  });
});
