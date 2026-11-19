import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FURNITURE} from '../../src/lib/islandLiving';
import {ensureIslandProgress,placeIslandDecoration,validIslandProgress} from '../../src/lib/islandProgress';
import {validateSave} from '../../src/lib/saveValidation';
import {BASE_OBSTACLES,PLAYGROUND,obstacleDist} from '../../src/scene/layout';
import {DECOR_LAYOUT,DECOR_POSTS} from '../../src/scene/decorationLayout';
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
test('fixed decoration footprints clear existing solid facilities and each other',()=>{
 const entries=Object.entries(DECOR_LAYOUT).filter(([id])=>!['track','flags'].includes(id));
 for(const [id,p]of entries)for(const o of BASE_OBSTACLES)assert.ok(obstacleDist(o,p.x,p.z)-o.r-p.r>.1,`${id} clips facility at ${o.x},${o.z}`);
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){const [a,p]=entries[i],[b,q]=entries[j];assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>p.r+q.r+.1,`${a} clips ${b}`);}
 for(const id of ['ball','sand'] as const){const p=DECOR_LAYOUT.rainbow,q=PLAYGROUND[id];assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>p.r+1.2+.1);}
 for(const p of DECOR_POSTS)for(const o of BASE_OBSTACLES)assert.ok(obstacleDist(o,p.x,p.z)>o.r+p.r+.1);
});
