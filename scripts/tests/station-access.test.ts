import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STATIONS,planStationWalk,stationReach} from '../../src/scene/islandLife';
import {configureIslandExpansion,configureIslandDecorations} from '../../src/scene/layout';
import {clearSpot,planWalk} from '../../src/scene/navigation';
import {FURNITURE} from '../../src/lib/islandLiving';
test('main facilities have bounded collision-free approaches for small and broad ground residents',()=>{
 const anchors=JSON.stringify(STATIONS);
 for(const level of [0,2]){
  configureIslandExpansion(level);
  for(const radius of [.82,1.25])for(const station of STATIONS.filter(s=>!s.water&&!s.secondary)){
   const path=planStationWalk({x:0,z:4},station,radius);assert.ok(path.length,`${station.id} radius=${radius} level=${level}`);
   assert.ok(path.every(p=>clearSpot(p,radius)),station.id);
   const end=path.at(-1)!;assert.ok(Math.hypot(end.x-station.x,end.z-station.z)<=stationReach(station,radius),station.id);
  }
 }
 configureIslandExpansion(0);assert.equal(JSON.stringify(STATIONS),anchors);
});
test('a remote inaccessible request has no successful approach instead of a fabricated destination',()=>{
 assert.deepEqual(planWalk({x:0,z:4},{x:100,z:100},.82,[],.8,{center:{x:100,z:100},radius:2}),[]);
});
test('decorations never permit a route through solids or rewrite facility anchors',()=>{
 const anchors=JSON.stringify(STATIONS);configureIslandDecorations(FURNITURE.map(f=>f.id));
 try{for(const station of STATIONS.filter(s=>!s.water&&!s.secondary)){
  const path=planStationWalk({x:0,z:4},station,.82);assert.ok(path.every(p=>clearSpot(p,.82)));
  if(path.length){const end=path.at(-1)!;assert.ok(Math.hypot(end.x-station.x,end.z-station.z)<=stationReach(station,.82));}
 }}finally{configureIslandDecorations([]);}
 assert.equal(JSON.stringify(STATIONS),anchors);
});
