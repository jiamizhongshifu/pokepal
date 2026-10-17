import { DECOR_RESERVED } from './decorationLayout';
import { GRASS_CLEAR, OBSTACLES, grassMask, islandExpansion, islandK, obstacleDist } from './layout';
import { landscapeAt, pathDistance } from './landscape';

export type FlowerKind = 'cosmos' | 'tulip' | 'pansy';
export interface Wildflower { x:number; z:number; scale:number; color:string; kind:FlowerKind; district:string }

// Small, separated groups instead of a perimeter border or a single flowerbed.
const districts: {id:string; bounds:[number,number,number,number]; kinds:FlowerKind[]; colors:string[]}[] = [
  {id:'camp',bounds:[-12,-2,-11,-7],kinds:['cosmos','pansy'],colors:['#fff2d5','#eacb86']},
  {id:'orchard',bounds:[1,9,-11,-6],kinds:['cosmos','pansy'],colors:['#eee2f6','#bca8d9']},
  {id:'play',bounds:[-12,-5,-5,2],kinds:['tulip','cosmos'],colors:['#f1bcae','#ffe0a0']},
  {id:'farm',bounds:[1,9,-6,-1],kinds:['cosmos','tulip'],colors:['#fff1cf','#efc58b']},
  {id:'meadow',bounds:[3.5,8.8,-.5,4.2],kinds:['pansy','cosmos'],colors:['#c4b1df','#f4d5e1']},
  {id:'picnic',bounds:[-7,-1,2.2,6],kinds:['cosmos','tulip'],colors:['#fff0d1','#edbfce']}
];

export function flowerGroundClear(x:number,z:number) {
  if(islandK(x,z)>.98 || Math.max(grassMask(x,z),landscapeAt(x,z).lawn)<.55) return false;
  // Allow for the petal spread, not just the stem, beside paths and facilities.
  if(pathDistance(x,z)<1.18) return false;
  if(GRASS_CLEAR.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+.18)) return false;
  return ![...OBSTACLES,...DECOR_RESERVED].some(o=>obstacleDist(o,x,z)<o.r+.28);
}

export function createWildflowers():Wildflower[] {
  let seed=8617;
  const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const flowers:Wildflower[]=[];
  const centers:{x:number;z:number}[]=[];
  const regions = islandExpansion ? [...districts,{id:'north-meadow',bounds:[-9,5,-18,-11] as [number,number,number,number],kinds:['cosmos','pansy'] as FlowerKind[],colors:['#fff1cf','#edbfce']}] : districts;
  for(const district of regions){
    const [x0,x1,z0,z1]=district.bounds;
    let patches=0;
    for(let attempt=0;attempt<2400 && patches<6;attempt++){
      const cx=x0+random()*(x1-x0),cz=z0+random()*(z1-z0);
      if(!flowerGroundClear(cx,cz)||centers.some(p=>Math.hypot(cx-p.x,cz-p.z)<.95))continue;
      const kind=district.kinds[patches%district.kinds.length];
      const color=district.colors[patches%district.colors.length];
      const desired=3+Math.floor(random()*3);
      let count=0;
      for(let trial=0;trial<45 && count<desired;trial++){
        const angle=random()*Math.PI*2,radius=Math.sqrt(random())*.53;
        const x=cx+Math.cos(angle)*radius,z=cz+Math.sin(angle)*radius;
        if(!flowerGroundClear(x,z)||flowers.some(p=>Math.hypot(x-p.x,z-p.z)<.24))continue;
        flowers.push({x,z,kind,color,scale:1.3+random()*.55,district:district.id});
        count++;
      }
      if(count){centers.push({x:cx,z:cz});patches++;}
    }
  }
  return flowers;
}
