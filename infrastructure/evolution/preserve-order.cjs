// Reviewed local patch for Evolution 2.3.7 / bundled Baileys.
// Run after dependency installation and before compiling Evolution.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../.local/evolution-api-2.3.7');
const changes = [
  ['node_modules/baileys/lib/Utils/event-buffer.js',
    'message.messageTimestamp = existing.messageTimestamp;',
    `message.messageTimestamp = existing.messageTimestamp;
                    // TechBus: preserve original stanza evidence across notification merges.
                    const oldOrder = existing.techbusOriginalOrder;
                    const newOrder = message.techbusOriginalOrder;
                    if (oldOrder && newOrder && oldOrder.seconds !== newOrder.seconds) {
                        message.techbusOriginalOrder = { source: 'conflict' };
                    } else if (oldOrder) {
                        message.techbusOriginalOrder = oldOrder;
                    }`],
  ['node_modules/baileys/lib/Utils/decode-wa-message.js',
    'messageTimestamp: +stanza.attrs.t,',
    "messageTimestamp: +stanza.attrs.t,\n        techbusOriginalOrder: { source: 'wa-stanza-v1', seconds: +stanza.attrs.t },"],
  ['src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts',
    'this.sendDataWebhook(Events.MESSAGES_UPSERT, messageRaw);',
    'this.sendDataWebhook(Events.MESSAGES_UPSERT, { ...messageRaw, techbusOriginalOrder: (received as any).techbusOriginalOrder ?? null });'],
];
// Validate every target before writing any file. Repeated execution is safe.
const writes = changes.map(([relative, before, after]) => {
  const file = path.join(root, relative);
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(after)) return null;
  if (text.split(before).length !== 2) throw new Error('UNEXPECTED_PROVIDER_SOURCE');
  return { file, text: text.replace(before, after) };
});
for (const change of writes) if (change) fs.writeFileSync(change.file, change.text);
console.log('Original-order projection patched; rebuild required.');
