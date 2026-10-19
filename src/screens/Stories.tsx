import {trackInteraction} from '../lib/interaction';
import './story-reader.css';
import { SHORT_STORY_LINES, storyLanguage, storyEdition, storyBookmarkKey, storyInitialPage, type StoryLanguage } from '../data/storyLevels';
import { learningProfile } from '../lib/learningStage';
import { EnergyReturn } from '../components/EnergyReturn';
import { FeatureGuide } from '../components/FeatureGuide';
import { DiaryShelf } from './Diary';
import { LIFE_STORIES } from '../lib/islandLiving';
import { learningEntry, selectedUnit } from '../data/curriculum';
import { ParticipationNote } from '../components/ParticipationNote';
import { useEffect, useRef, useState } from 'react';
import { StoryStage } from '../components/StoryStage';
import { STORY_COVER_PAGE } from '../data/storyScenes';
import { STORIES, STORY_THEMES, storyProgressKey, type StoryTheme, type Story, type StoryPage } from '../data/stories';
import { artUrl, getPokemon } from '../data/pokemon';
import { PokeImg } from '../components/PokeImg';
import { TopBar } from '../components/TopBar';
import { Icon } from '../icons';
import { useGame } from '../store';
import { say, stopSpeech } from '../lib/speech';
import { PIC_WORDS } from '../data/words';

/** Keep the full sentence readable; emphasis never changes narration or wording. */
function StoryReading({page}:{page:StoryPage}){
 const start=page.en.toLowerCase().indexOf(page.keyword.en.toLowerCase());
 const keys=[page.keyword.en,...PIC_WORDS.filter(w=>new RegExp(`\\b${w.en}(?:s|es)?\\b`,'i').test(page.en)).map(w=>w.en)];
 const words=[...new Map(keys.flatMap(key=>{const e=learningEntry(key);return e?[[e.key,e] as const]:[];})).values()].slice(0,3);
 const records=useGame(s=>s.save.learning?.records);
 return <section className="story-reading-text" aria-label="中英对照故事正文">
  <p className="story-text-en" lang="en">{start<0?page.en:<>{page.en.slice(0,start)}<mark>{page.en.slice(start,start+page.keyword.en.length)}</mark>{page.en.slice(start+page.keyword.en.length)}</>}</p>
  <p className="story-text-zh" lang="zh-CN">{page.zh}</p>
  <p className="story-keyword"><span>一起认识</span><b lang="en">{page.keyword.en}</b><span lang="zh-CN">{page.keyword.zh}</span></p>
  {!!words.length&&<details className="story-word-disclosure"><summary><Icon name="book" size={22}/>这页的小词</summary><div className="story-word-saves" aria-label="把故事里的词放进手册">{words.map(w=><button key={w.key} aria-pressed={!!records?.[w.key]?.saved} onClick={()=>useGame.getState().saveLearningWord(w.key)}><Icon name="book" size={19}/>{records?.[w.key]?.saved?'已收藏':'收藏'} {w.en}</button>)}</div></details>}
 </section>;
}

