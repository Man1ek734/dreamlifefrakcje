import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('Vigero ZX removal affects exactly one existing channel and no other models', async () => {
 const code=await fs.readFile(new URL('../src/removeVigeroZX.js', import.meta.url),'utf8');
 assert.ok(code.includes("const CHANNEL_ID = '1570875068819579071'"));
 assert.ok(code.includes("const VEHICLE = 'Vigero ZX'"));
 assert.ok(code.includes("m.author.id === guild.client.user.id && m.content.startsWith(PREFIX)"));
 assert.ok(code.includes('await msg.delete()'));
 assert.ok(!code.includes('channel.send('));
 assert.ok(!code.includes('channels.create('));
 assert.ok(!code.includes('channel.delete('));
});
test('excluded vehicle is removed from all catalogue files',async()=>{
 const [raw,prices,vehicles] = await Promise.all([
  fs.readFile(new URL('../data/product_gallery.json',import.meta.url),'utf8'),
  fs.readFile(new URL('../data/prices_ic.json',import.meta.url),'utf8'),
  fs.readFile(new URL('../data/vehicles.json',import.meta.url),'utf8')
 ]);
 const data=JSON.parse(raw).products;
 assert.equal(data.length,52);
 assert.equal(data.some(p=>p.name==='Vigero ZX'),false);
 assert.equal('Vigero ZX' in JSON.parse(prices),false);
 const all=Object.values(JSON.parse(vehicles).categories).flatMap(v=>v.vehicles);
 assert.equal(all.includes('Vigero ZX'),false);
});
