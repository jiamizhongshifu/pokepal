import { FeatureGuide } from '../components/FeatureGuide';
import { learningProfile } from '../lib/learningStage';
import { dailyLearningPlan } from '../data/learning';
import { TopBar } from '../components/TopBar';
import { TASK_INFO, useGame } from '../store';
import { Icon } from '../icons';
import type { TaskKind } from '../types';

const OPTIONS:{kind:TaskKind;amount:string;en:string;detail:string}[]=[
 {kind:'listen',amount:'6 道小题',en:'Listen & find',detail:'颜色、名字、数量和大小'},
 {kind:'repeat',amount:'最多 5 句英文',en:'Say it with me',detail:'问候、表达需要、日常短句'},
 {kind:'wordpic',amount:'最多 6 张图片',en:'Look & choose',detail:'再遇见今天的词和熟悉的词'},
 {kind:'trace',amount:'3 个字母',en:'Trace & learn',detail:'跟着笔顺，描写三个不同的字母'}
];
export function Practice(){
 const go=useGame(s=>s.go);
 const save=useGame(s=>s.save),plan=dailyLearningPlan(save,true),listening=learningProfile(save.settings).entry==='listen';
 return <div className="screen practice-screen">
  <TopBar title="选个小游戏" onBack={()=>go({name:'tasks'})} focused help={<FeatureGuide compact id="practice"/>}/>
  <header className="learning-heading"><h1>今天想怎么玩？</h1><p>选一组就好，累了随时回来休息。</p></header>
  <div className="practice-options">{OPTIONS.map(o=><button key={o.kind} className="practice-option" aria-label={`${TASK_INFO[o.kind].zh}，${o.detail}`} onClick={()=>go({name:'task',kind:o.kind,boardIndex:null,practice:true,session:Date.now()})}>
    <Icon name={TASK_INFO[o.kind].icon} size={72}/><span><strong>{TASK_INFO[o.kind].zh}</strong><small lang="en">{o.en}</small></span><b>{listening&&(o.kind==='listen'||o.kind==='wordpic')?`${plan.words.length} 个小发现`:o.kind==='repeat'?`${plan.phrases.length} 句英文`:o.kind==='wordpic'?`${plan.words.length} 张图片`:o.amount}<span aria-hidden="true"> ›</span></b>
  </button>)}</div>
  <p className="practice-note">按自己的节奏玩，不用全部完成。能量和游玩时间遵守家长设置。</p>
 </div>;
}