export function StoryLibrary(){
 const go=useGame(s=>s.go);
 const returnGoal=useGame(s=>s.screen.name==='stories'?s.screen.returnGoal:undefined);
 const progress=useGame(s=>s.save.storyProgress);
 const settings=useGame(s=>s.save.settings);
 const bookmark=(story:Story)=>storyBookmarkKey(story,storyLanguage(story,settings));
 const unit=useGame(s=>selectedUnit(s.save));
 const [theme,setTheme]=useState<StoryTheme|'all'>('all');
 const books=STORIES.filter(s=>theme==='all'||s.group===theme);
 const resume=STORIES.find(s=>{const p=progress?.[bookmark(s)]??0;return p>0&&p<=s.pages.length;});
 return <div className="screen story-library">
  <TopBar title="宝可梦故事屋" onBack={()=>go({name:'home'})} focused help={<FeatureGuide id="stories" compact/>}/>
  <header className="learning-heading"><h1>今天想听哪个故事？</h1></header>
  <nav className="story-themes" aria-label="故事主题"><button aria-pressed={theme==='all'} onClick={()=>setTheme('all')}><Icon name="book" size={32}/>全部故事</button>{STORY_THEMES.map(t=><button key={t.id} aria-pressed={theme===t.id} onClick={()=>setTheme(t.id)}><Icon name={t.icon} size={32}/>{t.name}</button>)}</nav>
  {resume&&(theme==='all'||resume.group===theme)&&<button className="story-resume" onClick={()=>go({name:'story',id:resume.id,returnGoal})}><Icon name="book" size={30}/><span><b>接着读：{resume.title}</b><small>停在第 {progress?.[bookmark(resume)]} 页 · 随时可以重读</small></span><span aria-hidden="true">›</span></button>}
  <div className="story-shelf">{books.map((story)=>{const i=STORIES.indexOf(story);
    const seen=progress?.[bookmark(story)]??0;
    return <button key={story.id} className={`storybook book-${i}`} onClick={()=>go({name:'story',id:story.id,returnGoal})} aria-label={`${story.title}，${story.theme}，${seen>story.pages.length?'再读一次':seen?'继续阅读':'开始阅读'}`}>
      <div className="book-cover"><StoryStage story={story} page={story.pages[STORY_COVER_PAGE[story.id]??0]} cover/><span className="book-number">{String(i+1).padStart(2,'0')}</span><span className="book-theme">{story.theme}</span></div>
      <div className="book-title">{unit.story===story.id&&<span className="story-learning-link">和「{unit.title}」一起读</span>}<h2>{story.title}</h2><span lang="en">{story.titleEn}</span><p className="book-summary">{story.summary}</p><div className="book-footer"><small>{story.pages.length} 页 · 约 {story.pages.length<=4?1:3} 分钟</small><b>{seen>story.pages.length?'再读一次':seen?'接着读':'翻开看看'} <span aria-hidden="true">›</span></b></div></div>
    </button>;
  })}</div>
  <DiaryShelf/>
  <p className="story-parent-note">陪读小提示：不用考宝宝。听完后，聊一聊他自己的小经历。</p>
 </div>;
}

