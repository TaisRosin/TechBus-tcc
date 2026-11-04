import { parseAuthCli } from '../../src/access/cli/auth-cli';

describe('Restricted local authentication commands', () => {
  it('requires an explicit local environment and rejects credentials in arguments', () => {
    expect(parseAuthCli(['--env', 'test'])).toBe('test');
    expect(() => parseAuthCli([])).toThrow();
    expect(() => parseAuthCli(['--env', 'production'])).toThrow();
    expect(() =>
      parseAuthCli(['--env', 'dev', '--password', 'secret']),
    ).toThrow();
  });
});
