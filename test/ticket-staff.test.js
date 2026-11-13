import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';

test('new private tickets grant staff role access', async () => {
  const code = await fs.readFile(new URL('../src/tickets.js', import.meta.url), 'utf8');
  assert.ok(code.includes('DISCORD_TICKET_STAFF_ROLE_ID'));
  assert.ok(code.includes('await guild.roles.fetch(staffId)'));
  assert.ok(code.includes('id: staffRole.id, allow: ['));
  assert.ok(code.includes('PermissionFlagsBits.ViewChannel'));
  assert.ok(code.includes('PermissionFlagsBits.SendMessages'));
  assert.ok(code.includes('PermissionFlagsBits.ReadMessageHistory'));
  assert.ok(code.includes("{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }"));
});
