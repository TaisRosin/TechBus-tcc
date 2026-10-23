import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AccessService } from './application/access.service';
import {
  IdentityVerifier,
  TeamStore,
  TripAssignments,
} from './application/ports';
import { AccessError } from './domain/access';
import { AccessController } from './http/access.controller';
import { AccessFilter } from './http/access.filter';
import { AccessGuard } from './http/access.guard';
import type { DatabaseConfig } from '../config/environment';
import { PostgresTeamStore } from './infrastructure/postgres-team-store';

@Module({
  controllers: [AccessController],
  providers: [
    {
      provide: IdentityVerifier,
      useValue: {
        verify: () => Promise.reject(new AccessError('AUTH_UNAVAILABLE', 503)),
      },
    },
    {
      provide: TripAssignments,
      useValue: {
        isAssigned: () =>
          Promise.reject(new AccessError('ACCESS_UNAVAILABLE', 503)),
      },
    },
    {
      provide: AccessService,
      useFactory: (store: TeamStore, trips: TripAssignments) =>
        new AccessService(store, trips),
      inject: [TeamStore, TripAssignments],
    },
    { provide: APP_GUARD, useClass: AccessGuard },
    { provide: APP_FILTER, useClass: AccessFilter },
  ],
  exports: [AccessService],
})
export class AccessModule {
  static register(config: DatabaseConfig): DynamicModule {
    return {
      module: AccessModule,
      providers: [
        { provide: TeamStore, useFactory: () => new PostgresTeamStore(config) },
      ],
    };
  }
}
