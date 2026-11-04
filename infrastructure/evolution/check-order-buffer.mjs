import assert from 'node:assert/strict';
import { makeEventBuffer } from '../../.local/evolution-api-2.3.7/node_modules/baileys/lib/Utils/event-buffer.js';
const logger = { debug() {}, trace() {}, warn() {}, info() {}, error() {} };
for (const reverse of [false, true]) {
  const buffer = makeEventBuffer(logger);
  let result;
  buffer.process(events => { result = events['messages.upsert']?.messages[0]; });
  const key = { id: 'synthetic', remoteJid: '5549999999999@s.whatsapp.net', fromMe: false };
  const original = { key, messageTimestamp: 100, message: { conversation: 'vou' }, techbusOriginalOrder: { source: 'wa-stanza-v1', seconds: 100 } };
  const notification = { key, messageTimestamp: 200 };
  buffer.buffer();
  for (const message of reverse ? [notification, original] : [original, notification])
    buffer.emit('messages.upsert', { type: 'append', messages: [message] });
  buffer.flush();
  // Loss of provenance must remain detectable; never fall back to the mutated timestamp.
  assert.equal(result.techbusOriginalOrder?.seconds, 100);
  console.log(JSON.stringify({ reverse, originalPreserved: !!result.techbusOriginalOrder, ordinaryTimestamp: result.messageTimestamp }));
}
