import { Module, type DynamicModule } from '@nestjs/common';
import type { DatabaseConfig } from '../config/environment';
import { SystemClock } from '../shared/time/system-clock';
import type { EvolutionConfig } from './config';
import { WhatsAppController } from './controller';
import { WhatsAppService } from './service';
import { WhatsAppStore } from './store';
import { GeminiInterpreter, type GeminiConfig } from '../interpretation/gemini';
import { InterpretationService } from '../interpretation/service';
import { InterpretationController } from '../interpretation/controller';
import { InterpretationApplication } from '../interpretation/application';
import { ConversationProcessor } from '../interpretation/processor';
import { AcknowledgementDispatcher } from './acknowledgement-dispatcher';
@Module({})
export class WhatsAppModule {
  static register(
    database: DatabaseConfig,
    config?: EvolutionConfig,
    gemini?: GeminiConfig,
  ): DynamicModule {
    return {
      module: WhatsAppModule,
      controllers: [WhatsAppController, InterpretationController],
      providers: [
        {
          provide: AcknowledgementDispatcher,
          useFactory: (store: WhatsAppStore) =>
            new AcknowledgementDispatcher(store, new SystemClock(), config),
          inject: [WhatsAppStore],
        },
        {
          provide: ConversationProcessor,
          useFactory: (
            store: WhatsAppStore,
            interpreter: InterpretationService,
            application: InterpretationApplication,
          ) =>
            new ConversationProcessor(
              store,
              new SystemClock(),
              interpreter,
              application,
              config?.instance ?? '',
              config?.processEnabled ?? false,
            ),
          inject: [
            WhatsAppStore,
            InterpretationService,
            InterpretationApplication,
          ],
        },
        {
          provide: InterpretationApplication,
          useFactory: (store: WhatsAppStore) =>
            new InterpretationApplication(store, new SystemClock()),
          inject: [WhatsAppStore],
        },
        {
          provide: InterpretationService,
          useFactory: (store: WhatsAppStore) =>
            new InterpretationService(
              store,
              new SystemClock(),
              new GeminiInterpreter(gemini),
            ),
          inject: [WhatsAppStore],
        },
        {
          provide: WhatsAppStore,
          useFactory: () => new WhatsAppStore(database),
        },
        {
          provide: WhatsAppService,
          useFactory: (store: WhatsAppStore) =>
            new WhatsAppService(store, new SystemClock(), config),
          inject: [WhatsAppStore],
        },
      ],
      exports: [WhatsAppStore],
    };
  }
}
