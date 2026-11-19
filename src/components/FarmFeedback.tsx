import {Icon} from '../icons';
import {CropBadge} from './FarmPanel';
import {CROPS,type CropKind} from '../lib/farm';
import './farm-feedback.css';
export interface FarmNotice {text:string;harvest?:{berry:CropKind;count:number;total:number}}
/** A receipt for the saved harvest, not a new claim/reward action. */
export function FarmFeedback({notice,canShare,onShare,onClose}:{notice:FarmNotice;canShare:boolean;onShare:()=>void;onClose:()=>void}){
 const harvest=notice.harvest;
 return <aside className={`farm-feedback ${harvest?'has-harvest':''}`} role="status" aria-label="种植结果">
  {harvest?<div className="farm-harvest-picture" aria-hidden="true"><CropBadge kind={harvest.berry}/><CropBadge kind={harvest.berry}/><Icon name="check" size={24}/></div>:<Icon name="grass" size={30}/>}
  <span>{harvest?<><strong>{CROPS[harvest.berry].name}收好啦</strong><small>+{harvest.count} 颗 · 果篮里有 {harvest.total} 颗</small></>:notice.text}</span>
  {canShare&&<button onClick={onShare}><Icon name="bowl" size={28}/>喂伙伴</button>}
  <button onClick={onClose} aria-label="收起种植提示"><Icon name="close" size={22}/></button>
 </aside>;
}
