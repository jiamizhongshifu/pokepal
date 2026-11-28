import { playLimitSeconds } from '../lib/playClock';
import { withTransition } from '../lib/viewTransition';
import {setAggregateEnabled} from '../lib/traffic';
import {TrafficPreferences} from '../components/TrafficPreferences';
import {setAnalyticsConsent} from '../lib/analytics';
import {AnalyticsPreferences} from '../components/AnalyticsPreferences';
import {DiaryBackup} from '../components/DiaryBackup';
import {ParentLinks} from '../components/ParentSupport';
import {AuthorContact, SourceRepositoryLink} from '../components/AuthorContact';
import {clearParentNotice} from '../lib/parentNotice';
import './parent-center.css';
import {WeatherSettings} from '../components/WeatherSettings';
import {GuideSettings} from '../components/GuideSettings';
import { LearningStageSettings } from '../components/LearningStageSettings';
import { learningStageTitle } from '../lib/learningStage';
import { hearEntry } from '../components/LearningItem';
import { useEffect, useRef, useState } from "react";
import { BlockingDialog } from "../components/BlockingDialog";
import { useGame } from "../store";
import { CREATURES, creatureAvatar, creatureArt, getCreature } from "../data/creatures";
import { learningPath, guidedPath, currentNode, pathNodes, pathStars, chapterProgress } from "../lib/learningPath";
import { INVITE_KINDS, INVITE_ORDER } from "../data/invites";
import { recordingCount } from "../lib/db";
import { voiceInfo } from "../lib/voiceAssets";
import { say } from "../lib/speech";
import type { BallType, SaveData } from "../types";
import { Icon } from "../icons";
import { CreatureImg } from "../components/CreatureImg";
import { DeviceSetup } from "../components/DeviceSetup";
import { useNotices } from "../lib/announcements";
import { LEARNING_UNITS,learningEntry,selectedUnit } from '../data/curriculum';
import { reviewKeys } from '../lib/learningProgress';
import {familyLearning} from '../lib/familyLearning';
import {ParentEvidence} from '../components/ParentEvidence';
import {TrialSummaryCard} from '../components/TrialSummaryCard';
import {ParentRecordings,ParentDiaries} from '../components/ParentRecordings';
import {StorageFacts} from '../components/StorageFacts';
import {downloadJson,exportableSave} from '../lib/saveExport';
import {AlphabetGrid,ChapterProgressStrip,RingMeter,WeeklyBarChart} from '../components/ParentCharts';

