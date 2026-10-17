import { OBSTACLES, obstacleDist, obstacleNearest, islandK, HIGH_ROCK, type Obstacle } from './layout';
import { terrainHeight } from './groundHeight';
export interface CollisionBody { radius:number; air:boolean; water:boolean; feet:number; height?:number }
function obstacleRadius(o:Obstacle,b:CollisionBody){
 const crown=b.air||(o.canopyBottom!==undefined&&b.feet+(b.height??.8)>=terrainHeight(o.x,o.z)+o.canopyBottom);
 return crown?(o.airRadius??o.r):o.r;
}
/** Height belongs to the actual resident, never to its destination. */
function blocks(o:Obstacle,b:CollisionBody){
 if(b.water&&!o.water)return false;
 if(o.x===HIGH_ROCK.x&&o.z===HIGH_ROCK.z&&b.feet>=HIGH_ROCK.top-.015)return false;
 if(b.air&&b.feet>=terrainHeight(o.x,o.z)+(o.height??2.1)+.12)return false;
 return true;
}
export function residentClear(pos:{x:number;z:number},b:CollisionBody,obstacles=OBSTACLES){
 return obstacles.every(o=>!blocks(o,b)||obstacleDist(o,pos.x,pos.z)>=obstacleRadius(o,b)+b.radius-.001);
}
/** Find a valid point as a whole; sequential pushes can push a resident into the previous obstacle. */
export function safeResidentSpot(pos:{x:number;z:number},b:CollisionBody,obstacles=OBSTACLES){
 const valid=(p:{x:number;z:number})=>residentClear(p,b,obstacles)&&(b.air||b.water||islandK(p.x,p.z)<1.28);
 if(valid(pos))return {...pos};
 let projected={...pos};
 for(let pass=0;pass<8;pass++){
  for(const o of obstacles){if(!blocks(o,b))continue;
   const c=obstacleNearest(o,projected.x,projected.z),dx=projected.x-c.x,dz=projected.z-c.z,d=Math.hypot(dx,dz),min=obstacleRadius(o,b)+b.radius+.015;
   if(d<min){projected={x:c.x+(d>.0001?dx/d:1)*min,z:c.z+(d>.0001?dz/d:0)*min};}
  }
  if(valid(projected))return projected;
 }
 // Bounded recovery for a newly placed decoration or a wider model finishing loading.
 for(let ring=1;ring<=60;ring++)for(let i=0;i<32;i++){
  const a=i*Math.PI/16,p={x:pos.x+Math.cos(a)*ring*.16,z:pos.z+Math.sin(a)*ring*.16};
  if(valid(p))return p;
 }
 return null;
}
export function residentWater(locomotion:string,feet:number,terrain:number,visitingWater?:boolean){
 return visitingWater!==undefined?visitingWater&&terrain<-.12:locomotion==='swim'||feet<=-.159;
}