export function StoryReader({id}:{id:string}){
 const story=STORIES.find(s=>s.id===id);
 const go=useGame(s=>s.go);
 const settings=useGame(s=>s.save.settings);
 if(!story)return <div className="screen"><TopBar title="故事屋" onBack={()=>go({name:'stories'})}/><p>这个故事还没准备好。</p></div>;
 const language=storyLanguage(story,settings);
 return <Book key={`${id}:${language}`} story={storyEdition(story,language)} language={language}/>;
}
function Book({story,language}:{story:Story;language:StoryLanguage}){
 const trackedStart=useRef(false);
 useEffect(()=>{if(!trackedStart.current){trackedStart.current=true;trackInteraction('story_started');}},[]);
 const settings=useGame(s=>s.save.settings);
 const bookmark=storyBookmarkKey(story,language);
 const hasLevels=!!SHORT_STORY_LINES[story.id];
 const discover=learningProfile(settings).entry==='choose';
 const go=useGame(s=>s.go);
 const noteStoryPage=useGame(s=>s.noteStoryPage);
 const readPages=useGame(s=>s.save.daily.storyReadPages?.[storyProgressKey(story)]);
 const noteRead=()=>useGame.getState().noteStoryRead(storyProgressKey(story),idx+1);
 const [idx,setIdx]=useState(()=>storyInitialPage(story,useGame.getState().save.storyProgress?.[bookmark]));
 const [ended,setEnded]=useState(false);
 const reader=useRef<HTMLDivElement>(null);
 useEffect(()=>{reader.current?.scrollTo({top:0,behavior:"instant"});},[idx,ended]);
 const [autoPlay,setAutoPlay]=useState(useGame.getState().save.settings.storyMode==='listen');
 const [bilingual,setBilingual]=useState(useGame.getState().save.settings.englishMode!=='english');
 const [replay,setReplay]=useState(0);
 const [choice,setChoice]=useState<{page:number;index:number}|null>(null);
 const [status,setStatus]=useState<'playing'|'idle'|'unavailable'>('playing');
 const run=useRef(0);
 const timer=useRef<ReturnType<typeof setTimeout>>();
 const auto=useRef(autoPlay);auto.current=autoPlay;
 const page=story.pages[idx];
 const finish=()=>{stopSpeech();setEnded(true);noteStoryPage(bookmark,story.pages.length+1);};
 useEffect(()=>{
   if(ended)return;
   noteStoryPage(bookmark,idx+1);
   const ticket=++run.current;
   setStatus('playing');
   timer.current=setTimeout(async()=>{
     const ok=await say(['en',page.en,page],...(bilingual ? [250,['zh',page.zh,page]] as Parameters<typeof say> : []));
     if(run.current!==ticket)return;
     if(ok){
       noteRead();
       const keys=[page.keyword.en,...PIC_WORDS.filter(w=>new RegExp(`\\b${w.en}(?:s|es)?\\b`,'i').test(page.en)).map(w=>w.en)];
       for(const key of new Set(keys.map(k=>learningEntry(k)?.key).filter((k):k is string=>!!k)))useGame.getState().noteWord(key,'heard');
     }
     setStatus(ok?'idle':'unavailable');
     if(ok && auto.current && !page.pause)timer.current=setTimeout(()=>{if(run.current!==ticket)return;if(idx+1<story.pages.length)setIdx(i=>i+1);else finish();},1200);
   },200);
   return ()=>{run.current++;clearTimeout(timer.current);stopSpeech();};
 },[idx,replay,bilingual,ended,story.id]); // page is determined by idx and story; narration must not restart on status updates.
 const pause=()=>{run.current++;clearTimeout(timer.current);stopSpeech();setStatus('idle');};
 const read=()=>setReplay(n=>n+1);
 const readPair=async(line:{en:string;zh:string})=>{
   pause();const ticket=++run.current;setStatus('playing');
   const ok=await say(["en",line.en,line],...(bilingual ? [["zh",line.zh,line]] as Parameters<typeof say> : []));
   if(run.current===ticket){setStatus(ok?'idle':'unavailable');if(ok)useGame.getState().noteWord(line.en,'heard');}
 };
 const turn=(next:number)=>{pause();setIdx(next);};
 return <div className="screen story-reader">
   <TopBar title={story.title} onBack={()=>go({name:'stories'})} focused
     progress={!ended&&<span className="story-page-count" aria-label={`第 ${idx+1} 页，共 ${story.pages.length} 页`}>{idx+1} / {story.pages.length}</span>}
     help={!ended&&<FeatureGuide id="story" compact autoVoice={false} onVoiceStart={pause}/>}/>
   <div ref={reader} className="story-pages">
   {ended ? <main className="story-ending">
     <span className="section-eyebrow">THE END · 故事读完啦</span><h1>把温柔的话，带到生活里</h1>
     <EnergyReturn/><ParticipationNote kind="story"/><div className="ending-friends">{story.cast.map(id=><PokeImg key={id} src={artUrl(id)} alt={getPokemon(id).nameZh}/>)}</div>
     <button className="story-phrase" onClick={()=>readPair(story.phrase)}><Icon name="speaker" size={36}/><span><b lang="en">{story.phrase.en}</b><small>{story.phrase.zh}</small></span></button>
     <button className="btn-big story-ending-primary" onClick={()=>go({name:'home',station:story.activity?.station})}><Icon name="island" size={36}/>回小岛玩</button>
     <details className="quiet-disclosure"><summary>还想一起做点什么？</summary><button className="btn-small" onClick={()=>useGame.getState().saveLearningWord(story.phrase.en)}>把这句话放进手册</button><div className="story-talk"><b>和大人聊一聊</b><p>{story.question.zh}</p><span lang="en">{story.question.en}</span><button className="replay" onClick={()=>readPair(story.question)}><Icon name="speaker" size={24}/>听一听</button></div>
     <div className="story-family"><h2>今天一起试试</h2><p>{story.practice}</p><details onToggle={e=>{if(e.currentTarget.open)trackInteraction('family_tip_opened');}}><summary>给陪读大人的小提示</summary><p>{story.parentTip}</p></details></div>
     <div className="story-ending-actions">
       {story.activity&&<button className="btn-small" onClick={()=>go({name:'home',station:story.activity!.station})}><Icon name={story.activity.icon} size={24}/>{story.activity.label}</button>}
       {story.id==='keep-promise'&&<button className="btn-small" onClick={()=>go({name:'home',station:'farm'})}>陪伙伴照顾一颗小种子</button>}
       {story.id==='try-again'&&<button className="btn-small" onClick={()=>go({name:'home',station:'sand'})}>去沙坑慢慢玩，累了就休息</button>}
       {story.id==='tell-truth'&&<button className="btn-small" onClick={()=>go({name:'diary'})}>把今天的小事，说给我听</button>}
       {LIFE_STORIES.filter(e=>e.story===story.id).map(e=><button key={e.id} className="btn-small" onClick={()=>go({name:'home',station:e.station})}>去岛上试试看 · {e.name}</button>)}<button className="btn-small" onClick={()=>{setIdx(0);setEnded(false);setChoice(null);}}>再读一次 <span lang="en">Read again</span></button><button className="btn-small alt" onClick={()=>go({name:'stories'})}>选另一个故事 <span lang="en">More stories</span></button></div></details>
   </main> : <main className="open-storybook">
     <header className="story-page-header"><h2 className="story-beat">{page.beat}</h2>
     <div className="story-mode" aria-label="阅读方式">{(['listen','read'] as const).map(mode=><button key={mode} aria-label={mode==='listen'?'听故事，自动翻页':'一起读，自己翻页'} aria-pressed={autoPlay===(mode==='listen')} onClick={()=>{setAutoPlay(mode==='listen');useGame.getState().updateSettings({storyMode:mode});read();}}><Icon name={mode==='listen'?'ear':'book'} size={26}/>{mode==='listen'?'听故事':'一起读'}<small>{mode==='listen'?'自动翻页':'自己翻页'}</small></button>)}</div>
     </header>
     <StoryStage key={idx} story={story} page={page} onWord={discover?readPair:undefined}/>
     <div className="story-reading"><StoryReading page={page}/>
     {page.pause&&<section className="story-play-along" aria-label="一起演一演"><div><b>一起演一演</b><p>{page.pause.invite}</p><small>都可以试试，也可以直接翻到下一页。</small></div><div className="story-play-choices">{page.pause.choices.map((c,i)=><button key={c.label} aria-pressed={choice?.page===idx&&choice.index===i} onClick={()=>{setChoice({page:idx,index:i});void readPair(c.reply);}}>{c.label}<Icon name="speaker" size={22}/></button>)}</div>{choice?.page===idx&&<p className="story-choice-response" role="status"><span lang="en">{page.pause.choices[choice.index].reply.en}</span><span lang="zh-CN">{page.pause.choices[choice.index].reply.zh}</span></p>}</section>}
     </div>
     <details className="story-parent-options quiet-disclosure"><summary>陪读设置与记录</summary><p className="story-context">{story.theme} · {story.themeEn}{hasLevels&&` · ${language==='short'?'短句听读':'完整共读'}`}</p>{hasLevels&&<fieldset className="story-language-options"><legend>故事语言</legend><p>跟随家长设置的英语阶段；也可以只调整故事文本。听故事或一起读仍单独控制翻页方式。</p><div>{(['stage','short','full'] as const).map(value=><button key={value} aria-pressed={(settings.storyLanguage??'stage')===value} onClick={()=>{pause();useGame.getState().updateSettings({storyLanguage:value});}}>{value==='stage'?'跟随学习阶段':value==='short'?'短句听读':'完整共读'}</button>)}</div><small>两种文本分别记住阅读位置；同一本故事共享今日参与奖励，不代表掌握更长的句子。</small></fieldset>}<div className="participation-note"><span>今天读过 {readPages?.length??0} / {story.pages.length} 页；听完或由陪读家长确认后记下。</span><button className="btn-small" disabled={readPages?.includes(idx+1)} onClick={noteRead}>{readPages?.includes(idx+1)?"这页已读过":"和大人一起读过这页"}</button></div>
     <div className="story-options"><button aria-pressed={bilingual} onClick={()=>setBilingual(v=>!v)}>{bilingual?'中英朗读':'只听英文'}<small lang="en">{bilingual?'English + Chinese':'English audio'}</small></button></div></details>
     {autoPlay&&page.pause&&<p className="story-pause-note">故事在这里等你。想继续时，点下一页。</p>}
     {status==='unavailable'&&<p role="status" className="story-audio-note">这页声音暂时没准备好，点“再听一次”重试。</p>}
   </main>}
   </div>
   {!ended&&<div className="story-controls story-primary-controls" aria-label="阅读操作">
       <button onClick={()=>turn(idx-1)} disabled={idx===0} aria-label="上一页 Previous page"><span aria-hidden="true">‹</span><small>上一页</small></button>
       <button className="story-listen" onClick={status==='playing'?pause:read}><Icon name={status==='playing'?'ear':'speaker'} size={30}/><span>{status==='playing'?'暂停朗读':'再听一次'}<small lang="en">{status==='playing'?'Pause':'Listen again'}</small></span></button>
       <button className="story-next" onClick={()=>idx+1<story.pages.length?turn(idx+1):finish()} aria-label={idx+1<story.pages.length?'下一页 Next page':'读完啦 Finish story'}><small>{idx+1<story.pages.length?'下一页':'读完啦'}</small><span aria-hidden="true">›</span></button>
     </div>}
 </div>;
}