export function Parent() {
  const save = useGame((s) => s.save);
  const go = useGame((s) => s.go), back = useGame((s) => s.back);
  // Updates install themselves; the update panel opens only when a new version is waiting.
  const { updateAvailable } = useNotices(false);
  const updateSettings = useGame((s) => s.updateSettings);
  const markHomeTried = useGame((s) => s.markHomeTried);
  const grantExtraMinutes = useGame((s) => s.grantExtraMinutes);
  const grantMysteryGift = useGame((s) => s.grantMysteryGift);
  const renameTrainer = useGame((s) => s.renameTrainer);
  const resetAll = useGame((s) => s.resetAll);
  const importSave = useGame((s) => s.importSave);
  const [recCount, setRecCount] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [tab, setTab] = useState<"report" | "settings" | "data">("report");
  const saveBusy=useGame(s=>s.saveBusy);
  const hasBackup=useGame(s=>s.hasSaveBackup);
  const bodyRef=useRef<HTMLDivElement>(null);
  const headingRef=useRef<HTMLHeadingElement>(null);
  const [stageOpen,setStageOpen]=useState(false);
  const [favoritesOpen,setFavoritesOpen]=useState(false);
  const [favoriteQuery,setFavoriteQuery]=useState('');
  const [onlyFavorites,setOnlyFavorites]=useState(false);
  const [favoriteLimit,setFavoriteLimit]=useState(24);
  const [msg, setMsg] = useState(""), [msgFailed, setMsgFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = save.settings;
  const d = save.daily;

  useEffect(() => {
    recordingCount().then(setRecCount).catch(() => setRecCount(0));
  }, []);

  // A failure stays long enough to read and act on; a confirmation passes quickly.
  const flash = (m: string, failed = false) => {
    setMsg(m); setMsgFailed(failed);
    setTimeout(() => setMsg(c => c === m ? "" : c), failed ? 8000 : 2500);
  };

  const exportSave = () => {
    downloadJson(exportableSave(save), `啵啵岛-存档-${d.date}.json`);
  };
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    // Allow retrying the same file after a validation error.
    e.target.value = "";
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      flash("导入失败：存档文件过大（不能超过 2 MB）", true);
      return;
    }
    try {
      await importSave(JSON.parse(await f.text()) as SaveData);
      flash("已导入存档");
    } catch (err) {
      flash(`导入失败：${(err as Error).message}`, true);
    }
  };

  useEffect(()=>{bodyRef.current?.scrollTo({top:0});headingRef.current?.focus({preventScroll:true});},[tab]);
  const current=pathNodes(learningPath(save)).find(n=>n.unit&&n.state!=='done')?.unit??selectedUnit(save);
  const family=familyLearning(save);
  const todayWords=d.words.filter(w=>!w.startsWith('letter:'));
  const completed=LEARNING_UNITS.filter(u=>save.learning?.units[u.id]?.completedAt).length;
  const due=reviewKeys(save).length,retry=reviewKeys(save,'retry').length;
  const records=Object.values(save.learning?.records??{});
  const favoriteOptions=CREATURES.filter(p=>(!onlyFavorites||s.favorites.includes(p.id))&&`${p.nameZh} ${p.nameEn} ${p.id}`.toLowerCase().includes(favoriteQuery.trim().toLowerCase()));
  const history = [...save.history.slice(-6), { date: d.date, energyEarned: d.energyEarned, tasksCompleted: d.tasksCompleted, heard: d.heard, spoken: d.spoken, words: d.words.filter((w) => !w.startsWith("letter:")).length, caught: d.caught.length, playMinutes: Math.round(d.playSeconds / 60) }].reverse();
  const learned = Object.entries(save.learning?.records??{}).filter(([,st])=>st.streak>=2).map(([w])=>w);
  const letters = Object.keys(save.wordStats).filter((w) => w.startsWith("letter:")).map((w) => w.slice(7)).sort();

  const titles={report:'了解孩子的学习',settings:'找到舒服的陪伴节奏',data:'更新与保管小岛'};
  return <div className="screen parent parent-organized">
   <header className="parent-head"><div className="parent-title-row"><button className="btn-round back" onClick={back} aria-label="返回"><Icon name="back" size={30}/></button><h1>家长中心</h1></div><nav className="tabs" aria-label="家长中心分区">{([['report','tasks','学习概况'],['settings','heart','陪伴设置'],['data','gear','应用维护']] as const).map(([id,icon,label])=><button key={id} className={tab===id?'on':''} aria-pressed={tab===id} aria-controls="parent-content" onClick={()=>setTab(id)}><Icon name={icon} size={25}/>{label}</button>)}</nav></header>
   {msg&&<div className="toast" role={msgFailed?"alert":"status"}>{msg}</div>}
   <div className="parent-body" ref={bodyRef} id="parent-content"><div className="parent-page-intro"><h2 tabIndex={-1} ref={headingRef}>{titles[tab]}</h2><p>{tab==='report'?'先看今日数据与 7 天趋势，再按需展开明细。':tab==='settings'?'常用陪伴设置优先，修改后自动保存。':'更新保留学习进度，备份与清空分开管理。'}</p></div>
   {tab==='data'&&<section className="parent-support-tools" aria-label="试用与隐私帮助"><ParentLinks/><div className="parent-project-links"><SourceRepositoryLink/><AuthorContact/></div><TrafficPreferences/><AnalyticsPreferences/><p>暂停试用会回到开始页、关闭访问统计，下次打开需要重新确认试用须知；已有进度不会删除。</p><button className="btn-small" onClick={()=>{setAggregateEnabled(false);setAnalyticsConsent(false);try{clearParentNotice(localStorage);}catch{/* Storage may be blocked. */}go({name:'welcome'});}}>暂停试用</button></section>}
   {tab==='report'&&<>
   <section className="parent-kpi-grid" aria-label="今日学习快照">
    <div className="parent-kpi-card is-ring">
     <RingMeter value={Math.round(d.playSeconds/60)} max={Math.max(1,Math.round(playLimitSeconds(save)/60))} label={`${Math.round(d.playSeconds/60)}`} sub="分钟"/>
     <div><small>今日游玩时长</small><strong>{Math.round(d.playSeconds/60)} 分钟</strong><span>每日上限 {Math.round(playLimitSeconds(save)/60)} 分钟</span></div>
    </div>
    <div className="parent-kpi-card">
     <span className="parent-kpi-icon is-green"><Icon name="book" size={28}/></span>
     <div><small>今日接触词汇</small><strong>{todayWords.length} <small>个</small></strong><span>比较熟的词 {learned.length} 个</span></div>
    </div>
    <div className="parent-kpi-card">
     <span className="parent-kpi-icon is-orange"><Icon name="speak" size={28}/></span>
     <div><small>开口尝试</small><strong>{d.spoken} <small>次</small></strong><span>累计参与 {save.participation?.days??save.streak.count} 天</span></div>
    </div>
    <div className="parent-kpi-card">
     <span className="parent-kpi-icon is-purple"><Icon name="dex" size={28}/></span>
     <div><small>伙伴与课程</small><strong>{completed} <small>/ {LEARNING_UNITS.length} 课</small></strong><span>已认识 {save.captures.length} / {CREATURES.length} 位伙伴</span></div>
    </div>
   </section>
   <WeeklyBarChart days={history} today={d.date}/>
   <section className="parent-learning-focus">
 <div className="parent-section-heading"><div><span className="parent-eyebrow">当前学习阶段 · {learningStageTitle(s)}</span><h3>{current.title}</h3></div><button className="parent-inline-action" onClick={()=>{setStageOpen(true);setTab('settings');}}><Icon name="gear" size={22}/>调整阶段</button></div>
 <ParentPathSummary/>
 <div className="parent-home-idea"><Icon name="heart" size={28}/><div><strong>在家一起试试 · <span lang="en">{family.focus.phrase}</span></strong><p>{family.focus.homePlay}</p><div className="parent-idea-actions">{save.learning?.units[family.focus.id]&&<button className="btn-small parent-home-tried" aria-pressed={!!save.learning.units[family.focus.id].homeTriedAt} onClick={()=>markHomeTried(family.focus.id,!save.learning!.units[family.focus.id].homeTriedAt)}><Icon name={save.learning.units[family.focus.id].homeTriedAt?'heart':'sparkle'} size={22}/>{save.learning.units[family.focus.id].homeTriedAt?`试过了 · ${new Date(save.learning.units[family.focus.id].homeTriedAt!).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}`:'在家试过了'}</button>}<button className="btn-small" onClick={()=>go({name:'notebook',mode:retry?'retry':'all',returnTo:'parent'})}><Icon name="book" size={22}/>词汇与复习{due?`（${due}）`:''}</button></div></div></div>
</section>
<ParentEvidence/>
<TrialSummaryCard/>
<h3 className="parent-detail-heading">需要时，再展开明细</h3>
<details className="parent-fold"><summary><Icon name="book" size={28}/><span>词汇与字母墙<small>今日 {todayWords.length} 词 · 字母 {letters.length}/26</small></span></summary><div className="parent-fold-content"><h3>今天接触的词（{todayWords.length}）</h3>
              <div className="chips">{todayWords.map((w) => <button key={w} className="chip" onClick={() => {const e=learningEntry(w);if(e)void hearEntry(e);else void say(['en',w]);}}>{learningEntry(w)?.en??w}</button>)}</div>
              <h3>比较熟的词（{learned.length}）<small>两天都自己选对，口径见下方说明</small></h3>
              <div className="chips">{learned.map((w) => <button key={w} className="chip ok" onClick={() => {const e=learningEntry(w);if(e)void hearEntry(e);else void say(['en',w]);}}>{learningEntry(w)?.en??w}</button>)}</div>
              <h3>写过的字母（{letters.length} / 26）</h3>
              <AlphabetGrid traced={letters}/>
            {todayWords.length===0&&learned.length===0&&letters.length===0&&<p className="muted">还没有记录。听故事、玩课程或写字后，会慢慢积累在这里。</p>}</div></details>
<details className="parent-fold"><summary><Icon name="tasks" size={28}/><span>最近 7 天明细表<small>查看播放、开口、新词与时长完整数据</small></span></summary><div className="parent-fold-content"><p className="parent-table-hint">表格可左右滑动，查看完整记录。</p><div className="parent-table-scroll" role="region" aria-label="最近七天学习记录，可左右滚动" tabIndex={0}><table className="hist">
                <thead><tr><th>日期</th><th>播放次数</th><th>开口尝试</th><th>任务</th><th>新词</th><th>新伙伴</th><th>分钟</th></tr></thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.date}><td>{h.date.slice(5)}</td><td>{h.heard}</td><td>{h.spoken}</td><td>{h.tasksCompleted}</td><td>{h.words}</td><td>{h.caught}</td><td>{h.playMinutes}</td></tr>
                  ))}
                </tbody>
              </table></div></div></details>
