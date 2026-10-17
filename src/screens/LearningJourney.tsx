import {FeatureGuide} from '../components/FeatureGuide';
import {LEARNING_CHAPTERS,LEARNING_UNITS,recommendedUnit,unitUnlocked} from '../data/curriculum';
import {useGame} from '../store';
import {TopBar} from '../components/TopBar';
import {Icon} from '../icons';
import {lessonWords} from '../data/learning';
import {learningProfile} from '../lib/learningStage';
import '../learning-journey.css';

export function LearningJourney(){
 const s=useGame(v=>v.save),go=useGame(v=>v.go),start=useGame(v=>v.startUnit);
 const next=recommendedUnit(s),profile=learningProfile(s.settings);
 const allDone=LEARNING_UNITS.every(u=>s.learning?.units[u.id]?.completedAt);
 const nextIndex=LEARNING_UNITS.indexOf(next);
 const chapter=(c:number,part:'all'|'current'|'past'='all')=><ol className="journey-stops">{LEARNING_UNITS.filter((u,i)=>u.chapter===c&&(part==='all'||(part==='current'?i>=nextIndex:i<nextIndex))).map(u=>{
  const done=!!s.learning?.units[u.id]?.completedAt,unlocked=unitUnlocked(s,u.id),current=u.id===next.id;
  return <li key={u.id} className={`${done?'visited':''} ${current?'next':''}`}>
   <button disabled={!unlocked} aria-current={current?'step':undefined} onClick={()=>start(u.id)} aria-label={`${u.title}，${done?'可以重玩':unlocked?'开始冒险':'先完成前一站'}`}>
    <span className="journey-step-mark"><Icon name={done?'check':unlocked?'play':'lock'} size={30}/></span><span><strong>{u.title}</strong><small>{lessonWords(u,profile.vocabulary).join(' · ')}</small></span><b>{current?(allDone?'再玩':'现在这里'):done?'再玩':LEARNING_UNITS.indexOf(u)===nextIndex+1?'下一站':'以后'}</b>
   </button>
  </li>;
 })}</ol>;
 return <div className="screen learning-journey route-focused"><TopBar title="学习小路" onBack={()=>go({name:'tasks'})} focused help={<FeatureGuide id="journey" compact/>}/>
  <main className="journey-wrap">{allDone&&<p className="route-complete">每一站，都一起玩过啦。喜欢哪一站，都可以再玩。</p>}
   <section className="journey-chapter route-current"><header><span>{String(next.chapter+1).padStart(2,'0')}</span><div><h2>{LEARNING_CHAPTERS[next.chapter].title}</h2><p>{LEARNING_CHAPTERS[next.chapter].goal}</p></div></header>{chapter(next.chapter,'current')}{LEARNING_UNITS.some((u,i)=>u.chapter===next.chapter&&i<nextIndex)&&<details className="quiet-disclosure"><summary>这一段走过的小路</summary>{chapter(next.chapter,'past')}</details>}</section>
   {LEARNING_CHAPTERS.map((c,i)=>i===next.chapter?null:<details className="route-chapter quiet-disclosure" key={c.title}><summary><Icon name={i<next.chapter?'check':'sign'} size={28}/><span>{i<next.chapter?'走过的小路':'以后的小发现'} · {c.title}</span></summary>{chapter(i)}</details>)}
   <details className="quiet-disclosure"><summary>给陪伴的大人 · 学习节奏</summary><p>路线记录课程体验，不代表已经掌握。故事和小岛互动是自由延伸，不需要完成才能进入下一课。学习阶段可以在家长设置中调整。</p></details>
  </main>
 </div>;
}
