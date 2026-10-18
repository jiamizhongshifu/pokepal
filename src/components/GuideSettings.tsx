import {useState} from 'react';
import {useGame} from '../store';
import {Icon} from '../icons';
export function GuideSettings(){
 const automatic=useGame(s=>s.save.onboarding?.automatic!==false);
 const [reset,setReset]=useState(false);
 return <section className="guide-settings"><h3>操作小帮手</h3><p>第一次用到功能时，用图片和一句语音提示。孩子可以跳过，也能随时点“帮助”再听。学习朗读和录音优先。</p>
 <label><input type="checkbox" checked={automatic} onChange={e=>useGame.getState().setGuideAutomatic(e.target.checked)}/>首次使用时主动提示</label>
 <button className="btn-small" onClick={()=>{useGame.getState().resetGuides();setReset(true);}}><Icon name="refresh" size={24}/>重新开启所有引导</button>
 {reset&&<p role="status">已开启，下次进入各个功能时会重新提示。学习记录和伙伴都保留。</p>}</section>;
}
