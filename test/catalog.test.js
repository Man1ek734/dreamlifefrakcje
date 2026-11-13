import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS, MANAGED_SLUGS, detectChannelSlug, makeReport, suggestEmojiOnlyName } from '../src/catalog.js';

test('50 unikalnych aut w szesciu grupach', () => {
  const cars = Object.values(CHANNELS).flatMap(x => x.vehicles);
  assert.equal(cars.length, 50);
  assert.equal(new Set(cars).size, cars.length);
  assert.equal(MANAGED_SLUGS.length, 5);
});
test('rozpoznaje istniejacy format kanalow', () => {
  assert.equal(detectChannelSlug('🚙｜off-road'), 'off-road');
  assert.equal(detectChannelSlug('🚘 | sedany'), 'sedany');
  assert.equal(detectChannelSlug('🏎️│pojazdy-sportowe'), 'pojazdy-sportowe');
  assert.equal(detectChannelSlug('inny'), null);
});
test('zmienia tylko emoji przed separatorem', () => {
  assert.equal(suggestEmojiOnlyName('🚙 | musclecar', 'musclecar'), '🏁 | musclecar');
  assert.equal(suggestEmojiOnlyName('🚘 │ sedany', 'sedany'), null);
  assert.equal(suggestEmojiOnlyName('off-road', 'off-road'), null);
});
test('duplikaty sa pomijane', () => {
  const out = makeReport([
    {id:'1', name:'🚙 | off-road', type:0},
    {id:'2', name:'🚗 | off-road', type:0}
  ]);
  assert.deepEqual(out.ambiguities,['off-road']);
  assert.equal(out.matches.filter(x => x.suggestedName).length, 0);
});
