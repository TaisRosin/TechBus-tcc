import { SetMetadata } from '@nestjs/common';
import type { Action } from '../domain/access';

export const ACCESS_POLICY = Symbol('access-policy');
export const PublicEndpoint = () => SetMetadata(ACCESS_POLICY, 'public');
export const RequireAction = (action: Action) =>
  SetMetadata(ACCESS_POLICY, action);
