import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { AccessError } from '../domain/access';

export class PasswordHasher {
  private running = 0;
  private readonly waiting: (() => void)[] = [];
  private async derive(password: string, salt: Buffer): Promise<Buffer> {
    if (this.running >= 2) {
      if (this.waiting.length >= 8)
        throw new AccessError('AUTH_RATE_LIMITED', 429);
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else this.running++;
    try {
      return await new Promise<Buffer>((resolve, reject) => {
        scrypt(
          password,
          salt,
          64,
          { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
          (error, key) => (error ? reject(error) : resolve(key)),
        );
      });
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.running--;
    }
  }
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    return `scrypt:131072:8:1:${salt.toString('hex')}:${(await this.derive(password, salt)).toString('hex')}`;
  }
  async verify(password: string, encoded: string): Promise<boolean> {
    const match = /^scrypt:131072:8:1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(
      encoded,
    );
    if (!match) return false;
    const actual = await this.derive(password, Buffer.from(match[1], 'hex'));
    return timingSafeEqual(actual, Buffer.from(match[2], 'hex'));
  }
}
