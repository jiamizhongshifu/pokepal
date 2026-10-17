import { islandK, islandExpansion, decorationRevision } from './layout';
import { residentClear } from './residentCollision';
import { terrainHeight } from './groundHeight';
import type { Spot } from './zones';
const STEP=.3, MIN_X=-19, MIN_Z=-26.1, W=139, H=144;
const point=(i:number):Spot=>({x:MIN_X+(i%W)*STEP,z:MIN_Z+Math.floor(i/W)*STEP});
export function clearSpot(p:Spot,r=.82,height=.8){return islandK(p.x,p.z)<1.28&&residentClear(p,{radius:r,air:false,water:false,feet:terrainHeight(p.x,p.z),height});}
const grids=new Map<string,Uint8Array>();
/** Flood a bounded navigation grid; choose the closest REACHABLE approach, not an isolated gap. */
export function planWalk(from:Spot,to:Spot,r=.82,occupied:readonly {x:number;z:number;r:number}[]=[],height=.8,reach?:{center:Spot;radius:number}):Spot[]{
  const key=`${r}:${height}:${islandExpansion}:${decorationRevision}`;
  if(grids.size>24)grids.clear();
  let free=grids.get(key);
  if(!free){free=new Uint8Array(W*H);for(let i=0;i<free.length;i++)free[i]=Number(clearSpot(point(i),r,height));grids.set(key,free);}
  if(occupied.length){free=free.slice();for(let i=0;i<free.length;i++)if(free[i]){const p=point(i);if(occupied.some(c=>Math.hypot(p.x-c.x,p.z-c.z)<r+c.r+.12))free[i]=0;}}
  let start=-1,dist=Infinity;
  for(let i=0;i<free.length;i++)if(free[i]){const q=point(i),d=(q.x-from.x)**2+(q.z-from.z)**2;if(d<dist){dist=d;start=i;}}
  if(start<0)return [];
  const parent=new Int32Array(W*H).fill(-1),queue=[start];parent[start]=start;
  let best=-1,closest=Infinity;
  for(let k=0;k<queue.length;k++){
    const current=queue[k],q=point(current),d=(q.x-to.x)**2+(q.z-to.z)**2;
    if(d<closest&&(!reach||Math.hypot(q.x-reach.center.x,q.z-reach.center.z)<=reach.radius)){closest=d;best=current;}
    const x=current%W,z=Math.floor(current/W);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      if(x+dx<0||x+dx>=W||z+dz<0||z+dz>=H)continue;
      const next=current+dx+dz*W;
      if(!free[next]||parent[next]!==-1||dx&&dz&&(!free[current+dx]||!free[current+dz*W]))continue;
      const np=point(next);
      if(!clearSpot({x:(q.x+np.x)/2,z:(q.z+np.z)/2},r,height))continue;
      parent[next]=current;queue.push(next);
    }
  }
  if(best<0)return [];
  const path:Spot[]=[];for(let i=best;i!==start;i=parent[i])path.unshift(point(i));
  if(closest<STEP*STEP && (!reach||Math.hypot(to.x-reach.center.x,to.z-reach.center.z)<=reach.radius) && clearSpot(to,r,height) && occupied.every(c=>Math.hypot(to.x-c.x,to.z-c.z)>=r+c.r+.12))path.push(to);
  return path.length?path:[point(best)];
}