<details className="parent-fold"><summary><Icon name="mic" size={28}/><span>跟读录音<small>{recCount} 条，仅保存在本机</small></span></summary><div className="parent-fold-content"><ParentRecordings onCount={setRecCount}/></div></details>
<details className="parent-fold"><summary><Icon name="book" size={28}/><span>数据口径说明<small>参与、提示与掌握的区别</small></span></summary><div className="parent-fold-content"><p>“不同日期都选对”表示在两个不同日期未使用应用内提示地选对，不代表完全掌握。应用无法判断家长是否提供了帮助，跟读只记录开口尝试。</p><dl className="parent-record-definitions"><div><dt>未用应用提示选对</dt><dd>{records.reduce((n,r)=>n+r.independent,0)} 次</dd></div><div><dt>应用引导或提示下完成</dt><dd>{records.reduce((n,r)=>n+(r.supported??0),0)} 次</dd></div><div><dt>小岛上听懂后去做</dt><dd>{records.reduce((n,r)=>n+(r.actions??0),0)} 次</dd></div><div><dt>今天英文播放（含重播）</dt><dd>{d.heard} 次</dd></div><div><dt>今天完成任务</dt><dd>{d.tasksCompleted} 次</dd></div><div><dt>累计参与天数</dt><dd>{save.participation?.days??save.streak.count} 天</dd></div></dl></div></details>
<section className="parent-support-tools parent-footer-links" aria-label="试用与隐私帮助"><ParentLinks/><div className="parent-project-links"><SourceRepositoryLink/><AuthorContact/></div></section></>}
   {tab==='settings'&&<><details className="parent-fold parent-stage-fold" open={stageOpen} onToggle={e=>setStageOpen(e.currentTarget.open)}><summary><Icon name="sign" size={28}/><span>英语学习阶段<small>当前：{learningStageTitle(s)}</small></span></summary><div className="parent-fold-content"><LearningStageSettings/></div></details>
<section className="form parent-routine"><h3>游玩与休息</h3><label><span>每日游玩时长：<b>{s.dailyMinutes} 分钟</b></span>
                <input type="range" min={5} max={60} step={5} value={s.dailyMinutes} onChange={(e) => updateSettings({ dailyMinutes: Number(e.target.value) })} />
              </label><p className="muted">调整每天的默认时长。今天临时多玩一会儿，可以单独加时。</p><details className="parent-inner-fold"><summary>今天临时加时或送礼物</summary><p>今天已加时 {Math.round((playLimitSeconds(save)-s.dailyMinutes*60)/60)} 分钟</p><div className="row">{[5,10,15].map(m=><button key={m} className="btn-small" onClick={()=>{grantExtraMinutes(m);flash(`今天已增加 ${m} 分钟`);}}>+{m} 分钟</button>)}</div><h4>给孩子一份小礼物</h4><p>可以回应现实生活中的好表现，不与学习成绩绑定。</p><div className="row">{INVITE_ORDER.map((b:BallType)=><button key={b} className="btn-small" onClick={()=>{grantMysteryGift();flash(`已送出一个${INVITE_KINDS[b].zh}`);}}><Icon name="gift" size={24}/>送{INVITE_KINDS[b].zh}</button>)}</div></details></section>
<details className="parent-fold"><summary><Icon name="speaker" size={28}/><span>语言与声音<small>{s.englishMode==='english'?'只说英文':'保留中文提示'} · 语速 {s.speechRate.toFixed(1)}×</small></span></summary><div className="parent-fold-content form"><label>中文提示
                <div className="seg">
                  <button aria-label="英文 + 中文提示" aria-pressed={(s.englishMode ?? "bilingual") === "bilingual"} className={(s.englishMode ?? "bilingual") === "bilingual" ? "on" : ""} onClick={() => updateSettings({ englishMode: "bilingual" })}>英文 + 中文提示</button>
                  <button aria-label="只说英文" aria-pressed={s.englishMode === "english"} className={s.englishMode === "english" ? "on" : ""} onClick={() => updateSettings({ englishMode: "english" })}>只说英文</button>
                </div>
                <span className="muted">刚开始建议保留中文提示（先英文、再中文、最后英文复述）；孩子熟悉这些句型后可切到只说英文。</span>
              </label><label>语速：<b>{s.speechRate.toFixed(1)}×</b>
                <input type="range" min={0.6} max={1.3} step={0.1} value={s.speechRate} onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })} />
              </label><button className="btn-small parent-voice-preview" onClick={()=>say(['en',"Hello! I'm Bubbo!"],['zh','你好，我是啵啵！'])}><Icon name="speaker" size={22}/>试听语音</button><label>背景音乐
                <div className="seg">
                  {([['off','关闭'],['soft','轻轻播放'],['normal','标准音量']] as const).map(([value,label])=><button key={value} aria-pressed={(s.backgroundMusic??'soft')===value} className={(s.backgroundMusic??'soft')===value?'on':''} onClick={()=>updateSettings({backgroundMusic:value})}>{label}</button>)}
                </div>
                <span className="muted">开始页和“我的小岛”的配乐随设备当地时间变化：6–9 点晨光、9–17 点白天、17–21 点傍晚、21–6 点星夜；故事、好朋友相册这些页面有各自的配乐。学习路线、课程、练习、日记、家长中心和休息页保持安静；配音时自动降低，锁屏或切到后台时暂停。</span>
              </label><details className="parent-inner-fold"><summary>配音来源</summary><p>英文旁白 {voiceInfo().en}，中文旁白 {voiceInfo().zh}。所有声音都是提前准备好的配音，每个小精灵有自己的声音，不会换成设备自带的朗读声。</p></details></div></details>
