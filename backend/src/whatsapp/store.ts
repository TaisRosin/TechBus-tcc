import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import type { DatabaseConfig } from '../config/environment';
import type { Clock } from '../shared/time/clock';
import { operationalDate } from '../shared/time/operational-date';
import { journeyQueries } from '../journey/infrastructure/journey-queries';
import { AccessError } from '../access/domain/access';
import { eventFingerprint, type WhatsAppEvent } from './domain';

export class WhatsAppStore {
  private readonly source: DataSource;
  private initializing?: Promise<DataSource>;
  private closed = false;
  constructor(config: DatabaseConfig) {
    this.source = new DataSource({
      type: 'postgres',
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.user,
      password: config.password,
      schema: 'app',
      synchronize: false,
      migrationsRun: false,
      logging: false,
      entities: [],
      extra: { max: 2, connectionTimeoutMillis: 2000, statement_timeout: 2000 },
    });
  }
  async transaction<T>(work: (m: EntityManager) => Promise<T>): Promise<T> {
    try {
      if (this.closed) throw new AccessError('WHATSAPP_UNAVAILABLE', 503);
      if (!this.source.isInitialized) {
        this.initializing ??= this.source
          .initialize()
          .catch((error: unknown) => {
            this.initializing = undefined;
            throw error;
          });
        await this.initializing;
      }
      return await this.source.transaction(work);
    } catch (error) {
      if (error instanceof AccessError) throw error;

      console.error('[WhatsAppStore] WHATSAPP_UNAVAILABLE');

      throw new AccessError('WHATSAPP_UNAVAILABLE', 503);
    }
  }
  receive(
    instance: string,
    event: WhatsAppEvent,
    clock: Clock,
  ): Promise<{ id: string; disposition: string }> {
    return this.transaction(async (m) => {
      await m.query('SELECT pg_advisory_xact_lock(82406,1)');
      const fingerprint = eventFingerprint(event);
      const existing = (
        await m.query<
          { id: string; fingerprint: string; disposition: string }[]
        >(
          'SELECT id,fingerprint,disposition FROM app.whatsapp_events WHERE instance=$1 AND kind=$2 AND external_id=$3',
          [instance, event.kind, event.externalId],
        )
      )[0];
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          await m.query(
            'UPDATE app.whatsapp_events SET conflict=true WHERE id=$1',
            [existing.id],
          );
        return { id: existing.id, disposition: existing.disposition };
      }
      const id = randomUUID(),
        receivedAt = clock.now();
      const student =
        event.kind === 'message' && event.phone
          ? (
              await m.query<{ id: string }[]>(
                'SELECT id FROM app.students WHERE phone=$1 FOR UPDATE',
                [event.phone],
              )
            )[0]
          : undefined;
      if (student) {
        const journeys = journeyQueries(m);
        await journeys.receive({
          id,
          studentId: student.id,
          sequence: await journeys.nextSequence(student.id),
          receivedAt,
          date: operationalDate(receivedAt),
          ordering: 'uncertain',
          result: null,
        });
      }
      const disposition =
        event.kind === 'message' && event.phone && !student
          ? 'unknown_contact'
          : event.disposition;
      await m.query(
        `INSERT INTO app.whatsapp_events(id,instance,kind,external_id,fingerprint,received_at,phone,text_body,provider_status,student_id,receipt_id,disposition,original_order)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)`,
        [
          id,
          instance,
          event.kind,
          event.externalId,
          fingerprint,
          receivedAt,
          event.phone,
          event.text,
          event.providerStatus,
          student?.id ?? null,
          student ? id : null,
          disposition,
          event.originalOrder ? JSON.stringify(event.originalOrder) : null,
        ],
      );
      return { id, disposition };
    });
  }
  async close(): Promise<void> {
    this.closed = true;
    if (this.initializing) await this.initializing.catch(() => undefined);
    if (this.source.isInitialized) await this.source.destroy();
  }
  onModuleDestroy(): Promise<void> {
    return this.close();
  }
}
