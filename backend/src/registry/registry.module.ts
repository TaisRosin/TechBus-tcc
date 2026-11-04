import { Module, type DynamicModule } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import type { EvolutionConfig } from '../whatsapp/config';
import type { GeminiConfig } from '../interpretation/gemini';
import { WhatsAppStore } from '../whatsapp/store';
import { EvolutionSender } from '../whatsapp/sender';
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
import { JourneyService } from '../journey/application/journey.service';
import { JourneyController } from '../journey/http/journey.controller';
import { PatternController } from '../journey/http/pattern.controller';
import { PatternService } from '../journey/application/pattern.service';
import { FleetService } from '../fleet/application/fleet.service';
import { FleetController } from '../fleet/http/fleet.controller';
import { OperationService } from '../operation/application/operation.service';
import { OperationController } from '../operation/http/operation.controller';
import { CorrectionService } from '../journey/application/correction.service';
import { CorrectionController } from '../journey/http/correction.controller';
import { MessageService } from '../messaging/application/message.service';
import {
  MessageSender,
  DisabledMessageSender,
} from '../messaging/application/ports';
import { MessageController } from '../messaging/http/message.controller';
import { ConsultationService } from '../operation/application/consultation.service';
import { ConsultationController } from '../operation/http/consultation.controller';
import { ItineraryService } from '../itinerary/application/itinerary.service';
import { ItineraryController } from '../itinerary/http/itinerary.controller';

@Module({
  controllers: [
    ItineraryController,
    ConsultationController,
    MessageController,
    CorrectionController,
    OperationController,
    RegistryController,
    CalendarController,
    LocationController,
    JourneyController,
    PatternController,
    FleetController,
  ],
})
export class RegistryModule {
  static register(
    config: DatabaseConfig,
    evolution?: EvolutionConfig,
    gemini?: GeminiConfig,
  ): DynamicModule {
    return {
      module: RegistryModule,
      imports: [WhatsAppModule.register(config, evolution, gemini)],
      providers: [
        {
          provide: ItineraryService,
          useFactory: (
            store: RegistryStore,
            operations: OperationService,
            consultations: ConsultationService,
          ) =>
            new ItineraryService(
              store,
              new SystemClock(),
              operations,
              consultations,
            ),
          inject: [RegistryStore, OperationService, ConsultationService],
        },
        {
          provide: ConsultationService,
          useFactory: (store: RegistryStore, operations: OperationService) =>
            new ConsultationService(store, new SystemClock(), operations),
          inject: [RegistryStore, OperationService],
        },
        {
          provide: MessageSender,
          useFactory: (store: WhatsAppStore) =>
            evolution
              ? new EvolutionSender(store, evolution)
              : new DisabledMessageSender(),
          inject: [WhatsAppStore],
        },
        {
          provide: MessageService,
          useFactory: (
            store: RegistryStore,
            sender: MessageSender,
            journeys: JourneyService,
          ) => new MessageService(store, new SystemClock(), sender, journeys),
          inject: [RegistryStore, MessageSender, JourneyService],
        },
        {
          provide: CorrectionService,
          useFactory: (store: RegistryStore) =>
            new CorrectionService(store, new SystemClock()),
          inject: [RegistryStore],
        },
        {
          provide: OperationService,
          useFactory: (store: RegistryStore) =>
            new OperationService(store, new SystemClock()),
          inject: [RegistryStore],
        },
        {
          provide: FleetService,
          useFactory: (store: RegistryStore) => new FleetService(store),
          inject: [RegistryStore],
        },
        {
          provide: PatternService,
          useFactory: (store: RegistryStore) =>
            new PatternService(store, new SystemClock()),
          inject: [RegistryStore],
        },
        {
          provide: JourneyService,
          useFactory: (store: RegistryStore) =>
            new JourneyService(store, new SystemClock()),
          inject: [RegistryStore],
        },
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
        ItineraryService,
        ConsultationService,
        MessageService,
        CorrectionService,
        OperationService,
        FleetService,
        PatternService,
        JourneyService,
        RegistryService,
        EnrollmentGate,
        EligibilityService,
        LocationService,
      ],
    };
  }
}
