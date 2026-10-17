import type { FurnitureId } from '../lib/islandLiving';
/** Fixed placements shared by rendering, vegetation exclusion and navigation. Flat mats/rails remain walkable. */
export const DECOR_LAYOUT: Record<FurnitureId,{x:number;z:number;r:number;solid?:boolean;water?:boolean}>= {
 basket:{x:8.1,z:1,r:.38,solid:true},table:{x:-2.5,z:6.1,r:.69,solid:true},
 mat:{x:-5.8,z:6.6,r:.84},bush:{x:-3.3,z:2.5,r:.78,solid:true},
 flowers:{x:-4.1,z:1.1,r:.52},lantern:{x:-.9,z:5.3,r:.25,solid:true},
 flags:{x:0,z:0,r:0},track:{x:0,z:0,r:2.1},
 stones:{x:13,z:4.8,r:.95,water:true},
 pinwheel:{x:-3.6,z:-7.6,r:.38,solid:true},shells:{x:7,z:5.6,r:.65},
 rainbow:{x:-7.8,z:3.3,r:.9}
};
export const DECOR_POSTS=[{x:-2.1,z:-.8,r:.2},{x:2.1,z:-.8,r:.2}];
export const DECOR_RESERVED=Object.entries(DECOR_LAYOUT).filter(([id])=>id!=='flags'&&id!=='track').map(([,p])=>p).concat(DECOR_POSTS);

export const DECOR_STONES=[-.6,0,.6].map((x,i)=>({x:DECOR_LAYOUT.stones.x+x,z:DECOR_LAYOUT.stones.z+Math.sin(i)*.3,r:.25,water:true}));
