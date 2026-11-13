import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('no channel creation in vehicle gallery', async () => {
  const src = await fs.readFile(new URL('../src/vehicleGallery.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('guild.channels.create('));
  assert.match(src, /const KEEP = Object.freeze/);
  assert.match(src, /duplicateMadeByBot/);
  assert.match(src, /previous\.edit/);
});
test('prices for all 52 shop models', async () => {
  const [catalogue,prices] = await Promise.all([
    fs.readFile(new URL('../data/product_gallery.json', import.meta.url), 'utf8'),
    fs.readFile(new URL('../data/prices_ic.json', import.meta.url), 'utf8')
  ]);
  const data = JSON.parse(catalogue).products;
  const pricesData=JSON.parse(prices);
  assert.equal(data.length,52);
  assert.ok(!data.some(p => p.name === 'Vigero ZX'));
  assert.ok(!('Vigero ZX' in pricesData));
  for(const product of data) {
    assert.ok(Number.isInteger(pricesData[product.name]));
    assert.ok(pricesData[product.name] >= 3000);
    assert.ok(pricesData[product.name] <= 40000);
  }
});
