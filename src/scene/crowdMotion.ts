/** Deterministic local avoidance. Neighbours block space; they never push each other every frame. */
export interface CrowdBody {x:number;z:number;r:number;layer:string;moving:boolean;vx:number;vz:number}
export interface Avoidance {blocker:number|null;side:number}
export const crowd=new Map<number,CrowdBody>();
const gap=(r:number,c:CrowdBody)=>r+c.r+.08;
export function occupiedDestination(id:number,to:{x:number;z:number},radius:number,layer:string,bodies:Map<number,CrowdBody>){
 return [...bodies].some(([other,c])=>other!==id&&c.layer===layer&&!c.moving&&Math.hypot(to.x-c.x,to.z-c.z)<gap(radius,c));
}
export function crowdStep(id:number,from:{x:number;z:number},to:{x:number;z:number},radius:number,layer:string,speed:number,dt:number,bodies:Map<number,CrowdBody>,memory:Avoidance,valid:(p:{x:number;z:number})=>boolean=()=>true){
 const dx=to.x-from.x,dz=to.z-from.z,dist=Math.hypot(dx,dz),step=Math.min(dist,.12,speed*Math.min(dt,.05));
 if(step<=0)return {x:from.x,z:from.z};
 const ux=dx/dist,uz=dz/dist;
 const neighbours=[...bodies].filter(([other,c])=>other!==id&&c.layer===layer&&Math.hypot(from.x-c.x,from.z-c.z)<radius+c.r+2.2);
 let blocker:typeof neighbours[number]|undefined,nearest=Infinity;
 for(const pair of neighbours){const [,c]=pair,rx=c.x-from.x,rz=c.z-from.z,along=rx*ux+rz*uz,across=rx*uz-rz*ux;
  const retain=memory.blocker===pair[0];
  if(along>-.1&&along<gap(radius,c)+1.1&&Math.abs(across)<gap(radius,c)+(retain ? .35 : .18)&&Math.hypot(rx,rz)<nearest){blocker=pair;nearest=Math.hypot(rx,rz);}
 }
 let aimX=ux,aimZ=uz;
 if(blocker){
  const [other,c]=blocker;
  if(memory.blocker!==other){memory.blocker=other;const cross=(c.x-from.x)*uz-(c.z-from.z)*ux;memory.side=Math.abs(cross)>.15?(cross>0?-1:1):1;}
  // Keep the chosen passing side until clear; head-on partners both keep their own right.
  const clearance=gap(radius,c)+.3;
  const rx=c.x-from.x,rz=c.z-from.z,along=rx*ux+rz*uz,across=rx*uz-rz*ux;
  const bend=Math.max(0,clearance-Math.abs(across))/Math.max(.3,along);
  const ax=ux+uz*memory.side*bend*2,az=uz-ux*memory.side*bend*2;
  const length=Math.hypot(ax,az);aimX=ax/length;aimZ=az/length;
 }else memory.blocker=null;
 // Try a stable fan, including a safe wait. Never advance farther into an existing overlap.
 const angles=[0,.4*memory.side,-.4*memory.side,.85*memory.side,-.85*memory.side,1.4*memory.side,-1.4*memory.side];
 const previous=bodies.get(id),previousSpeed=previous?Math.hypot(previous.vx,previous.vz):0;
 let best={x:from.x,z:from.z},score=Infinity;
 for(const angle of angles){
  const vx=aimX*Math.cos(angle)-aimZ*Math.sin(angle),vz=aimX*Math.sin(angle)+aimZ*Math.cos(angle);
  const candidate={x:from.x+vx*step,z:from.z+vz*step};if(!valid(candidate))continue;
  let cost=Math.abs(angle)*.4,blocked=false;
  if(previous&&previousSpeed>.1)cost+=(1-(vx*previous.vx+vz*previous.vz)/previousSpeed)*.7;
  for(const [,c] of neighbours){
   const d0=Math.hypot(from.x-c.x,from.z-c.z),d1=Math.hypot(candidate.x-c.x,candidate.z-c.z),safe=gap(radius,c);
   if(d1<Math.min(d0,safe)-1e-6){blocked=true;break;}
   const rx=c.x-from.x,rz=c.z-from.z,rvx=c.vx-vx*speed,rvz=c.vz-vz*speed;
   const v2=rvx*rvx+rvz*rvz,t=v2>.001?Math.max(0,Math.min(.65,-(rx*rvx+rz*rvz)/v2)):0;
   const predicted=Math.hypot(rx+rvx*t,rz+rvz*t);
   cost+=Math.max(0,safe+.15-predicted)*6;
  }
  if(!blocked&&cost<score){best=candidate;score=cost;}
 }
 return best;
}
/** Resolve spawn/teleport overlap only. Deterministic priority prevents reciprocal pushes. */
export function separateOverlap(id:number,pos:{x:number;z:number},radius:number,layer:string,dt:number,bodies:Map<number,CrowdBody>,valid:(p:{x:number;z:number})=>boolean=()=>true){
 let moved=false;
 for(const [other,c] of bodies){
  if(other>=id||c.layer!==layer)continue;
  const dx=pos.x-c.x,dz=pos.z-c.z,d=Math.hypot(dx,dz),min=gap(radius,c);
  if(d>=min-.002)continue;
  const a=((id*31+other*17)%360)*Math.PI/180,nx=d>.001?dx/d:Math.cos(a),nz=d>.001?dz/d:Math.sin(a);
  const amount=Math.min(min-d,Math.max(0,dt)*1.8);
  for(const angle of [0,.6,-.6,1.2,-1.2]){const x=nx*Math.cos(angle)-nz*Math.sin(angle),z=nx*Math.sin(angle)+nz*Math.cos(angle);const next={x:pos.x+x*amount,z:pos.z+z*amount};
   if(valid(next)&&[...bodies].every(([o,b])=>o===id||b.layer!==layer||Math.hypot(next.x-b.x,next.z-b.z)>=Math.min(Math.hypot(pos.x-b.x,pos.z-b.z),gap(radius,b))-1e-6)){pos.x=next.x;pos.z=next.z;moved=true;break;}
  }
 }
 return moved;
}
export const angleDelta=(from:number,to:number)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
