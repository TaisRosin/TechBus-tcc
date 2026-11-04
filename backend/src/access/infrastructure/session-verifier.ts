import { IdentityVerifier } from '../application/ports';
import { AuthService } from '../application/auth.service';

export class SessionVerifier extends IdentityVerifier {
  constructor(private readonly auth: AuthService) {
    super();
  }
  verify(token: string): Promise<{ subject: string }> {
    return this.auth.verify(token);
  }
  async touch(token: string): Promise<void> {
    await this.auth.verify(token, true);
  }
}
