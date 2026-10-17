import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PICNIC } from './layout';
import { terrainHeight } from './hq/Terrain';
import { surfaceTexture } from './surfaceTextures';
import { picnicLayout } from './picnicLayout';

export function DistrictDetails({table=false,level=0}:{table?:boolean;level?:number}) {
  const layout = picnicLayout(table, level);
  const cloth=useMemo(()=>{
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;
    g.fillStyle=level?'#f8df9b':'#e5edcb';g.fillRect(0,0,128,128);
    for(let i=0;i<8;i++){g.fillStyle=i%2?'#73b5a3':'#bad8c5';g.globalAlpha=.35;g.fillRect(i*16,0,8,128);g.fillRect(0,i*16,128,8);}
    g.globalAlpha=1;g.strokeStyle='#fff9e4';g.lineWidth=3;g.setLineDash([4,3]);g.strokeRect(5,5,118,118);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  },[level]);
  // Follow the ground, rather than burying a flat cloth in its grassy shoulder.
  const geometry=useMemo(()=>{
    const g=new THREE.PlaneGeometry(layout.clothWidth,layout.clothDepth,16,12);g.rotateX(-Math.PI/2);
    const p=g.attributes.position,base=terrainHeight(PICNIC.x,PICNIC.z);
    for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(PICNIC.x+p.getX(i),PICNIC.z+p.getZ(i))-base+.025);
    g.computeVertexNormals();return g;
  },[layout.clothWidth,layout.clothDepth]);
  useEffect(()=>()=>cloth.dispose(),[cloth]);useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group name="district-details" position={[PICNIC.x,terrainHeight(PICNIC.x,PICNIC.z),PICNIC.z]}>
    <mesh geometry={geometry} receiveShadow><meshStandardMaterial map={cloth} bumpMap={surfaceTexture('weave')} bumpScale={.008} roughness={1} side={THREE.DoubleSide}/></mesh>
    {[-1,1].map(side=><group key={side} position={[side*layout.cushionX,terrainHeight(PICNIC.x+side*layout.cushionX,PICNIC.z-.15)-terrainHeight(PICNIC.x,PICNIC.z)+.105,-.15]}>
      <RoundedBox args={[.48,.16,.48]} radius={.065} smoothness={2} castShadow receiveShadow><meshStandardMaterial color={side<0?'#f0bd98':'#87bfae'} map={surfaceTexture('weave')} roughness={1}/></RoundedBox>
      <mesh rotation-x={-Math.PI/2} position-y={.081}><torusGeometry args={[.16,.009,4,24]}/><meshStandardMaterial color="#fff3d3"/></mesh>
    </group>)}
    <group position={[0,layout.bookY,layout.bookZ]} rotation-y={-.2}>
      <RoundedBox args={[.53,.025,.38]} radius={.014} smoothness={2}><meshStandardMaterial color="#2684bd"/></RoundedBox>
      {[-1,1].map(side=><group key={side} position={[side*.12,.035,0]} rotation-z={side*.06}>
        <RoundedBox args={[.24,.035,.34]} radius={.008} smoothness={2}><meshStandardMaterial color="#fff9e6" roughness={1}/></RoundedBox>
        <mesh rotation-x={-Math.PI/2} position={[0,.019,-.06]}><circleGeometry args={[.052,12]}/><meshStandardMaterial color={side<0?'#72cba7':'#ffe36d'}/></mesh>
        {[-.01,.04,.09].map(z=><mesh key={z} rotation-x={-Math.PI/2} position={[0,.019,z]}><planeGeometry args={[.14,.009]}/><meshStandardMaterial color="#9cbcc4"/></mesh>)}
      </group>)}
    </group>
    {level===2&&[-1,1].map(side=><group key={side} name="picnic-flower-pot" position={[side*1.08,.1,.6]}>
      <mesh castShadow><cylinderGeometry args={[.1,.075,.14,12]}/><meshStandardMaterial color="#f0bd98" roughness={.9}/></mesh>
      <mesh position-y={.12}><cylinderGeometry args={[.012,.012,.17,6]}/><meshStandardMaterial color="#6a9c70"/></mesh>
      {[0,1,2,3,4].map(i=><mesh key={i} position={[Math.sin(i*Math.PI*.4)*.05,.21,Math.cos(i*Math.PI*.4)*.05]} scale={[1,.4,1]}><sphereGeometry args={[.045,8,6]}/><meshStandardMaterial color="#fff9e4"/></mesh>)}
      <mesh position-y={.22}><sphereGeometry args={[.03,8,6]}/><meshStandardMaterial color="#ffe36d"/></mesh>
    </group>)}
    {level>0&&<group name="picnic-snack-plate" position={[.16,layout.snackY,layout.snackZ]}>
      <mesh receiveShadow><cylinderGeometry args={[.22,.19,.035,24]}/><meshStandardMaterial color="#fffef7" roughness={.75}/></mesh>
      <mesh rotation-x={-Math.PI/2} position-y={.022}><torusGeometry args={[.2,.012,6,24]}/><meshStandardMaterial color="#2684bd"/></mesh>
      {[0,1,2].slice(0,level===2?3:2).map(i=><group key={i} position={[(i-1)*.1,.07,0]}><mesh castShadow><sphereGeometry args={[.06,12,8]}/><meshStandardMaterial color={i%2?'#ffe36d':'#f38e78'} roughness={.7}/></mesh><mesh position={[0,.057,0]} rotation-z={.5}><sphereGeometry args={[.025,8,6]}/><meshStandardMaterial color="#72a66a"/></mesh></group>)}
    </group>}
  </group>;
}
