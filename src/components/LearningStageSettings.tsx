import { useRef,useState } from 'react';
import { Icon } from '../icons';
import { useGame } from '../store';
import { LEARNING_STAGES,learningProfile,learningStageTitle,stageProfile,type LearningProfile } from '../lib/learningStage';
import './learning-stage-settings.css';

export function LearningStageSettings(){
 const settings=useGame(s=>s.save.settings),update=useGame(s=>s.setLearningProfile);
 const unavailable=useGame(s=>s.saveBusy||!!s.saveIssue);
 const [saving,setSaving]=useState(false),busy=useRef(false);
 const blocked=unavailable||saving;
 const profile=learningProfile(settings);
 const [message,setMessage]=useState('');
 const change=async(next:LearningProfile)=>{
  if(blocked||busy.current)return;
  busy.current=true;setSaving(true);setMessage('正在保存宝宝的学习阶段…');
  const ok=await update(next);
  setMessage(ok?`已保存「${learningStageTitle({...settings,learningProfile:next})}」，下次进入练习时使用。`:'还没有保存成功，请先重试存档保存。');
  busy.current=false;setSaving(false);
 };
 const adjust=(patch:Partial<LearningProfile>)=>change({...profile,...patch,stage:'custom'});
 return <section className="learning-stage-settings" aria-labelledby="learning-stage-title">
  <header><div><h3 id="learning-stage-title">宝宝的英语学习阶段</h3><p>按现在的准备程度选择。可以随时放慢，也可以尝试下一步。</p></div><span className="stage-current">当前：{learningStageTitle(settings)}</span></header>
  <fieldset disabled={blocked} className="stage-presets"><legend>选择一个适合宝宝的起点</legend>
   {LEARNING_STAGES.map(stage=><button type="button" key={stage.id} aria-pressed={profile.stage===stage.id} onClick={()=>change(stageProfile(stage.id))}>
    <Icon name={stage.icon} size={44}/><span><strong>{stage.title}</strong><span>{stage.description}</span><small>{stage.example}</small></span><span className="stage-check" aria-hidden="true">{profile.stage===stage.id?'✓':'○'}</span>
   </button>)}
  </fieldset>
  <details className="stage-custom"><summary><Icon name="gear" size={24}/>按宝宝的情况微调{profile.stage==='custom'&&<b>正在使用</b>}</summary>
   <p>例如：认识的词已经很多，但还想先听短句。修改任一项后，会使用专属节奏；点上面的阶段可恢复整套设置。</p>
   <fieldset disabled={blocked} className="stage-controls"><legend>自定义学习节奏</legend>
    <fieldset><legend>词汇范围</legend><div>{([1,2] as const).map(v=><button key={v} aria-pressed={profile.vocabulary===v} onClick={()=>adjust({vocabulary:v})}>{v===1?'基础生活词':'扩展生活词'}</button>)}</div><small>决定课程、每日练习、自动复习和岛屿互动使用的词汇难度。</small></fieldset>
    <fieldset><legend>认词从哪里开始</legend><div>{(['listen','choose'] as const).map(v=><button key={v} aria-pressed={profile.entry===v} onClick={()=>adjust({entry:v})}>{v==='listen'?'先陪着听':'听词选图片'}</button>)}</div><small>选择先陪着听时，课程、复习、听一听和认一认可听完继续，也可以主动试着找。</small></fieldset>
    <fieldset><legend>短句怎样参与</legend><div>{([['listen','都先一起听'],['supported','长句先一起听'],['situations','尝试情境选择']] as const).map(([v,title])=><button key={v} aria-pressed={profile.phrases===v} onClick={()=>adjust({phrases:v})}>{title}</button>)}</div><small>用于英语冒险和短句复习；说一说仍可只听示范，不要求开口。</small></fieldset>
    <fieldset><legend>图片选项数量</legend><div>{([2,3] as const).map(v=><button key={v} aria-pressed={profile.choices===v} onClick={()=>adjust({choices:v})}>{v} 张图片</button>)}</div><small>选项少一点更容易看清。有明确对比的题目仍保留 2 项。</small></fieldset>
    <fieldset><legend>每组复习数量</legend><div>{([2,3] as const).map(v=><button key={v} aria-pressed={profile.review===v} onClick={()=>adjust({review:v})}>{v} 个小发现</button>)}</div><small>这是上限；到期的词较少时，不会为了凑数增加新词。</small></fieldset>
   </fieldset>
  </details>
  <div className="stage-preview"><strong>这次会这样玩</strong><p>{profile.vocabulary===1?'基础生活词':'扩展生活词'} · {profile.entry==='listen'?'认词先陪听':`认词最多 ${profile.choices} 个选项`} · {profile.phrases==='listen'?'短句先听':profile.phrases==='supported'?'长句先听':'尝试情境表达'} · 每组复习最多 {profile.review} 项</p></div>
  <p className="stage-status" role="status" aria-live="polite">{message}</p>
  <p className="stage-footnote">调整阶段不会清空课程、生词和伙伴，也不会自动升级或解锁后面的课程。阶段不是考试等级，年龄不决定进度；故事共读、描字和开口始终可以自选。</p>
 </section>;
}
