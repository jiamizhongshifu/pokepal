import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {normalizeModel} from '../../src/scene/modelUtil';
import {residentClear,safeResidentSpot,residentWater} from '../../src/scene/residentCollision';
import {OBSTACLES,TENT,HIGH_ROCK,configureIslandDecorations} from '../../src/scene/layout';
import {FURNITURE} from '../../src/lib/islandLiving';
import {crowdStep} from '../../src/scene/crowdMotion';
import {planWalk} from '../../src/scene/navigation';
const ground={radius:.6,air:false,water:false,feet:.05};
test('destination inside a tent never disables its collision',()=>{
 let p=safeResidentSpot({x:TENT.x,z:TENT.z+3.5},ground)!;const memory={blocker:null,side:1};
 for(let i=0;i<300;i++){p=crowdStep(25,p,TENT,.6,'ground',2,.05,new Map(),memory,q=>residentClear(q,ground));assert.ok(residentClear(p,ground));}
 assert.ok(Math.hypot(p.x-TENT.x,p.z-TENT.z)>2.49);
});
test('overlapping obstacles recover to a point clear of every obstacle and stay stable',()=>{
 const obstacles=[{x:0,z:0,r:1},{x:1.1,z:0,r:1},{x:.55,z:1,r:.8}];
 const safe=safeResidentSpot({x:.55,z:.3},ground,obstacles);assert.ok(safe);assert.ok(residentClear(safe,ground,obstacles));
 assert.deepEqual(safeResidentSpot(safe,ground,obstacles),safe);
});
test('all decorated facilities recover broad residents without oscillating',()=>{
 configureIslandDecorations(FURNITURE.map(f=>f.id));
 try{for(const radius of [.35,.8,1.25,2])for(const o of OBSTACLES){const b={...ground,radius},safe=safeResidentSpot(o,b);assert.ok(safe,`${radius} ${o.x},${o.z}`);assert.ok(residentClear(safe,b));assert.deepEqual(safeResidentSpot(safe,b),safe);}}
 finally{configureIslandDecorations([]);}
});
test('slithering on land still collides; swimming and intentional water destinations retain water layer',()=>{
 assert.equal(residentWater('slither',.04,.04),false);assert.equal(residentWater('slither',-.16,-.2),true);assert.equal(residentWater('swim',.04,.04),true);
 assert.equal(residentWater('walk',-.16,.04,true),false);assert.equal(residentWater('walk',-.16,-.2,true),true);
});
test('low flyers avoid tall foliage but clear low objects; stone support only works above the surface',()=>{
 const tree=[{x:0,z:0,r:.4,height:6,airRadius:1.6,canopyBottom:1.5}];
 assert.equal(residentClear({x:1.2,z:0},{...ground,height:.8},tree),true);
 assert.equal(residentClear({x:1.2,z:0},{...ground,height:2.3},tree),false);
 assert.equal(residentClear({x:1,z:0},{...ground,air:true,feet:3},tree),false);
 assert.equal(residentClear({x:1,z:0},{...ground,air:true,feet:7},tree),true);
 assert.equal(residentClear(HIGH_ROCK,{...ground,feet:.1}),false);
 assert.equal(residentClear(HIGH_ROCK,{...ground,feet:HIGH_ROCK.top}),true);
});
test('rotating a normalized wide model keeps its complete footprint inside the measured radius',()=>{
 const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(3,2,1),new THREE.MeshStandardMaterial()));
 const clone=normalizeModel(scene,{file:'test',scale:1.2},{height:2});
 const radius=clone.userData.collisionRadius;
 for(let a=0;a<Math.PI*2;a+=.2){const parent=new THREE.Group();parent.add(clone);parent.rotation.y=a;parent.updateMatrixWorld(true);const points=[[-1.5,-.5],[-1.5,.5],[1.5,-.5],[1.5,.5]];for(const [x,z]of points){const p=new THREE.Vector3(x,0,z).applyMatrix4(clone.matrixWorld);assert.ok(Math.hypot(p.x,p.z)<radius);}parent.remove(clone);}
 assert.ok(radius>1.89);
});
test('larger residents still have reachable safe routes to main activity areas',()=>{
 for(const radius of [.6,.9,1.25])for(const goal of [{x:4.9,z:-2.4},{x:-6.8,z:-4.2},{x:-1.1,z:6.1}]){
  const path=planWalk({x:0,z:3},goal,radius);assert.ok(path.length);
  for(const p of path)assert.ok(residentClear(p,{...ground,radius}));
 }
});
