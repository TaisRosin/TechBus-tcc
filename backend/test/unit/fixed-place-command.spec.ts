import { resolveProposal } from '../../src/interpretation/places';
import { directInterpretation } from '../../src/interpretation/domain';
describe('Fixed places in complete proposals', () => {
  const rows = [
    {
      id: '12345678-1234-4234-8234-123456789012',
      name: 'Praça',
      active: true,
      version: 1,
      groupId: 'g',
    },
  ];
  it('resolves a complete trip without discarding its location', async () => {
    const r = await resolveProposal(
      { ...directInterpretation('vou'), dropoffPlace: 'praça' },
      () => Promise.resolve(rows),
    );
    expect(r.command).toMatchObject({
      kind: 'request',
      trip: 'going',
      locationId: rows[0].id,
    });
  });
  it('leaves homonyms pending instead of taking the first match', async () => {
    const r = await resolveProposal(
      { ...directInterpretation('vou'), dropoffPlace: 'Praça' },
      () =>
        Promise.resolve([
          ...rows,
          { ...rows[0], id: '22345678-1234-4234-8234-123456789012' },
        ]),
    );
    expect(r.command).toBeNull();
  });
  it('asks only about the uncertain return and keeps a known pickup answer', async () => {
    const result = await resolveProposal(
      {
        ...directInterpretation('sim')!,
        trip: 'answer',
        pickup: 'yes',
        dropoff: 'unsure',
      },
      () => Promise.resolve([]),
    );
    expect(result).toMatchObject({ command: null, purpose: 'dropoff' });
  });
});