<details className="parent-fold"><summary><Icon name="island" size={28}/><span>小岛天气与声音<small>天气、自然环境声音</small></span></summary><div className="parent-fold-content"><WeatherSettings/></div></details>
<details className="parent-fold"><summary><Icon name="hand" size={28}/><span>操作引导<small>{save.onboarding?.automatic!==false?'首次使用主动提示':'按需点“帮助”'}</small></span></summary><div className="parent-fold-content"><GuideSettings/></div></details>
<details className="parent-fold" onToggle={e=>setFavoritesOpen(e.currentTarget.open)}><summary><Icon name="invite-berry" size={28}/><span>偏爱的伙伴<small>已置顶 {s.favorites.length} 只 · 优先坐船来做客</small></span></summary>{favoritesOpen&&<div className="parent-fold-content"><p>只影响谁更常坐船来小岛做客，以及学习路线上陪在旁边的伙伴；不影响孩子自己选择和谁玩。</p><label className="parent-search">找一个伙伴<input type="search" value={favoriteQuery} placeholder="中文、英文或编号" onChange={e=>{setFavoriteQuery(e.target.value);setFavoriteLimit(24);}}/></label><label className="parent-fav-filter"><input type="checkbox" checked={onlyFavorites} onChange={e=>{setOnlyFavorites(e.target.checked);setFavoriteLimit(24);}}/>只看已置顶</label><div className="fav-grid">{favoriteOptions.slice(0,favoriteLimit).map(p=>{const on=s.favorites.includes(p.id);return <button key={p.id} className={`fav ${on?'on':''}`} aria-pressed={on} aria-label={`${p.nameZh}，${on?'已置顶，点一下取消':'点一下置顶'}`} onClick={()=>updateSettings({favorites:on?s.favorites.filter(x=>x!==p.id):[...s.favorites,p.id]})}><CreatureImg src={creatureAvatar(p.id)} alt=""/><span>{p.nameZh}</span>{on&&<small>已置顶</small>}</button>;})}</div>{!favoriteOptions.length&&<p role="status">{onlyFavorites?'没有符合条件的已置顶伙伴，可以取消筛选看看。':'没有找到，试试其他名字或编号。'}</p>}{favoriteOptions.length>favoriteLimit&&<button className="btn-small" onClick={()=>setFavoriteLimit(n=>n+24)}>再看一些（{Math.min(favoriteLimit,favoriteOptions.length)} / {favoriteOptions.length}）</button>}</div>}</details>
<details className="parent-fold"><summary><Icon name="avatar-red" size={28}/><span>小岛主人的名字<small>{save.trainer?.name||'小岛主人'}</small></span></summary><div className="parent-fold-content form"><label>小岛主人的名字
                <input defaultValue={save.trainer?.name} onChange={(e) => { if (e.target.value.trim()) renameTrainer(e.target.value); }} onBlur={(e) => { renameTrainer(e.target.value); e.target.value = useGame.getState().save.trainer?.name ?? ""; }} maxLength={10} />
              </label><p className="muted">改了就自动保存，上方会显示新名字。最多 10 个字。</p></div></details></>}
   {tab==='data'&&<><DeviceSetup initiallyOpen={updateAvailable} compactTools/>
<details className="parent-fold"><summary><Icon name="book" size={28}/><span>备份与恢复<small>导出存档、导入或恢复上次存档</small></span></summary><div className="parent-fold-content">
              <div className="row">
                <button className="btn-small" onClick={exportSave}>导出存档</button>
                <button className="btn-small" disabled={saveBusy} onClick={() => fileRef.current?.click()}>{saveBusy?"正在保存…":"导入存档"}</button>
                {hasBackup&&<button className="btn-small" disabled={saveBusy} onClick={async()=>{try{await useGame.getState().restoreSaveBackup();}catch(error){flash((error as Error).message, true);}}}>恢复上次导入前的存档</button>}
                <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
                
              </div>
              <div className="muted">存档、录音和小日记保存在当前设备。{import.meta.env.VITE_ONLINE?'网页版暂不提供云端日记转写，不会把日记录音发给语音识别服务。':'只有大人点“上传录音，转成文字”时，才会把选中的日记录音发给语音识别服务（火山引擎），需要联网。'}游戏存档不包含录音和日记。请同时使用下方的日记备份；跟读录音可在学习记录中另存。</div>
            <StorageFacts/>
            <DiaryBackup/></div></details>
<details className="parent-fold"><summary><Icon name="diary" size={28}/><span>小日记与原声<small>查看并逐篇删除</small></span></summary><div className="parent-fold-content"><ParentDiaries/></div></details>
<details className="parent-fold parent-danger"><summary><Icon name="backspace" size={28}/><span>清空本机数据<small>仅在确定不再保留时使用</small></span></summary><div className="parent-fold-content"><p>会删除本机存档、录音和小日记，无法撤销。请先导出游戏存档、备份全部日记与原声，并另存需要保留的跟读录音。</p><button className="btn-small danger" onClick={() => setClearing(true)}>清空全部数据</button>{clearing&&<BlockingDialog className="modal-backdrop" label="清空本机数据" onClose={()=>withTransition(()=>setClearing(false))}><section className="modal clear-confirm" aria-labelledby="clear-confirm-title"><h2 id="clear-confirm-title">清空这台设备上的全部数据？</h2><p>会删除本机存档、跟读录音和小日记（文字和原声），无法撤销。</p><div className="row"><button className="btn-small" autoFocus onClick={()=>withTransition(()=>setClearing(false))}>取消</button><button className="btn-small danger" onClick={()=>{setClearing(false);setAggregateEnabled(false);setAnalyticsConsent(false);void resetAll();}}>清空全部数据</button></div></section></BlockingDialog>}</div></details></>}
   </div>
  </div>;
}

