import {
  AccessError,
  parseChangeAccess,
  userView,
  type UserView,
  type Action,
  type TeamUser,
} from '../domain/access';
import { TeamStore, TripAssignments } from './ports';

export class AccessService {
  constructor(
    private readonly store: TeamStore,
    private readonly assignments: TripAssignments,
  ) {}

  async authorize(
    subject: string,
    action: Action,
    resourceId?: string,
  ): Promise<TeamUser> {
    const user = await this.store.bySubject(subject);
    if (!user?.active || !['admin', 'operator', 'driver'].includes(user.role))
      throw new AccessError('FORBIDDEN', 403);
    if (action === 'session') return user;
    if (
      [
        'users:manage',
        'settings:manage',
        'operations:manage',
        'trips:read',
      ].includes(action) &&
      user.role === 'admin'
    )
      return user;
    if (
      user.role === 'operator' &&
      ['operations:manage', 'trips:read'].includes(action)
    )
      return user;
    if (user.role === 'driver' && action === 'trips:read') {
      if (
        !resourceId ||
        !(await this.assignments.isAssigned(user.id, resourceId))
      )
        throw new AccessError('NOT_FOUND', 404);
      return user;
    }
    throw new AccessError('FORBIDDEN', 403);
  }

  async changeAccess(
    subject: string,
    id: string,
    input: unknown,
  ): Promise<UserView> {
    return this.store.transaction(async (tx) => {
      const actor = await tx.bySubject(subject);
      if (!actor?.active || actor.role !== 'admin')
        throw new AccessError('FORBIDDEN', 403);
      if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
        throw new AccessError('INVALID_INPUT', 400);
      const command = parseChangeAccess(input);
      const target = await tx.byId(id);
      if (!target) throw new AccessError('NOT_FOUND', 404);
      if (target.version !== command.expectedVersion)
        throw new AccessError('VERSION_CONFLICT', 409);
      if (
        target.active &&
        target.role === 'admin' &&
        (!command.active || command.role !== 'admin') &&
        (await tx.activeAdmins()) <= 1
      ) {
        throw new AccessError('LAST_ADMIN', 409);
      }
      const updated = {
        ...target,
        role: command.role,
        active: command.active,
        version: target.version + 1,
      };
      await tx.save(updated);
      return userView(updated);
    });
  }
}
