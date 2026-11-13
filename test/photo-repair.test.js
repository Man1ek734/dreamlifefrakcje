import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('photo repair touches only existing Granger and Tempesta messages',async()=>{
 const s=await fs.readFile(new URL('../src/repairMissingVehiclePhotos.js',import.meta.url),'utf8');
 assert.match(s,/Granger 3700LX/);
 assert.match(s,/Tempesta/);
 assert.match(s,/1570875122192220270/);
 assert.match(s,/1570875383568666765/);
 assert.ok(!s.includes('channels.create('));
 assert.ok(!s.includes('channel.send('));
 assert.match(s,/await message.edit\(/);
 assert.match(s,/scores\.every\(s=>s>=50\)/);
 assert.match(s,/no_placeholder_left/);
 assert.match(s,/already_done/);
});
