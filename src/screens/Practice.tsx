import { TASK_INFO, type TaskKind } from '../data/tasks';
import { FeatureGuide } from '../components/FeatureGuide';
import { TopBar } from '../components/TopBar';
import { useGame } from '../store';
import { sfx } from '../lib/speech';
import { Icon } from '../icons';
export function Practice(){
 const go=useGame(s=>s.go),back=useGame(s=>s.back);
 return <div className="screen practice-screen">
  <TopBar title="选个小游戏" onBack={back} focused help={<FeatureGuide compact id="practice"/>}/>
  <header className="learning-heading"><h1>今天想怎么玩？</h1><p>选一组就好，累了随时回来休息。</p></header>
  <div className="practice-options">{(Object.keys(TASK_INFO) as TaskKind[]).map(kind=><button key={kind} className={`practice-option kind-${kind}`} aria-label={`${TASK_INFO[kind].zh}，${TASK_INFO[kind].detail}`} onClick={()=>{sfx('click');go({name:'task',kind,boardIndex:null,practice:true,session:Date.now()});}}>
    <Icon name={TASK_INFO[kind].icon} size={76}/><span><strong>{TASK_INFO[kind].zh}</strong><small lang="en">{TASK_INFO[kind].en}</small></span>
  </button>)}</div>
  <p className="practice-note">按自己的节奏玩，不用全部完成。游玩时间遵守家长设置。</p>
 </div>;
}