const NEXT_KIND:Record<string,string>={lesson:'学一站课',story:'听这一章的绘本',island:'带伙伴去小岛用一用',friend:'认识一位新朋友',diary:'说说这一章',review:'和学过的词再见面',welcome:'用见面礼认识第一位朋友'};
/** The learning path as a parent sees it: where the child is, what comes next, and the friends met on the way. */
function ParentPathSummary(){
 const save=useGame(s=>s.save);
 const route=learningPath(save),path=guidedPath(save, route),next=currentNode(path);
 const chapter=path[next?.chapter??path.length-1],total=pathNodes(route).length,stars=pathStars(route,save);
 const friends=Object.entries(save.path?.friends??{}).sort(([a],[b])=>+a-+b);
 const chapters=route.map(c=>{const p=chapterProgress(c);return {index:c.index,title:c.title,done:p.done,total:p.total};});
 return <div className="parent-path-summary">
  <div className="parent-path-row">
   <div><span className="parent-eyebrow">学习路线 · 第 {chapter.index+1} / {route.length} 章</span><strong>{chapter.title}</strong></div>
   <span className="pchart-badge-pill">已点亮 {stars} / {total} 站</span>
  </div>
  <ChapterProgressStrip chapters={chapters} currentIndex={chapter.index}/>
  <p>{next?<>下一站：<b>{NEXT_KIND[next.kind]}</b>{next.kind==='lesson'||next.kind==='story'?`「${next.title}」`:''}</>:'整条路线已经走完，可以挑喜欢的站再玩一次。'}</p>
  {friends.length>0&&<div className="parent-path-friends" aria-label="路线上认识的朋友">{friends.map(([c,id])=><span key={c}><CreatureImg src={creatureArt(id)} alt=""/>第 {+c+1} 章 · {getCreature(id).nameZh}</span>)}</div>}
 </div>;
}
