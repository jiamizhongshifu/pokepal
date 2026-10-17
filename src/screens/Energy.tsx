import {energyGoalState} from '../lib/energyGoal';
import {learningHome} from '../lib/learningTrail';
import { FeatureGuide } from '../components/FeatureGuide';
import { TopBar } from '../components/TopBar';
import { Icon } from '../icons';
import { useGame, type Screen } from '../store';
import { DAILY_CAP, courseRewardAvailable, type ParticipationKind } from '../lib/participation';
import './energy.css';
import { recommendedReviewKeys,reviewGroupSize } from '../lib/learningProgress';

const ACTIVITIES: Record<ParticipationKind, {icon:string; tint:string; label:string; accent?:string}> = {
  listen: {icon:'ear', tint:'var(--activity-listen)', label:'听一听'},
  wordpic: {icon:'picture', tint:'var(--activity-wordpic)', label:'认一认'},
  repeat: {icon:'speak', tint:'var(--activity-repeat)', label:'说一说'},
  trace: {icon:'pencil', tint:'var(--activity-trace)', label:'写一写'},
  course: {icon:'island', tint:'#dff2e9', label:'去冒险'},
  review: {icon:'speaker', tint:'#e1eff7', label:'再听听', accent:'refresh'},
  story: {icon:'book', tint:'#fff0cf', label:'读故事'},
  island: {icon:'hand', tint:'var(--coast-coral-soft)', label:'陪伙伴', accent:'heart'},
};

export function Energy() {
  const {save, go,energyGoal} = useGame();
  const goal=energyGoalState(save,energyGoal);
  const course=learningHome(save).unit;
  const done = save.daily.participated ?? [];
  const due=recommendedReviewKeys(save).slice(0,reviewGroupSize(save));
  const earned = Math.max(0, Math.min(DAILY_CAP, save.daily.energyEarned));
  const reward = Math.min(2, DAILY_CAP - earned);
  const open = (kind:ParticipationKind) => {
    if(kind==='listen'||kind==='wordpic'||kind==='repeat'||kind==='trace') {
      const index=save.daily.board.indexOf(kind);
      go({name:'task', returnGoal:goal.goal, kind, boardIndex:index<0?null:index});
      return;
    }
    const routes:Record<'course'|'review'|'story'|'island',Screen> = {
      course:{name:'lesson',id:course.id}, review:due.length?{name:'review',keys:due,returnTo:'energy'}:{name:'notebook',mode:'all',returnTo:'energy'},
      story:{name:'stories',returnGoal:goal.goal}, island:{name:'home'},
    };
    if(kind==='course'){useGame.getState().startUnit(course.id,goal.goal);return;}
    go(routes[kind]);
  };
  const isDone=(kind:ParticipationKind)=>kind==='course'?!courseRewardAvailable(save,course.id):done.includes(kind);
  const choices:ParticipationKind[]=['course','story','island','listen','wordpic','repeat','trace','review'];
  const recommended=choices.find(k=>!isDone(k)&&(k!=='review'||due.length>0))??'course';
  const others=choices.filter(k=>k!==recommended);
  const destination=()=>go(goal.goal==='ball'?(goal.hasBall?{name:'catch'}:{name:'shop'}):{name:'home',station:`upgrades:${goal.goal}`});
  const label=(kind:ParticipationKind)=>kind==='course'?'接着学英语':kind==='review'&&!due.length?'发现手册':ACTIVITIES[kind].label;
  const card=(kind:ParticipationKind)=><button key={kind} className="energy-alternative" onClick={()=>open(kind)}><Icon name={ACTIVITIES[kind].icon} size={40}/><span><strong>{label(kind)}</strong><small>{kind==='review'&&!due.length?'看看认识的词':isDone(kind)?'今天玩过啦':reward?`小发现 +${reward} 能量`:'自在玩，不再增加能量'}</small></span></button>;
  return <div className="screen energy-guide energy-focused">
    <TopBar title="能量小口袋" onBack={()=>go({name:'home'})} focused help={<FeatureGuide id="energy" compact enabled={!goal.ready}/>}/>
    <main className="child-page energy-page">
      <section className="energy-next">
        <div className="energy-balance"><Icon name="bolt" size={32}/>我的能量 <b>{save.energy}</b></div>
        <Icon name={goal.goal==='ball'?'pokeball':'upgrade'} size={76}/>
        <h1>{goal.ready?(goal.complete?'已经变漂亮啦':goal.hasBall?'球准备好啦！':'能量够啦！'):goal.title}</h1>
        <p>{goal.ready?(goal.hasBall?'去找你喜欢的伙伴吧。':goal.complete?'去小岛看看我们的成果。':`可以${goal.goal==='ball'?'换一个精灵球':`升级${goal.title}`}。`):`再收集 ${goal.short} 点能量，就能${goal.goal==='ball'?'换一个精灵球':`升级${goal.title}`}。`}</p>
        {!goal.ready&&<p className="energy-course-hint">{earned===DAILY_CAP?'今天收集好啦。还可以自由玩，也可以休息。':recommended==='course'?`一起发现：${course.title}`:'选一个喜欢的小活动，不用全部完成。'}</p>}
        <button className="btn-big" onClick={goal.ready?destination:()=>open(recommended)}><Icon name={goal.ready?(goal.goal==='ball'?(goal.hasBall?'grass':'pokeball'):'island'):ACTIVITIES[recommended].icon} size={38}/>{goal.ready?(goal.goal==='ball'?(goal.hasBall?'去找伙伴':'去换精灵球'):goal.complete?'去看看':'去升级'):label(recommended)}</button>
      </section>
      <section className="energy-other"><h2>{goal.ready?'还想玩一会儿？':'也可以这样玩'}</h2><div className="energy-alternatives">{(goal.ready?['course','story'] as ParticipationKind[]:others.slice(0,2)).map(card)}</div>
       <details className="quiet-disclosure"><summary>换个玩法</summary><div className="energy-alternatives">{(goal.ready?choices.filter(k=>k!=='course'&&k!=='story'):others.slice(2)).map(card)}</div></details>
      </section>
      <details className="quiet-disclosure"><summary>能量还能做什么？</summary><div className="energy-alternatives"><button className="energy-alternative" onClick={()=>go({name:'shop'})}><Icon name="pokeball" size={38}/>换精灵球</button><button className="energy-alternative" onClick={()=>go({name:'home',station:'upgrades'})}><Icon name="island" size={38}/>装扮小岛</button></div></details>
      <details className="energy-parent-note"><summary>给家长：今天的小收获</summary><p>今天收集 {earned} / {DAILY_CAP} 点。英语主线每个主题每天首次完成可收集 2 点能量，其他活动每类每天首次完成可收集 2 点，体验三种再得 1 点。照顾伙伴时听见一句英语也算参与，不需要开口或答题。玩过的活动可继续玩，不重复发放能量。</p></details>
    </main>
  </div>;
}
