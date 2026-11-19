import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FURNITURE} from '../../src/lib/islandLiving';
import {ensureIslandProgress,placeIslandDecoration,validIslandProgress} from '../../src/lib/islandProgress';
import {validateSave} from '../../src/lib/saveValidation';
const make=()=>validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));
test('old saves accept absent new area levels, migrate without losing decoration/energy',()=>{
 const s=make();const p=ensureIslandProgress(s);delete (p.levels as any).garden;delete (p.levels as any).play;
 assert.ok(validIslandProgress(p));const restored=validateSave(JSON.parse(JSON.stringify(s)));ensureIslandProgress(restored);
 assert.equal(restored.islandProgress!.levels.garden,0);assert.equal(restored.islandProgress!.levels.play,0);assert.equal(restored.energy,s.energy);
});
test('every decoration is freely placeable, idempotent, reversible and survives export',()=>{
 const s=make();const energy=s.energy;for(const f of FURNITURE){assert.ok(placeIslandDecoration(s,f.id,true));assert.ok(placeIslandDecoration(s,f.id,true));}
 assert.equal(s.energy,energy);assert.equal(s.islandLiving!.furniture.length,12);
 const saved=validateSave(JSON.parse(JSON.stringify(s)));assert.equal(saved.islandLiving!.furniture.length,12);
 for(const f of FURNITURE)assert.ok(placeIslandDecoration(saved,f.id,false));assert.equal(saved.islandLiving!.furniture.length,0);assert.equal(saved.energy,energy);
});
