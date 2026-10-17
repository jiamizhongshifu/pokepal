import assert from 'node:assert/strict';
import {activeResidentIds as choose} from '../../src/lib/activeResidents';
const owned=Array.from({length:388},(_,i)=>i+1),first=choose(owned,[],[]);
assert.equal(first.length,12);assert.deepEqual(choose(owned,first,[]),first);
const summoned=choose(owned,first,[388,387,386,385]);assert.equal(summoned.length,12);
for(const id of [388,387,386,385])assert.ok(summoned.includes(id));
assert.deepEqual(choose(owned,summoned,[]),summoned); // dismissing a card cannot send a partner away
assert.equal(owned.length,388);
assert.ok(!choose(owned.slice(0,20),summoned,[388]).includes(388));
assert.equal(new Set(choose(owned,first,[1,1,2,2])).size,12);
assert.deepEqual(choose([],first,[388]),[]);
console.log('Resident cap: collection, stable membership, summon, concurrent activities, removed ownership passed.');
