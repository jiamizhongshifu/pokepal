import assert from 'node:assert/strict';
import { GROVE_TREES, PALMS, HAMMOCK_PALMS, FARM_PLOTS, GRASS_CLEAR, OBSTACLES, obstacleDist, islandK } from '../src/scene/layout';
import { pathDistance } from '../src/scene/landscape';
import { createWildflowers } from '../src/scene/wildflowers';
import { clearSpot, planWalk } from '../src/scene/navigation';
import { stationById } from '../src/scene/islandLife';

for(const p of GROVE_TREES){
  assert.ok(islandK(p.x,p.z)<1.25,`${p.id}: roots stay on land`);
  assert.ok(pathDistance(p.x,p.z)>.4*p.s+.8,`${p.id}: trunk clears the walking lane`);
  for(const bed of FARM_PLOTS)assert.ok(Math.hypot(p.x-bed.x,p.z-bed.z)>1.6*p.s+1.1,`${p.id}: crown clears the crops`);
  const target=stationById(`grove-${p.id}`).target;
  assert.ok(Math.hypot(target.x-p.x,target.z-p.z)<2.7,`${p.id}: tree visit has a nearby approach`);
  for(const start of [{x:0,z:4},{x:-6,z:0},{x:4.9,z:-2.4}]){
    const route=planWalk(start,target);
    assert.ok(route.length&&route.every(p=>clearSpot(p)),`${p.id}: route stays outside obstacles`);
    assert.ok(Math.hypot(route.at(-1)!.x-target.x,route.at(-1)!.z-target.z)<.7,`${p.id}: reachable from each district`);
  }
}
const [a,b]=HAMMOCK_PALMS.map(i=>PALMS[i]);
assert.ok(a&&b,'hammock retains two valid tree anchors');
const span=Math.hypot(a.x-b.x,a.z-b.z);
assert.ok(span>2&&span<5,'hammock span stays usable after redistributing palms');
const flowers=createWildflowers();
assert.deepEqual(createWildflowers(),flowers,'flower placement remains stable when returning home');
assert.ok(flowers.length>80&&flowers.length<160,'scattered flowers stay within the island instance budget');
for(const district of ['camp','orchard','play','farm','meadow','picnic']){
  assert.ok(flowers.filter(p=>p.district===district).length>=3,`${district}: visible flower accents`);
}
for(const [i,p] of flowers.entries()){
  assert.ok(islandK(p.x,p.z)<1,'flowers stay on dry ground');
  assert.ok(pathDistance(p.x,p.z)>=1.18,'petals leave walking paths clear');
  assert.ok(GRASS_CLEAR.every(c=>Math.hypot(p.x-c.x,p.z-c.z)>=c.r+.18),'flowers leave facility approaches clear');
  assert.ok(OBSTACLES.every(o=>obstacleDist(o,p.x,p.z)>=o.r+.28),'flowers do not intersect props');
  assert.ok(flowers.slice(i+1).every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=.24),'individual blooms remain separated');
}
assert.ok(clearSpot({x:5.5,z:1.5}),'removed flowerbed leaves no invisible collision');
console.log(`PASS: tree navigation, hammock anchors and ${flowers.length} flowers across six districts; former flowerbed is walkable.`);
