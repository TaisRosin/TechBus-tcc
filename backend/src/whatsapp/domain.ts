import { createHash } from 'node:crypto';
import { AccessError } from '../access/domain/access';
import { parseProviderOrder, type ProviderOrder } from './provider-order';

export interface WhatsAppEvent {
  replyTo?: string;
  originalOrder?: ProviderOrder;
  kind: 'message' | 'status' | 'connection';
  externalId: string;
  phone: string | null;
  text: string | null;
  providerStatus: string | null;
  disposition: 'pending' | 'identity_pending' | 'needs_text' | 'evidence';
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AccessError('INVALID_INPUT', 400);
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.length ||
    value.length > 200 ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  )
    throw new AccessError('INVALID_INPUT', 400);
  return value;
}
function phone(jid: unknown): string | null {
  return typeof jid === 'string' && /^[1-9]\d{7,14}@s\.whatsapp\.net$/.test(jid)
    ? `+${jid.split('@')[0]}`
    : null;
}
export function eventFingerprint(event: WhatsAppEvent): string {
  return createHash('sha256').update(JSON.stringify(event)).digest('hex');
}
export function projectWebhook(
  input: unknown,
  instance: string,
): WhatsAppEvent | null {
  const envelope = object(input);
  if (envelope.instance !== instance)
    throw new AccessError('UNAUTHENTICATED', 401);
  if (
    !['messages.upsert', 'messages.update', 'connection.update'].includes(
      String(envelope.event),
    )
  )
    return null;
  const data = object(envelope.data);
  if (envelope.event === 'messages.upsert') {
    const key = object(data.key);
    if (typeof key.fromMe !== 'boolean' || typeof key.remoteJid !== 'string')
      throw new AccessError('INVALID_INPUT', 400);
    if (
      key.fromMe ||
      key.remoteJid.endsWith('@g.us') ||
      key.remoteJid.endsWith('@broadcast')
    )
      return null;
    const externalId = id(key.id);
    const provenPhone =
      phone(key.remoteJid) ??
      (key.remoteJid.endsWith('@lid') ? phone(key.remoteJidAlt) : null);
    const message = object(data.message);
    const extended =
      message.extendedTextMessage === undefined
        ? undefined
        : object(message.extendedTextMessage);
    const contexts = [extended?.contextInfo, data.contextInfo]
      .filter((v) => v !== undefined && v !== null)
      .map(object);
    const quotes = contexts
      .map((v) => v.stanzaId)
      .filter((v) => v !== undefined)
      .map(id);
    const replyTo =
      quotes.length && quotes.every((v) => v === quotes[0])
        ? quotes[0]
        : undefined;
    let text: unknown = message.conversation;
    if (text === undefined && message.extendedTextMessage !== undefined)
      text = object(message.extendedTextMessage).text;
    if (
      text !== undefined &&
      (typeof text !== 'string' || !text.trim() || text.length > 4096)
    )
      throw new AccessError('INVALID_INPUT', 400);
    return {
      kind: 'message',
      ...(replyTo ? { replyTo } : {}),
      ...(parseProviderOrder(data.techbusOriginalOrder)
        ? { originalOrder: parseProviderOrder(data.techbusOriginalOrder)! }
        : {}),
      externalId,
      phone: provenPhone,
      text: typeof text === 'string' ? text : null,
      providerStatus: null,
      disposition: !provenPhone
        ? 'identity_pending'
        : text === undefined
          ? 'needs_text'
          : 'pending',
    };
  }
  if (envelope.event === 'messages.update') {
    if (data.fromMe !== true) return null;
    const keyId = id(data.keyId);
    const status = String(data.status);
    if (
      ![
        'ERROR',
        'PENDING',
        'SERVER_ACK',
        'DELIVERY_ACK',
        'READ',
        'PLAYED',
      ].includes(status)
    )
      throw new AccessError('INVALID_INPUT', 400);
    return {
      kind: 'status',
      externalId: id(`${keyId}:${status}`),
      phone: phone(data.remoteJid),
      text: null,
      providerStatus: status,
      disposition: 'evidence',
    };
  }
  if (!['open', 'close', 'connecting'].includes(String(data.state)))
    throw new AccessError('INVALID_INPUT', 400);
  // Connection state is evidence, never a student command or a send retry authorization.
  return {
    kind: 'connection',
    externalId: String(data.state),
    phone: null,
    text: null,
    providerStatus: String(data.state),
    disposition: 'evidence',
  };
}
