import { Module, type DynamicModule } from '@nestjs/common';
import type { Environment } from './config/environment';
import { HealthModule } from './health/health.module';
import { AccessModule } from './access/access.module';
import { RegistryModule } from './registry/registry.module';

@Module({})
export class AppModule {
  static register(config: Environment): DynamicModule {
    return {
      module: AppModule,
      imports: [
        HealthModule.register(config.database),
        AccessModule.register(config.database),
        RegistryModule.register(
          config.database,
          config.evolution,
          config.gemini,
          config.schedulerEnabled,
          config.mapsKey,
        ),
      ],
    };
  }
}
