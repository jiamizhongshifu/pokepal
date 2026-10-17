import type { SaveData } from '../types';
import { FURNITURE, setFurniture, type FurnitureId } from './islandLiving';
export const UPGRADES=[
 {id:'camp',name:'伙伴营地',icon:'tent',cost:[5,9],changes:['挂上彩旗和温暖门灯','铺好营地地毯，添上星星屋顶']},
 {id:'picnic',name:'野餐角',icon:'apple',cost:[4,8],changes:['铺上花色桌布，放好果盘','添一圈软坐垫和小花装饰']},
 {id:'garden',name:'树果种植区',icon:'seed',cost:[4,8],changes:['给菜地添上薄荷色护边','添上树果装饰和彩色小风车']},
 {id:'play',name:'音乐游乐区',icon:'music',cost:[4,8],changes:['铺好海洋蓝音乐地台','添上星光装饰和黄色舞台边']},
 {id:'island',name:'我们的小岛',icon:'island',cost:[10,15],changes:['向北扩建花草空地，陆地面积增加约 16%','再向北扩建一片空地，总面积增加约 32%']}
] as const;
export type UpgradeId=typeof UPGRADES[number]['id'];
export interface IslandProgress{version:1;owned:FurnitureId[];pending?:FurnitureId;nextGiftAt:number;levels:Record<UpgradeId,number>;}
export function ensureIslandProgress(s:SaveData){
 const p=s.islandProgress??={version:1,owned:[...(s.islandLiving?.furniture??[])],nextGiftAt:120,levels:{camp:0,picnic:0,island:0,garden:0,play:0}};
 p.levels.garden??=0;p.levels.play??=0;return p;
}
/** Saved, active-play countdown. Gifts wait indefinitely; no streak, refresh or paid roll. */
export function tickIslandGift(s:SaveData,seconds:number){
 const p=ensureIslandProgress(s);if(p.pending||p.owned.length===FURNITURE.length)return;
 p.nextGiftAt=Math.max(0,p.nextGiftAt-Math.min(10,Math.max(0,seconds)));
 if(!p.nextGiftAt){const choices=FURNITURE.filter(f=>!p.owned.includes(f.id));p.pending=choices[(s.trainer?.createdAt??0)%choices.length|0].id;}
}
export function useIslandGift(s:SaveData){const p=ensureIslandProgress(s),id=p.pending;if(!id)return false;p.owned=[...new Set([...p.owned,id])];s.islandLiving??={version:1,furniture:[],memories:[]};s.islandLiving.furniture=[...new Set([...s.islandLiving.furniture,id])];delete p.pending;p.nextGiftAt=180+(p.owned.length*47)%180;return id;}
export function upgradeIsland(s:SaveData,id:UpgradeId,expectedLevel:number){const p=ensureIslandProgress(s),spec=UPGRADES.find(u=>u.id===id);if(!spec||!Number.isInteger(expectedLevel)||expectedLevel<0||p.levels[id]!==expectedLevel||expectedLevel>=2)return false;const cost=spec.cost[expectedLevel];if(s.energy<cost)return false;s.energy-=cost;p.levels[id]++;return true;}
export function validIslandProgress(p:any){return p&&p.version===1&&Array.isArray(p.owned)&&p.owned.length<=FURNITURE.length&&new Set(p.owned).size===p.owned.length&&p.owned.every((id:any)=>FURNITURE.some(f=>f.id===id))&&(p.pending===undefined||FURNITURE.some(f=>f.id===p.pending)&&!p.owned.includes(p.pending))&&Number.isFinite(p.nextGiftAt)&&p.nextGiftAt>=0&&p.nextGiftAt<=1000000&&p.levels&&UPGRADES.every(u=>(['garden','play'].includes(u.id)&&p.levels[u.id]===undefined)||(Number.isInteger(p.levels[u.id])&&p.levels[u.id]>=0&&p.levels[u.id]<=2));}

/** Decorations are freely available: one tap places a fixed, reviewed layout. */
export function placeIslandDecoration(s:SaveData,id:FurnitureId,enabled:boolean){
 if(!FURNITURE.some(f=>f.id===id))return false;
 const p=ensureIslandProgress(s);if(enabled)p.owned=[...new Set([...p.owned,id])];
 if(p.pending===id)delete p.pending;
 return setFurniture(s,id,enabled);
}
