import { PasswordHasher } from '../../src/access/infrastructure/password-hasher';

describe('Password protection', () => {
  it('bounds expensive work and rejects excess requests instead of growing the queue', async () => {
    const hasher = new PasswordHasher();
    const results = await Promise.allSettled(
      Array.from({ length: 11 }, () =>
        hasher.hash('synthetic bounded request'),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(10);
    expect(
      results.find((result) => result.status === 'rejected'),
    ).toMatchObject({ reason: { code: 'AUTH_RATE_LIMITED' } });
    expect(
      await hasher.verify(
        'synthetic bounded request',
        await hasher.hash('synthetic bounded request'),
      ),
    ).toBe(true);
  });
  it('verifies only the original password and uses an individual salt', async () => {
    const hasher = new PasswordHasher();
    const first = await hasher.hash('uma frase de teste segura');
    const second = await hasher.hash('uma frase de teste segura');
    expect(first).not.toEqual(second);
    expect(first).not.toContain('uma frase');
    expect(await hasher.verify('uma frase de teste segura', first)).toBe(true);
    expect(await hasher.verify('outra frase muito segura', first)).toBe(false);
    expect(await hasher.verify('uma frase de teste segura', 'malformed')).toBe(
      false,
    );
  });
});
