import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AccessService } from '../application/access.service';
import { IdentityVerifier } from '../application/ports';
import { AccessError, type Action, type TeamUser } from '../domain/access';
import { ACCESS_POLICY } from './access-policy';

export interface AccessRequest extends Request {
  teamUser?: TeamUser;
}
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identities: IdentityVerifier,
    private readonly access: AccessService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<Action | 'public'>(
      ACCESS_POLICY,
      [context.getHandler(), context.getClass()],
    );
    if (action === 'public') return true;
    if (!action) throw new AccessError('FORBIDDEN', 403);
    const req = context.switchToHttp().getRequest<AccessRequest>();
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
    if (!match) throw new AccessError('UNAUTHENTICATED', 401);
    try {
      const identity = await this.identities.verify(match[1]);
      if (!identity?.subject) throw new AccessError('UNAUTHENTICATED', 401);
      req.teamUser = await this.access.authorize(
        identity.subject,
        action,
        typeof req.params.id === 'string' ? req.params.id : undefined,
      );
      // Only authorized, interactive requests renew activity. Identity checks alone do not.
      if (
        action !== 'session' &&
        req.headers['x-techbus-activity'] !== 'passive'
      )
        await this.identities.touch?.(match[1]);
    } catch (error) {
      if (error instanceof AccessError) throw error;
      throw new AccessError('ACCESS_UNAVAILABLE', 503);
    }
    return true;
  }
}
