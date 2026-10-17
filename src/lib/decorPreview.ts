import type {FurnitureId} from './islandLiving';
import type {UpgradeId} from './islandProgress';
export type DecorPreview={kind:'decoration';id:FurnitureId}|{kind:'upgrade';id:UpgradeId;level:number;after:boolean;purchased?:boolean};
export function previewLevels(levels:Record<UpgradeId,number>|undefined,preview:DecorPreview|null){
 const actual=levels??{camp:0,picnic:0,garden:0,play:0,island:0};
 if(preview?.kind!=='upgrade'||!preview.after||preview.purchased)return actual;
 return {...actual,[preview.id]:Math.min(2,preview.level+1)};
}
