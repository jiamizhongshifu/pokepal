import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PLAZA } from './landscape';
import { terrainHeight } from './hq/Terrain';

/** Flat paving follows the terrain; no raised collider or new navigation obstacle. */
export function LandscapeDetails(){
  const pieces=useMemo(()=>{
    const make=(geo:THREE.BufferGeometry,color:string,offset=.016)=>{
      geo.rotateX(-Math.PI/2);geo.translate(PLAZA.x,0,PLAZA.z);
      const p=geo.getAttribute('position');
      for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(p.getX(i),p.getZ(i))+offset);
      geo.computeVertexNormals();
      return {geo,mat:new THREE.MeshStandardMaterial({color,roughness:1,envMapIntensity:.15})};
    };
    return [
      make(new THREE.CircleGeometry(PLAZA.r,64),'#d1c7a5'),
      make(new THREE.CircleGeometry(1.48,48,0,Math.PI),'#cf9b83',.022),
      make(new THREE.CircleGeometry(1.48,48,Math.PI,Math.PI),'#eee1bf',.022),
      make(new THREE.RingGeometry(1.49,1.55,64),'#f8efd7',.024),
      make(new THREE.PlaneGeometry(2.96,.12,12,1),'#708777',.026),
      make(new THREE.CircleGeometry(.43,32),'#708777',.028),
      make(new THREE.CircleGeometry(.31,32),'#f7eed5',.032),
      make(new THREE.RingGeometry(.23,.25,32),'#c7b98f',.034)
    ];
  },[]);
  useEffect(()=>()=>pieces.forEach(p=>{p.geo.dispose();p.mat.dispose();}),[pieces]);
  return <group name="welcome-paving">{pieces.map((p,i)=><mesh key={i} geometry={p.geo} material={p.mat} receiveShadow/>)}</group>;
}
