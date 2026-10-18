import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {campShot} from '../../src/scene/campShot';
test('camp camera keeps a small or tall partner and the rolling-ball endpoint in view',()=>{
 for(const aspect of [390/844,1180/820,667/375])for(const height of [.6,1.8,3]){
  const anchor=new Vector3(2,.2,-3),actor={position:anchor,height,width:height};
  const shot=campShot([actor],aspect,44),camera=new PerspectiveCamera(44,aspect,.1,320);
  camera.position.copy(shot.position);camera.lookAt(shot.target);camera.updateMatrixWorld();
  for(const point of [anchor.clone().add(new Vector3(0,height*.7,0)),anchor.clone().add(new Vector3(1.8,.25,.15))]){
   const screen=point.project(camera);assert.ok(Math.abs(screen.x)<1&&Math.abs(screen.y)<1,`subject or toy clipped ${aspect} ${height}`);
  }
  assert.ok(shot.position.x>anchor.x+2.6,'child is opposite the ball receiver');
  assert.ok(shot.position.y-anchor.y<height+2,'not an aerial camera');
 }
});
test('two-partner play fits both actors without mutating their positions',()=>{
 const actors=[{position:new Vector3(-2,0,0),height:1,width:1},{position:new Vector3(2,0,0),height:2,width:2}];
 const originals=actors.map(a=>a.position.clone());
 for(const aspect of [.5,1.5]){
  const shot=campShot(actors,aspect,44),camera=new PerspectiveCamera(44,aspect,.1,320);
  camera.position.copy(shot.position);camera.lookAt(shot.target);camera.updateMatrixWorld();
  actors.forEach((a,i)=>{const p=a.position.clone().add(new Vector3(0,a.height*.5,0)).project(camera);assert.ok(Math.abs(p.x)<.95&&Math.abs(p.y)<.95);assert.deepEqual(a.position,originals[i]);});
 }
});
