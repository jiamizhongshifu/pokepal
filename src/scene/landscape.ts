import { CatmullRomCurve3, Vector3 } from 'three';
import { PATH_ROUTES, islandK } from './layout';

/** One path centerline drives the ground material, stones and planting clearance. */
export const PATH_CURVES=PATH_ROUTES.map(route=>new CatmullRomCurve3(route.map(([x,z])=>new Vector3(x,0,z))));
const segments=PATH_CURVES.flatMap(curve=>{
  const p=curve.getSpacedPoints(Math.ceil(curve.getLength()/.35));
  return p.slice(1).map((b,i)=>({ax:p[i].x,az:p[i].z,bx:b.x,bz:b.z}));
});
export const PLAZA={x:.1,z:.8,r:1.65};
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function pathDistance(x:number,z:number){
  let distance=Infinity;
  for(const s of segments){
    const dx=s.bx-s.ax,dz=s.bz-s.az;
    const t=Math.max(0,Math.min(1,((x-s.ax)*dx+(z-s.az)*dz)/(dx*dx+dz*dz||1)));
    distance=Math.min(distance,Math.hypot(x-s.ax-t*dx,z-s.az-t*dz));
  }
  return distance;
}
const lawns=[
  {x:-8,z:-.7,rx:4.0,rz:3.5},
  {x:-6.3,z:-6.1,rx:4.1,rz:2.7},
  {x:4.7,z:-4.1,rx:4.5,rz:2.8},
  {x:-3.4,z:4.1,rx:3.4,rz:2.4},
  {x:6.5,z:1.6,rx:2.8,rz:2.7}
];
export function landscapeAt(x:number,z:number){
  if(islandK(x,z)>1.09)return {lawn:0,path:0};
  const distance=pathDistance(x,z);
  const path=1-smooth(.42,.86,distance);
  const ripple=Math.sin(x*1.7+z*.45)*.045+Math.cos(z*2.1-x*.6)*.025;
  const patch=Math.max(...lawns.map(p=>1-smooth(.76,1.04,Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz)+ripple)));
  const plaza=smooth(PLAZA.r,PLAZA.r+.6,Math.hypot(x-PLAZA.x,z-PLAZA.z));
  return {lawn:patch*(1-path)*plaza*(1-smooth(.96,1.07,islandK(x,z))),path};
}
