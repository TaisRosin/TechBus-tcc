import { Module, type DynamicModule } from '@nestjs/common';
import type { DatabaseConfig } from '../config/environment';
import { RegistryStore } from './application/ports';
import { RegistryService } from './application/registry.service';
import { PostgresRegistryStore } from './infrastructure/postgres-registry-store';
import { RegistryController } from './http/registry.controller';
import {
  EnrollmentGate,
  StoredEnrollmentReader,
} from './application/enrollment-gate';
import { SystemClock } from '../shared/time/system-clock';
import { CalendarController } from './http/calendar.controller';
import { CalendarService } from './application/calendar.service';
import { EligibilityService } from './application/eligibility.service';
import { LocationController } from './http/location.controller';
import { LocationService } from './application/location.service';
import { AddressValidator } from './application/location-ports';
import { AccessError } from '../access/domain/access';

@Module({
  controllers: [RegistryController, CalendarController, LocationController],
})
export class RegistryModule {
  static register(config: DatabaseConfig): DynamicModule {
    return {
      module: RegistryModule,
      providers: [
        {
          provide: AddressValidator,
          useValue: {
            validate: () =>
              Promise.reject(
                new AccessError('ADDRESS_VALIDATION_UNAVAILABLE', 503),
              ),
          },
        },
        {
          provide: LocationService,
          useFactory: (store: RegistryStore, validator: AddressValidator) =>
            new LocationService(store, validator),
          inject: [RegistryStore, AddressValidator],
        },
        {
          provide: EligibilityService,
          useFactory: (store: RegistryStore) =>
            new EligibilityService(store, new SystemClock()),
          inject: [RegistryStore],
        },
        {
          provide: CalendarService,
          useFactory: (store: RegistryStore) => new CalendarService(store),
          inject: [RegistryStore],
        },
        {
          provide: RegistryStore,
          useFactory: () => new PostgresRegistryStore(config),
        },
        {
          provide: RegistryService,
          useFactory: (store: RegistryStore) => new RegistryService(store),
          inject: [RegistryStore],
        },
        {
          provide: EnrollmentGate,
          useFactory: (store: RegistryStore) =>
            new EnrollmentGate(
              new StoredEnrollmentReader(store),
              new SystemClock(),
            ),
          inject: [RegistryStore],
        },
      ],
      exports: [
        RegistryService,
        EnrollmentGate,
        EligibilityService,
        LocationService,
      ],
    };
  }
}
