import test from 'node:test';
import assert from 'node:assert/strict';
import {PLACES,DISTRICTS,HOMES,placeById,placesIn,whereNow,homeOf} from '../../src/island/world';
import {CREATURES} from '../../src/data/creatures';
import {LEARNING_UNITS} from '../../src/data/curriculum';

test('fourteen places on the illustration, each in one of the five areas, every area has somewhere to go',()=>{
 assert.equal(PLACES.length,14);assert.equal(new Set(PLACES.map(p=>p.id)).size,14);
 for(const p of PLACES){assert.ok(p.spot[0]>0&&p.spot[0]<100&&p.spot[1]>0&&p.spot[1]<100,p.id);assert.ok(DISTRICTS.some(d=>d.id===p.district));}
 for(const d of DISTRICTS)assert.ok(placesIn(d.id).length>=2,d.id);
});

test('every companion species has a home and a favourite place that exist; lessons and plots resolve to places',()=>{
 for(const species of new Set(CREATURES.map(c=>c.species))){assert.ok(HOMES[species],species);assert.ok(placeById(HOMES[species].home));assert.ok(placeById(HOMES[species].favorite));}
 for(const u of LEARNING_UNITS)assert.ok(placeById(u.station),u.station);
 assert.equal(placeById('farm-2')?.id,'farm');assert.equal(placeById('bed-0')?.id,'tent');assert.equal(placeById('bowl-1')?.id,'fire');assert.equal(placeById('berry-3')?.id,'tree');
 assert.equal(placeById('lamp-0'),undefined,'old 3D props are not places any more');
});

test('a companion is at home most of the time and at its favourite place now and then',()=>{
 const seen=new Set([0,1,2,3].map(cycle=>whereNow('shelly',10,'breezy',cycle,0).id));
 assert.deepEqual([...seen].sort(),['sand','shells']);
 assert.equal(homeOf('nobody').id,'tent','an unknown species still has a place');
});
