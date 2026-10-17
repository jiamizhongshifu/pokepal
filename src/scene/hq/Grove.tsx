import {useFrame} from '@react-three/fiber';
import { useMemo,useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GROVE_TREES, type GroveKind } from '../layout';
import { terrainHeight } from './Terrain';

/** Rounded, lifted crowns keep the ground and small residents readable. */
function buildTree(kind:GroveKind){
  const parts:THREE.BufferGeometry[]=[];
  const birch=kind==='birch',blossom=kind==='blossom';
  const bark=new THREE.Color(birch?'#ddd7bb':'#a78659');
  const dark=new THREE.Color(blossom?'#b5868c':birch?'#638d63':'#507c52');
  const light=new THREE.Color(blossom?'#f1c9bd':birch?'#b4c98a':'#9fbd76');
  const paint=(geo:THREE.BufferGeometry,base:THREE.Color,top?:THREE.Color)=>{
    const g=geo.index?geo.toNonIndexed():geo;
    if(g!==geo)geo.dispose();
    g.deleteAttribute('uv');
    const p=g.getAttribute('position'),colors=new Float32Array(p.count*3),c=new THREE.Color();
    for(let i=0;i<p.count;i++){
      const t=THREE.MathUtils.clamp((p.getY(i)-1.35)/2.4,0,1);
      c.copy(base);if(top)c.lerp(top,t*.9);
      colors.set([c.r,c.g,c.b],i*3);
    }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(g);
  };
  const branch=(a:THREE.Vector3,b:THREE.Vector3,r:number)=>{
    const g=new THREE.CylinderGeometry(r*.6,r,a.distanceTo(b),10);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize()));
    g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);paint(g,bark);
  };
  branch(new THREE.Vector3(),new THREE.Vector3(.07,2.5,0),birch?.13:.22);
  for(let i=0;i<3;i++){
    const a=i*2.4;
    branch(new THREE.Vector3(0,1.3+i*.16,0),new THREE.Vector3(Math.cos(a)*.75,2.3+i*.16,Math.sin(a)*.65),.085);
  }
  // Bark markings stay broad and sparse rather than noisy photo textures.
  if(birch)for(let i=0;i<5;i++){
    const g=new THREE.CylinderGeometry(.133-i*.009,.133-i*.009,.035,10,1,true,.35+i*.8,1.8);
    g.translate(.02,.32+i*.33,0);paint(g,new THREE.Color('#918f7d'));
  }
  const lobes=birch
    ? [[0,2.55,0,.86,1.08,.8],[-.48,2.2,.05,.64,.8,.65],[.45,2.9,.05,.6,.85,.62],[.05,3.45,0,.52,.65,.55]]
    : [[0,2.9,0,1.12,.92,1],[-.72,2.35,.12,.8,.68,.75],[.7,2.4,.05,.85,.72,.75],[-.15,2.4,.6,.87,.72,.78],[.2,2.5,-.62,.82,.74,.7]];
  for(const [li,[x,y,z,sx,sy,sz]] of lobes.entries()){
    const g=new THREE.SphereGeometry(1,16,12);g.scale(sx,sy,sz);g.translate(x,y,z);paint(g,dark,light);
    for(let i=0;i<4;i++){
      const a=i*2.4+li*.7,ny=.25+(i%3)*.23,rad=Math.sqrt(1-ny*ny);
      const n=new THREE.Vector3(Math.cos(a)*rad,ny,Math.sin(a)*rad);
      const at=new THREE.Vector3(x+n.x*sx,y+n.y*sy,z+n.z*sz);
      const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n);
      if(blossom){
        for(let k=0;k<5;k++){
          const petal=new THREE.SphereGeometry(.085,8,5);petal.scale(1,.28,.65);
          petal.translate(.095,0,0);petal.rotateY(k*Math.PI*2/5);petal.applyQuaternion(q);petal.translate(at.x,at.y,at.z);
          paint(petal,new THREE.Color(i%2?'#fbe0cd':'#f5d4cb'));
        }
        const heart=new THREE.SphereGeometry(.037,8,5);heart.translate(at.x+n.x*.02,at.y+n.y*.02,at.z+n.z*.02);paint(heart,new THREE.Color('#d6b56e'));
      }else{
        const leaf=new THREE.SphereGeometry(1,8,5);leaf.scale(.095,.022,.18);leaf.rotateY(a);leaf.applyQuaternion(q);leaf.translate(at.x,at.y,at.z);
        paint(leaf,light.clone().lerp(dark,.25+i*.08));
      }
    }
  }
  const geometry=mergeGeometries(parts,false)!;parts.forEach(p=>p.dispose());
  geometry.computeBoundingSphere();return geometry;
}

export function Grove({wind=.25}:{wind?:number}){
  const group=useRef<THREE.Group>(null!),time=useRef(0),breeze=useRef(.25);
  useFrame((_,dt)=>{time.current+=Math.min(dt,.05);breeze.current=THREE.MathUtils.damp(breeze.current,wind,1,Math.min(dt,.05));group.current?.children.forEach((tree,i)=>{tree.rotation.z=Math.sin(time.current*.8+i)*.012*breeze.current;});});
  const geos=useMemo(()=>({broadleaf:buildTree('broadleaf'),birch:buildTree('birch'),blossom:buildTree('blossom')}),[]);
  return <group ref={group} name="island-groves">{GROVE_TREES.map(p=><mesh key={p.id} name={p.id} geometry={geos[p.kind]} position={[p.x,terrainHeight(p.x,p.z)-.025,p.z]} scale={p.s} rotation-y={p.yaw} castShadow receiveShadow>
    <meshStandardMaterial vertexColors roughness={.95} envMapIntensity={.3}/>
  </mesh>)}</group>;
}
