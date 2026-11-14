import assert from 'node:assert/strict';
import test from 'node:test';
import { getTicketOwner } from '../src/dodaj.js';

test('valid ticket topic is accepted for /dodaj', () => {
  assert.equal(getTicketOwner({
    type:0, parentId:'1570871157870166179',
    name:'ticket-54',
    topic:'dlshop-owner:123456789012345678;active;number:54'
  }), '123456789012345678');
});
test('cannot use /dodaj outside valid tickets', () => {
  for (const channel of [
    {type:0,parentId:'other',name:'ticket-54',topic:'dlshop-owner:123456789012345678;active;number:54'},
    {type:0,parentId:'1570871157870166179',name:'off-road',topic:'dlshop-owner:123456789012345678;active;number:54'},
    {type:0,parentId:'1570871157870166179',name:'ticket-54',topic:''},
    {type:4,parentId:'1570871157870166179',name:'ticket-54',topic:'dlshop-owner:123456789012345678;active;number:54'}
  ]) assert.equal(getTicketOwner(channel), null);
});
