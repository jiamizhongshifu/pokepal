import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {companionShot} from '../../src/scene/companionShot';
test('small, tall and wide residents fit the close-up in portrait and landscape',()=>{
 for(const aspect of [375/812,834/1194,1366/1024])for(const [height,width] of [[.62,.6],[2.3,1.4],[1.2,4.8]]){
  const anchor=new Vector3(10,3,-12);const shot=companionShot(anchor,height,width,aspect,44,0);
  const camera=new PerspectiveCamera(44,aspect,.1,320);camera.position.copy(shot.position);camera.lookAt(shot.target);camera.updateMatrixWorld();
  for(const x of [-width/2,width/2])for(const y of [0,height]){const p=anchor.clone().add(new Vector3(x,y,0)).project(camera);assert.ok(Math.abs(p.x)<.95,`horizontal clip ${aspect} ${height} ${width}`);assert.ok(Math.abs(p.y)<.95,`vertical clip ${aspect} ${height} ${width}`);}
  const face=anchor.clone().add(new Vector3(0,height*.7,0)).project(camera);
  if(aspect<1.05)assert.ok(face.y>.1,'face must stay above the bottom interaction card');else assert.ok(Math.abs(face.x)<.1,'face must stay between the corner controls');
 }
});
test('composition follows elevation and bearing without moving the resident',()=>{
 const p=new Vector3(-3,7,2),copy=p.clone();const a=companionShot(p,1,1,1.3,44,0),b=companionShot(p,1,1,1.3,44,Math.PI/2);
 assert.deepEqual(p,copy);assert.ok(a.position.z>p.z);assert.ok(b.position.x>p.x);assert.equal(a.distance,b.distance);assert.ok(a.position.y>p.y);
});
