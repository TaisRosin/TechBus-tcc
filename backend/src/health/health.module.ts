import { Module, type DynamicModule } from '@nestjs/common';
import type { DatabaseConfig } from '../config/environment';
import { PostgresProbe } from '../infrastructure/database/postgres-probe';
import { SystemClock } from '../shared/time/system-clock';
import { CheckReadiness } from './application/check-readiness';
import { HealthController } from './http/health.controller';

@Module({})
export class HealthModule {
  static register(database: DatabaseConfig): DynamicModule {
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: [
        {
          provide: PostgresProbe,
          useFactory: () => new PostgresProbe(database),
        },
        {
          provide: CheckReadiness,
          inject: [PostgresProbe],
          useFactory: (probe: PostgresProbe) =>
            new CheckReadiness(new SystemClock(), probe),
        },
      ],
    };
  }
}
