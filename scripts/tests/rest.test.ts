import test from 'node:test';
import assert from 'node:assert/strict';
import {restPeriod,restingFriends} from '../../src/lib/rest';
import {POKEMON} from '../../src/data/pokemon';

test('rest uses local 21:00–06:00 boundaries, including afternoon and evening',()=>{
 for(const [h,m,expected] of [[0,0,'night'],[5,59,'night'],[6,0,'day'],[12,0,'day'],[20,59,'day'],[21,0,'night'],[23,59,'night']] as const){assert.equal(restPeriod(new Date(2026,9,17,h,m)),expected);}
});
test('rest shows every owned friend with newest first, without mutating the save',()=>{
 const owned=POKEMON.map((p,i)=>({id:p.id,caughtAt:i}));const before=JSON.stringify(owned);
 assert.deepEqual(restingFriends(owned),owned.map(c=>c.id).reverse());
 assert.equal(JSON.stringify(owned),before);assert.deepEqual(restingFriends([]),[]);
 assert.deepEqual(restingFriends([{id:25,caughtAt:1},{id:7,caughtAt:2},{id:6,caughtAt:3},{id:1,caughtAt:4},{id:133,caughtAt:5},{id:1000,caughtAt:6}]),[1000,133,1,6,7,25]);
});
