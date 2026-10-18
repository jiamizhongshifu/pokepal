import {GROVE_TREES,PALMS} from './layout';
import {clearSpot} from './navigation';
/** Shared with rain rendering: real canopies, never props attached to a resident. */
export const RAIN_CANOPIES=[
 ...GROVE_TREES.filter(t=>t.kind!=='birch').map(t=>({x:t.x,z:t.z,radius:1.5*t.s,bottom:1.35*t.s})),
 ...PALMS.map(t=>({x:t.x,z:t.z,radius:2.6*t.s,bottom:4.3*t.s}))
];
export function rainShelter(height:number,neighbor:number,occupied:readonly {x:number;z:number}[]=[]){
 const radius=Math.max(.82,height*.5);
 for(let j=0;j<RAIN_CANOPIES.length;j++){
  const tree=RAIN_CANOPIES[(j+neighbor)%RAIN_CANOPIES.length];
  if(height+.15>tree.bottom)continue;
  for(let i=0;i<16;i++){
   const angle=(i+neighbor*3)*Math.PI/8,d=Math.max(.6+radius,tree.radius*.65);
   const p={x:tree.x+Math.cos(angle)*d,z:tree.z+Math.sin(angle)*d};
   if(d<=tree.radius&&clearSpot(p,radius,height)&&occupied.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>radius*2+.3))return p;
  }
 }
 return null;
}
