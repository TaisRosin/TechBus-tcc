import {
  directInterpretation,
  parseProposal,
} from '../../src/interpretation/domain';
import {
  GeminiInterpreter,
  readGeminiConfig,
} from '../../src/interpretation/gemini';

describe('Message interpretation boundary', () => {
  it.each([
    ['vou', 'going'],
    ['NÃO VOU!', 'not_going'],
    ['só ida', 'only_pickup'],
    ['so volta', 'only_dropoff'],
    ['cancelar volta', 'cancel_return'],
  ])('recognizes the entire explicit command %s', (text, trip) => {
    expect(directInterpretation(text)).toMatchObject({
      trip,
      ambiguous: false,
    });
  });
  it('does not erase qualifications or guess what an isolated yes answers', () => {
    expect(directInterpretation('vou, mas não sei se volto')).toBeNull();
    expect(directInterpretation('não vou hoje, amanhã sim')).toBeNull();
    expect(directInterpretation('sim')).toMatchObject({
      trip: 'none',
      ambiguous: true,
    });
    expect(directInterpretation('não')).toMatchObject({
      trip: 'none',
      ambiguous: true,
    });
  });
  it('refuses privileged fields in a model proposal', () => {
    const simple = directInterpretation('vou');
    expect(() => parseProposal({ ...simple, studentId: 'forged' })).toThrow(
      'INVALID_PROPOSAL',
    );
  });
  it('preserves all parts of a complex proposal and rejects contradictory structures', () => {
    const proposal = {
      ...directInterpretation('vou')!,
      trip: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
      dropoffPlace: 'Rua de teste 10',
      saveDropoff: true,
    };
    expect(parseProposal(proposal)).toEqual(proposal);
    expect(() => parseProposal({ ...proposal, trip: 'going' })).toThrow(
      'INVALID_PROPOSAL',
    );
  });
  it('keeps Gemini disabled without credentials and refuses partial activation', async () => {
    expect(readGeminiConfig({})).toBeUndefined();
    expect(() => readGeminiConfig({ GEMINI_ENABLED: 'true' })).toThrow();
    expect(await new GeminiInterpreter().interpret('mensagem')).toEqual({
      proposal: null,
      code: 'PROVIDER_DISABLED',
    });
  });
  it('sends bounded untrusted text separately from instructions and validates the structured response', async () => {
    const proposal = directInterpretation('vou');
    const transport = jest.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'STOP',
                content: { parts: [{ text: JSON.stringify(proposal) }] },
              },
            ],
          }),
        ),
      ),
    );
    const interpreter = new GeminiInterpreter(
      { apiKey: 'test-secret', model: 'gemini-3.1-flash-lite' },
      transport,
    );
    expect(await interpreter.interpret('vou amanhã?')).toEqual({
      proposal,
      code: null,
    });
    const calls = transport.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
    );
    expect(calls[0][0]).not.toContain('test-secret');
    const body = JSON.parse(calls[0][1].body as string) as {
      contents: unknown;
      systemInstruction: unknown;
      generationConfig: unknown;
    };
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'vou amanhã?' }] },
    ]);
    expect(body.systemInstruction).toBeDefined();
    expect(body.generationConfig).toMatchObject({ maxOutputTokens: 1024 });
    expect(calls[0][1].redirect).toBe('error');
  });
  it.each(['http', 'timeout', 'invalid', 'blocked'])(
    'keeps %s pending without automatic retry',
    async (failure) => {
      const response =
        failure === 'invalid'
          ? {
              candidates: [
                {
                  finishReason: 'STOP',
                  content: { parts: [{ text: '{"studentId":"forged"}' }] },
                },
              ],
            }
          : { candidates: [{ finishReason: 'SAFETY' }] };
      const transport = jest.fn(() =>
        failure === 'timeout'
          ? Promise.reject(new Error('secret error'))
          : Promise.resolve(
              new Response(JSON.stringify(response), {
                status: failure === 'http' ? 429 : 200,
              }),
            ),
      );
      const result = await new GeminiInterpreter(
        { apiKey: 'secret', model: 'test-model' },
        transport,
      ).interpret('complexa');
      expect(result.proposal).toBeNull();
      expect(result.code).toBeTruthy();
      expect(JSON.stringify(result)).not.toContain('secret');
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );
});
