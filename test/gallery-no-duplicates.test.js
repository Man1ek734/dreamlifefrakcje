import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';

test('vehicle sync never creates channels or publishes posts', async () => {
  const code = await fs.readFile(new URL('../src/vehicleGallery.js', import.meta.url), 'utf8');
  assert.equal(code.includes('guild.channels.create('), false);
  assert.equal(code.includes('await channel.send('), false);
  assert.ok(code.includes('channel.topic ==='));
  assert.ok(code.includes('MANAGED_CATEGORY_ID'));
  assert.ok(code.includes('Object.values(KEEP).includes(channel.id)'));
});
test('cleans duplicated bot-owned entries and protects media', async () => {
  const code = await fs.readFile(new URL('../src/vehicleGallery.js', import.meta.url), 'utf8');
  assert.ok(code.includes('copies.slice(1)'));
  assert.ok(code.includes('await duplicate.delete()'));
  assert.ok(code.includes('await previous.edit('));
  assert.ok(code.includes('attachments: [...previous.attachments.values()]'));
});
