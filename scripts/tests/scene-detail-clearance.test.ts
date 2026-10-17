import {test} from 'node:test';
import assert from 'node:assert/strict';
import {picnicLayout} from '../../src/scene/picnicLayout';
import {pathDetailClear} from '../../src/scene/detailClearance';
import {PATH_CURVES} from '../../src/scene/landscape';
import {BASE_OBSTACLES,PICNIC,TENT,obstacleDist} from '../../src/scene/layout';
import {DECOR_RESERVED} from '../../src/scene/decorationLayout';
import {stoneGeometry} from '../../src/scene/hq/stoneGeometry';
test('picnic book, snacks and cushions clear table in every upgrade combination',()=>{
 for(const table of [false,true])for(const level of [0,1,2]){
  const p=picnicLayout(table,level);
  assert.ok(p.cushionX-.24>.65+.08,'cushion clips tabletop');
  assert.ok(p.cushionX+.24<p.clothWidth/2+.02);
  if(table){assert.ok(p.bookY-.0125>=.35,'book cover buried in tabletop');assert.ok(p.snackY-.0175>=.35,'plate buried in tabletop');}
  const bookFront=p.bookZ+.19*Math.cos(.2)+.265*Math.sin(.2);
  assert.ok(bookFront<p.snackZ-.22,'book overlaps snack plate');
 }
});
test('path details reject facilities, reserved decorations and picnic cloth, but keep walkways',()=>{
 for(const p of [...BASE_OBSTACLES,...DECOR_RESERVED])assert.equal(pathDetailClear(p.x,p.z),false);
 assert.equal(pathDetailClear(PICNIC.x+1.25,PICNIC.z+.8),false);
 const samples=PATH_CURVES.flatMap(c=>c.getSpacedPoints(100));
 const allowed=samples.filter(p=>pathDetailClear(p.x,p.z));
 assert.ok(allowed.length>100,'path detail filtering unexpectedly erased all paths');
 for(const p of allowed)for(const o of BASE_OBSTACLES)assert.ok(obstacleDist(o,p.x,p.z)>=o.r+.44-1e-8);
});
test('camp entrance posts stay outside the tent canopy and clear neighboring supplies',()=>{
 for(const x of [-.95,.95]){
  const z=1.28;assert.ok(((Math.abs(x)-.07)/1.45)**2+((z-.07)/1.2)**2>1);
  const wx=TENT.x+x*Math.cos(.62)+z*Math.sin(.62),wz=TENT.z-x*Math.sin(.62)+z*Math.cos(.62);
  for(const o of BASE_OBSTACLES.filter(o=>o.x!==TENT.x||o.z!==TENT.z))assert.ok(obstacleDist(o,wx,wz)>o.r+.07,`camp post clips ${o.x},${o.z}`);
 }
});
test('stone textures have finite UVs and do not change existing collision bounds',()=>{
 for(const kind of ['coast','perch','fire','path'] as const){const g=stoneGeometry(kind,3);assert.equal(g.attributes.uv.count,g.attributes.position.count);assert.ok([...g.attributes.uv.array].every(Number.isFinite));assert.ok(g.boundingBox!.max.y<=1.001);assert.ok(g.boundingBox!.min.y>=-.001);g.dispose();}
});

test('expanded meadows grow flowers on dry grass instead of fixed offshore coordinates',async()=>{
 const {configureIslandExpansion}=await import('../../src/scene/layout');
 const {createWildflowers,flowerGroundClear}=await import('../../src/scene/wildflowers');
 try {for(const level of [0,1,2]){configureIslandExpansion(level);const flowers=createWildflowers();assert.ok(flowers.every(f=>flowerGroundClear(f.x,f.z)));assert.equal(flowers.some(f=>f.district==='north-meadow'),level>0);}}
 finally {configureIslandExpansion(0);}
});
