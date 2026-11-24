import { FeatureGuide } from '../components/FeatureGuide';
import { TopBar } from '../components/TopBar';
import { TASK_INFO, useGame } from '../store';
import { sfx } from '../lib/speech';
import { Icon } from '../icons';
import type { TaskKind } from '../types';

const OPTIONS:{kind:TaskKind;en:string;detail:string}[]=[
 {kind:'listen',en:'Listen & find',detail:'颜色、名字、数量和大小'},
 {kind:'repeat',en:'Say it with me',detail:'问候、表达需要、日常短句'},
 {kind:'wordpic',en:'Look & choose',detail:'再遇见今天的词和熟悉的词'},
 {kind:'trace',en:'Trace & learn',detail:'跟着笔顺，描写三个不同的字母'}
];
export function Practice(){
 const go=useGame(s=>s.go),back=useGame(s=>s.back);
 return <div className="screen practice-screen">
  <TopBar title="选个小游戏" onBack={back} focused help={<FeatureGuide compact id="practice"/>}/>
  <header className="learning-heading"><h1>今天想怎么玩？</h1><p>选一组就好，累了随时回来休息。</p></header>
  <div className="practice-options">{OPTIONS.map(o=><button key={o.kind} className={`practice-option kind-${o.kind}`} aria-label={`${TASK_INFO[o.kind].zh}，${o.detail}`} onClick={()=>{sfx('click');go({name:'task',kind:o.kind,boardIndex:null,practice:true,session:Date.now()});}}>
    <Icon name={TASK_INFO[o.kind].icon} size={76}/><span><strong>{TASK_INFO[o.kind].zh}</strong><small lang="en">{o.en}</small></span><b><span aria-hidden="true">›</span></b>
  </button>)}</div>
  <p className="practice-note">按自己的节奏玩，不用全部完成。游玩时间遵守家长设置。</p>
 </div>;
}
