import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('Alamo photo replacement only edits the original message', async () => {
  const source = await fs.readFile(new URL('../src/alamoPhoto.js',import.meta.url),'utf8');
  assert.ok(source.includes("const CHANNEL_ID = '1570875064482668581'"));
  assert.ok(source.includes("const MODEL = 'Alamo 2700LX'"));
  assert.ok(source.includes('await listing.edit('));
  assert.ok(source.includes('attachments: [{ id: 0, filename: FILENAME }]'));
  assert.ok(source.includes('files: [imageFile]'));
  assert.ok(source.includes('message.content.startsWith(HEADER)'));
  assert.equal(source.includes('.send('), false);
  assert.equal(source.includes('.channels.create('), false);
});
test('photo exists', async () => {
  const bytes=await fs.readFile(new URL('../assets/alamo_2700lx_user.webp',import.meta.url));
  assert.ok(bytes.length>1000);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
});
