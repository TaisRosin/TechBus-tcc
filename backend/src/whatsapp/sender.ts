import { AccessError } from '../access/domain/access';
import {
  MessageSender,
  type SendRequest,
  type SendOutcome,
} from '../messaging/application/ports';
import type { EvolutionConfig } from './config';
import { WhatsAppStore } from './store';

export class EvolutionSender extends MessageSender {
  constructor(
    private readonly store: WhatsAppStore,
    private readonly config: EvolutionConfig,
    private readonly transport: typeof fetch = fetch,
  ) {
    super();
  }
  async send(request: SendRequest): Promise<SendOutcome> {
    if (
      !this.config.sendEnabled ||
      !this.config.testPhones.includes(request.phone)
    )
      return { status: 'failed' };
    const reserved = await this.store.transaction(async (m) => {
      const source = (
        await m.query<
          { message_id: string; phone: string; text: string; status: string }[]
        >(
          'SELECT message_id,phone,text,status FROM app.message_attempts WHERE id=$1 FOR UPDATE',
          [request.attemptId],
        )
      )[0];
      if (
        !source ||
        source.message_id !== request.messageId ||
        source.phone !== request.phone ||
        source.text !== request.text
      )
        throw new AccessError('INVALID_ATTEMPT', 400);
      const existing = (
        await m.query<{ state: string }[]>(
          'SELECT state FROM app.whatsapp_attempts WHERE attempt_id=$1',
          [request.attemptId],
        )
      )[0];
      if (existing) return existing.state;
      if (source.status !== 'sending')
        throw new AccessError('INVALID_ATTEMPT', 400);
      await m.query(
        "INSERT INTO app.whatsapp_attempts(attempt_id,message_id,instance,phone,state,created_at) VALUES($1,$2,$3,$4,'dispatching',now())",
        [
          request.attemptId,
          request.messageId,
          this.config.instance,
          request.phone,
        ],
      );
      return 'reserved';
    });
    if (reserved !== 'reserved')
      return {
        status:
          reserved === 'sent'
            ? 'sent'
            : reserved === 'failed'
              ? 'failed'
              : 'unknown',
      };
    let providerId: string | null = null;
    try {
      const response = await this.transport(
        `${this.config.baseUrl}/message/sendText/${encodeURIComponent(this.config.instance)}`,
        {
          method: 'POST',
          headers: {
            Origin: this.config.baseUrl,
            apikey: this.config.apiKey,
            'Content-Type': 'application/json',
          },
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            number: request.phone.slice(1),
            text: request.text,
            linkPreview: false,
          }),
        },
      );
      if (response.ok) {
        const body: unknown = await response.json();
        if (
          body &&
          typeof body === 'object' &&
          'key' in body &&
          body.key &&
          typeof body.key === 'object' &&
          'id' in body.key &&
          typeof body.key.id === 'string' &&
          body.key.id.length > 0 &&
          body.key.id.length <= 180 &&
          [...body.key.id].every((character) => character.charCodeAt(0) >= 32)
        )
          providerId = body.key.id;
      }
    } catch {
      /* Once dispatched, any transport error can hide a successful send. */
    }
    const status = providerId ? 'sent' : 'unknown';
    try {
      await this.store.transaction(async (m) => {
        await m.query(
          'UPDATE app.whatsapp_attempts SET state=$2,provider_id=$3 WHERE attempt_id=$1',
          [request.attemptId, status, providerId],
        );
      });
    } catch {
      return { status: 'unknown' };
    }
    return { status };
  }
}
