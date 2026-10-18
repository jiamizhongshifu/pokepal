import {DiaryBackup} from '../components/DiaryBackup';
import {ParentLinks} from '../components/ParentSupport';
import {clearParentNotice} from '../lib/parentNotice';
import './parent-center.css';
import {WeatherSettings} from '../components/WeatherBadge';
import {GuideSettings} from '../components/GuideSettings';
import { LearningStageSettings } from '../components/LearningStageSettings';
import { learningStageTitle } from '../lib/learningStage';
import { hearEntry } from '../components/LearningItem';
import { useEffect, useRef, useState } from "react";
import { DAILY_ENERGY_CAP, playLimitSeconds, useGame } from "../store";
import { BALLS, BALL_ORDER, POKEMON, spriteUrl } from "../data/pokemon";
import { listRecordings, type Recording } from "../lib/db";
import { playUrl, say, voiceInfo } from "../lib/speech";
import type { BallType, SaveData } from "../types";
import { Icon } from "../icons";
import { PokeImg } from "../components/PokeImg";
import { DeviceSetup } from "../components/DeviceSetup";
import { LEARNING_UNITS,learningEntry,selectedUnit } from '../data/curriculum';
import { reviewKeys } from '../lib/learningProgress';

export function Parent() {
  const save = useGame((s) => s.save);
  const go = useGame((s) => s.go);
  const updateSettings = useGame((s) => s.updateSettings);
  const grantExtraMinutes = useGame((s) => s.grantExtraMinutes);
  const grantMysteryGift = useGame((s) => s.grantMysteryGift);
  const renameTrainer = useGame((s) => s.renameTrainer);
  const resetAll = useGame((s) => s.resetAll);
  const importSave = useGame((s) => s.importSave);
  const [recs, setRecs] = useState<Recording[]>([]);
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
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const s = save.settings;
  const d = save.daily;

  useEffect(() => {
    listRecordings().then(setRecs).catch(() => setRecs([]));
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2500);
  };

  const exportSave = () => {
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pokepal-save-${d.date}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    // Allow retrying the same file after a validation error.
    e.target.value = "";
    if (!f) return;
    try {
      await importSave(JSON.parse(await f.text()) as SaveData);
      flash("已导入存档");
    } catch (err) {
      flash(`导入失败：${(err as Error).message}`);
    }
  };

  useEffect(()=>{bodyRef.current?.scrollTo({top:0});headingRef.current?.focus({preventScroll:true});},[tab]);
  const current=selectedUnit(save);
  const todayWords=d.words.filter(w=>!w.startsWith('letter:'));
  const completed=LEARNING_UNITS.filter(u=>save.learning?.units[u.id]?.completedAt).length;
  const due=reviewKeys(save).length,retry=reviewKeys(save,'retry').length;
  const records=Object.values(save.learning?.records??{});
  const favoriteOptions=POKEMON.filter(p=>(!onlyFavorites||s.favorites.includes(p.id))&&`${p.nameZh} ${p.nameEn} ${p.id}`.toLowerCase().includes(favoriteQuery.trim().toLowerCase()));
  const history = [...save.history.slice(-6), { date: d.date, energyEarned: d.energyEarned, tasksCompleted: d.tasksCompleted, heard: d.heard, spoken: d.spoken, words: d.words.filter((w) => !w.startsWith("letter:")).length, caught: d.caught.length, playMinutes: Math.round(d.playSeconds / 60) }].reverse();
  const learned = Object.entries(save.learning?.records??{}).filter(([,st])=>st.streak>=2).map(([w])=>w);
  const letters = Object.keys(save.wordStats).filter((w) => w.startsWith("letter:")).map((w) => w.slice(7)).sort();

  const titles={report:'了解孩子的学习',settings:'找到舒服的陪伴节奏',data:'更新与保管小岛'};
  return <div className="screen parent parent-organized">
   <header className="parent-head"><div className="parent-title-row"><button className="btn-round back" onClick={()=>go({name:'home'})} aria-label="返回"><Icon name="back" size={30}/></button><h2>家长中心</h2></div><nav className="tabs" aria-label="家长中心分区">{([['report','tasks','学习概况'],['settings','heart','陪伴设置'],['data','gear','应用维护']] as const).map(([id,icon,label])=><button key={id} className={tab===id?'on':''} aria-pressed={tab===id} aria-controls="parent-content" onClick={()=>setTab(id)}><Icon name={icon} size={25}/>{label}</button>)}</nav></header>
   {msg&&<div className="toast" role="status">{msg}</div>}
   <div className="parent-body" ref={bodyRef} id="parent-content"><div className="parent-page-intro"><h2 tabIndex={-1} ref={headingRef}>{titles[tab]}</h2><p>{tab==='report'?'先看看最近在接触什么，再决定怎样陪伴。':tab==='settings'?'常用设置优先，其余按需要展开。修改后自动保存。':'更新保留学习进度。备份和数据清理分开管理。'}</p></div>
   <section className="parent-support-tools" aria-label="试用与隐私帮助"><ParentLinks/>{tab==='data'&&<><p>暂停试用会回到首页并撤回本机阅读确认，不删除已有进度。</p><button className="btn-small" onClick={()=>{try{clearParentNotice(localStorage);}catch{/* Storage may be blocked. */}go({name:'welcome'});}}>暂停试用</button></>}</section>
   {tab==='report'&&<><section className="parent-learning-focus">
 <div className="parent-section-heading"><div><span className="parent-eyebrow">当前学习阶段 · {learningStageTitle(s)}</span><h3>{current.title}</h3></div><button className="parent-inline-action" onClick={()=>{setStageOpen(true);setTab('settings');}}><Icon name="gear" size={22}/>调整阶段</button></div>
 <p className="parent-course-progress">已体验 {completed} / {LEARNING_UNITS.length} 站，不代表已经掌握。</p>
 <div className="parent-home-idea"><Icon name="heart" size={28}/><div><strong>今天可以这样陪伴</strong><p>{current.homePlay}</p></div></div>
 <p className="parent-review-note">{due?`${due} 个词可以再遇见，${retry} 个词上次需要帮助。`:'暂时没有到期的复习，轻松听一听、玩一玩就好。'}</p>
 <button className="btn-small" onClick={()=>go({name:'notebook',mode:retry?'retry':'all',returnTo:'parent'})}><Icon name="book" size={24}/>查看词汇与复习</button>
</section>
<section className="parent-today"><h3>今天的小足迹</h3><dl><div><dt>接触的词</dt><dd>{todayWords.length}<small> 个</small></dd></div><div><dt>开口尝试</dt><dd>{d.spoken}<small> 次</small></dd></div><div><dt>游玩时间</dt><dd>{Math.round(d.playSeconds/60)}<small> / {Math.round(playLimitSeconds(save)/60)} 分钟</small></dd></div></dl><p>开口包含手动确认，不作为发音评分。轻松参与比完成数量更重要。</p></section>
<h3 className="parent-detail-heading">需要时，再看看</h3>
<details className="parent-fold"><summary><Icon name="book" size={28}/><span>词汇与书写记录<small>今天接触 {todayWords.length} 个词 · 熟悉 {learned.length} 个词</small></span></summary><div className="parent-fold-content"><h3>今天接触的词（{d.words.filter((w) => !w.startsWith("letter:")).length}）</h3>
              <div className="chips">{d.words.filter((w) => !w.startsWith("letter:")).map((w) => <button key={w} className="chip" onClick={() => {const e=learningEntry(w);if(e)void hearEntry(e);else void say(['en',w]);}}>{learningEntry(w)?.en??w}</button>)}</div>
              <h3>渐渐熟悉的词（不同日期独立选对，共 {learned.length}）</h3>
              <div className="chips">{learned.map((w) => <button key={w} className="chip ok" onClick={() => {const e=learningEntry(w);if(e)void hearEntry(e);else void say(['en',w]);}}>{learningEntry(w)?.en??w}</button>)}</div>
              <h3>写过的字母（{letters.length} / 26）</h3>
              <div className="chips">{letters.map((l) => <span key={l} className="chip letter">{l}</span>)}</div>
            {todayWords.length===0&&learned.length===0&&letters.length===0&&<p className="muted">还没有记录。听故事、玩课程或写字后，会慢慢积累在这里。</p>}</div></details>
<details className="parent-fold"><summary><Icon name="tasks" size={28}/><span>最近 7 天<small>查看参与与游玩记录</small></span></summary><div className="parent-fold-content"><p className="parent-table-hint">表格可左右滑动，查看完整记录。</p><div className="parent-table-scroll" role="region" aria-label="最近七天学习记录，可左右滚动" tabIndex={0}><table className="hist">
                <thead><tr><th>日期</th><th>播放次数</th><th>开口尝试</th><th>任务</th><th>能量</th><th>新词</th><th>抓到</th><th>分钟</th></tr></thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.date}><td>{h.date.slice(5)}</td><td>{h.heard}</td><td>{h.spoken}</td><td>{h.tasksCompleted}</td><td>{h.energyEarned}/{DAILY_ENERGY_CAP}</td><td>{h.words}</td><td>{h.caught}</td><td>{h.playMinutes}</td></tr>
                  ))}
                </tbody>
              </table></div></div></details>
<details className="parent-fold"><summary><Icon name="mic" size={28}/><span>跟读录音<small>{recs.length} 条，仅保存在本机</small></span></summary><div className="parent-fold-content"><h3>跟读录音（最近 {recs.length} 条，仅存本机）</h3>
              {recs.length === 0 && <div className="muted">还没有录音。跟读任务里检测到跟读声音后会自动保存；点“我说完啦”不一定产生录音。</div>}
              <div className="recs">
                {recs.map((r) => (
                  <button key={r.id} className="rec" onClick={() => { const u = URL.createObjectURL(r.blob); playUrl(u).then(() => URL.revokeObjectURL(u)); }}>
                    <Icon name="play" size={22} /> <b>{r.phrase}</b> <small>{new Date(r.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                  </button>
                ))}
              </div>
            </div></details>
<details className="parent-fold"><summary><Icon name="book" size={28}/><span>怎样理解这些记录<small>参与、熟悉与掌握的区别</small></span></summary><div className="parent-fold-content"><p>“熟悉”表示在两个不同日期未使用应用内提示地选对，不代表完全掌握。跟读只记录开口尝试；体验一站也不代表完全掌握。</p><dl className="parent-record-definitions"><div><dt>累计独立指认</dt><dd>{records.reduce((n,r)=>n+r.independent,0)} 次</dd></div><div><dt>帮助下参与</dt><dd>{records.reduce((n,r)=>n+(r.supported??0),0)} 次</dd></div><div><dt>场景行动</dt><dd>{records.reduce((n,r)=>n+(r.actions??0),0)} 次</dd></div><div><dt>今天英文播放（含重播）</dt><dd>{d.heard} 次</dd></div><div><dt>今天完成任务</dt><dd>{d.tasksCompleted} 次</dd></div><div><dt>累计参与天数</dt><dd>{save.participation?.days??save.streak.count} 天</dd></div><div><dt>伙伴收集</dt><dd>{save.captures.length} / {POKEMON.length}</dd></div></dl></div></details></>}
   {tab==='settings'&&<><details className="parent-fold parent-stage-fold" open={stageOpen} onToggle={e=>setStageOpen(e.currentTarget.open)}><summary><Icon name="sign" size={28}/><span>英语学习阶段<small>当前：{learningStageTitle(s)}</small></span></summary><div className="parent-fold-content"><LearningStageSettings/></div></details>
<section className="form parent-routine"><h3>游玩与休息</h3><label><span>每日游玩时长：<b>{s.dailyMinutes} 分钟</b></span>
                <input type="range" min={5} max={60} step={5} value={s.dailyMinutes} onChange={(e) => updateSettings({ dailyMinutes: Number(e.target.value) })} />
              </label><p className="muted">调整每天的默认时长。今天临时多玩一会儿，可以单独加时。</p><details className="parent-inner-fold"><summary>今天临时加时或送礼物</summary><p>今天已加时 {Math.round((playLimitSeconds(save)-s.dailyMinutes*60)/60)} 分钟</p><div className="row">{[5,10,15].map(m=><button key={m} className="btn-small" onClick={()=>{grantExtraMinutes(m);flash(`今天已增加 ${m} 分钟`);}}>+{m} 分钟</button>)}</div><h4>给宝宝一份小礼物</h4><p>可以回应现实生活中的好表现，不与学习成绩绑定。</p><div className="row">{BALL_ORDER.map((b:BallType)=><button key={b} className="btn-small" onClick={()=>{grantMysteryGift();flash(`已送出一个${BALLS[b].zh}`);}}><Icon name="gift" size={24}/>送{BALLS[b].zh}</button>)}</div></details></section>
<details className="parent-fold"><summary><Icon name="speaker" size={28}/><span>语言与声音<small>{s.englishMode==='english'?'只说英文':'保留中文提示'} · 语速 {s.speechRate.toFixed(1)}×</small></span></summary><div className="parent-fold-content form"><label>中文提示
                <div className="seg">
                  <button aria-label="英文 + 中文提示" aria-pressed={(s.englishMode ?? "bilingual") === "bilingual"} className={(s.englishMode ?? "bilingual") === "bilingual" ? "on" : ""} onClick={() => updateSettings({ englishMode: "bilingual" })}>英文 + 中文提示</button>
                  <button aria-label="只说英文" aria-pressed={s.englishMode === "english"} className={s.englishMode === "english" ? "on" : ""} onClick={() => updateSettings({ englishMode: "english" })}>只说英文</button>
                </div>
                <span className="muted">刚开始建议保留中文提示（先英文、再中文、最后英文复述）；宝宝熟悉这些句型后可切到只说英文。</span>
              </label><label>语速：<b>{s.speechRate.toFixed(1)}×</b>
                <input type="range" min={0.6} max={1.3} step={0.1} value={s.speechRate} onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })} />
              </label><button className="btn-small parent-voice-preview" onClick={()=>say(['en',"Hello! I'm Pikachu!"],['zh','你好，我是皮卡丘！'])}><Icon name="speaker" size={22}/>试听语音</button><label>家园英语（磨耳朵）
                <div className="seg">
                  {([["off", "关闭"], ["some", "少一点"], ["more", "多一点"]] as const).map(([v, t]) => (
                    <button key={v} aria-label={t} aria-pressed={(s.ambientEnglish ?? "some") === v} className={(s.ambientEnglish ?? "some") === v ? "on" : ""} onClick={() => updateSettings({ ambientEnglish: v })}>{t}</button>
                  ))}
                </div>
                <span className="muted">宝宝在家园里玩的时候，旁白会用简单英语描述宝可梦正在做的事（Look! Pikachu is eating. Yum yum!），也会数一数、找一找、说颜色。少一点约 50 秒一句，多一点约 25 秒一句。</span>
              </label><label>背景音乐
                <div className="seg">
                  {([['off','关闭'],['soft','轻轻播放'],['normal','标准音量']] as const).map(([value,label])=><button key={value} aria-pressed={(s.backgroundMusic??'soft')===value} className={(s.backgroundMusic??'soft')===value?'on':''} onClick={()=>updateSettings({backgroundMusic:value})}>{label}</button>)}
                </div>
                <span className="muted">小岛配乐随设备当地时间变化：6–9 点晨光、9–17 点白天、17–21 点傍晚、21–6 点星夜。配音时自动降低，答题、跟读和日记录音时暂停。锁屏或切到后台也会暂停。</span>
              </label><details className="parent-inner-fold"><summary>配音来源</summary><p>英文 {voiceInfo().en}，中文 {voiceInfo().zh}。统一使用火山引擎离线配音，角色使用对应音色，不切换设备系统语音。</p></details></div></details>
<details className="parent-fold"><summary><Icon name="island" size={28}/><span>小岛环境与画面<small>天气、自然声音、镜头与画质</small></span></summary><div className="parent-fold-content"><WeatherSettings/><div className="form"><label>闲置时观察伙伴
                <div className="seg">
                  <button aria-label="开启闲置观察" aria-pressed={s.idleCamera!==false} className={s.idleCamera!==false?'on':''} onClick={()=>updateSettings({idleCamera:true})}>开启</button>
                  <button aria-label="关闭闲置观察" aria-pressed={s.idleCamera===false} className={s.idleCamera===false?'on':''} onClick={()=>updateSettings({idleCamera:false})}>关闭</button>
                </div>
                <span className="muted">45 秒没有操作时，镜头会慢慢看看伙伴们在做什么；轻触屏幕立即交还控制。互动或学习时暂停；系统开启减少动态效果时使用固定机位，不飞行或持续追踪。</span>
              </label><label>家园画质
                <div className="seg">
                  <button aria-label="流畅" aria-pressed={!s.hqLighting} className={!s.hqLighting ? "on" : ""} onClick={() => updateSettings({ hqLighting: false })}>流畅</button>
                  <button aria-label="高画质光影" aria-pressed={s.hqLighting} className={s.hqLighting ? "on" : ""} onClick={() => updateSettings({ hqLighting: true })}>高画质光影</button>
                </div>
                <span className="muted">高画质会开启实时环境光遮蔽，物体之间的阴影更真实，但更耗电，建议 iPad Pro 使用；卡顿时会自动关闭。</span>
              </label></div></div></details>
<details className="parent-fold"><summary><Icon name="hand" size={28}/><span>操作引导<small>{save.onboarding?.automatic!==false?'首次使用主动提示':'按需点“怎么玩”'}</small></span></summary><div className="parent-fold-content"><GuideSettings/></div></details>
<details className="parent-fold" onToggle={e=>setFavoritesOpen(e.currentTarget.open)}><summary><Icon name="pokeball" size={28}/><span>偏爱的伙伴<small>已置顶 {s.favorites.length} 只 · 在草丛里优先出现</small></span></summary>{favoritesOpen&&<div className="parent-fold-content"><p>只影响随机出现的优先顺序；宝宝仍能在草丛和图鉴里指定伙伴。</p><label className="parent-search">找一个伙伴<input type="search" value={favoriteQuery} placeholder="中文、英文或编号" onChange={e=>{setFavoriteQuery(e.target.value);setFavoriteLimit(24);}}/></label><label className="parent-fav-filter"><input type="checkbox" checked={onlyFavorites} onChange={e=>{setOnlyFavorites(e.target.checked);setFavoriteLimit(24);}}/>只看已置顶</label><div className="fav-grid">{favoriteOptions.slice(0,favoriteLimit).map(p=>{const on=s.favorites.includes(p.id);return <button key={p.id} className={`fav ${on?'on':''}`} aria-pressed={on} aria-label={`${p.nameZh}，${on?'已置顶，点击取消':'点击置顶'}`} onClick={()=>updateSettings({favorites:on?s.favorites.filter(x=>x!==p.id):[...s.favorites,p.id]})}><PokeImg src={spriteUrl(p.id)} alt=""/><span>{p.nameZh}</span>{on&&<small>已置顶</small>}</button>;})}</div>{!favoriteOptions.length&&<p role="status">{onlyFavorites?'没有符合条件的已置顶伙伴，可以取消筛选看看。':'没有找到，试试其他名字或编号。'}</p>}{favoriteOptions.length>favoriteLimit&&<button className="btn-small" onClick={()=>setFavoriteLimit(n=>n+24)}>再看一些（{Math.min(favoriteLimit,favoriteOptions.length)} / {favoriteOptions.length}）</button>}</div>}</details>
<details className="parent-fold"><summary><Icon name="avatar-red" size={28}/><span>训练师名字<small>{save.trainer?.name||'小小训练师'}</small></span></summary><div className="parent-fold-content form"><label>训练师名字
                <input defaultValue={save.trainer?.name} onBlur={(e) => renameTrainer(e.target.value)} maxLength={10} />
              </label><p className="muted">输入后离开输入框即可保存，最多 10 个字。</p></div></details></>}
   {tab==='data'&&<><DeviceSetup initiallyOpen compactTools/>
<details className="parent-fold"><summary><Icon name="book" size={28}/><span>备份与恢复<small>导出存档、导入或恢复上次存档</small></span></summary><div className="parent-fold-content">
              <div className="row">
                <button className="btn-small" onClick={exportSave}>导出存档</button>
                <button className="btn-small" disabled={saveBusy} onClick={() => fileRef.current?.click()}>{saveBusy?"正在保存…":"导入存档"}</button>
                {hasBackup&&<button className="btn-small" disabled={saveBusy} onClick={async()=>{try{await useGame.getState().restoreSaveBackup();}catch(error){flash((error as Error).message);}}}>恢复上次导入前的存档</button>}
                <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
                
              </div>
              <div className="muted">存档、录音和小日记保存在当前设备。{import.meta.env.VITE_ONLINE?'网页版暂不提供云端日记转写，不会把日记录音发送到火山。':'另行点击日记转写时，会把所选录音发送到火山，需要联网。'}游戏存档不包含录音和日记。请同时使用下方的日记备份；跟读录音可在学习记录中另存。</div>
            <DiaryBackup/></div></details>
<details className="parent-fold parent-danger"><summary><Icon name="book" size={28}/><span>清空本机数据<small>仅在确定不再保留时使用</small></span></summary><div className="parent-fold-content"><p>会删除本机存档、录音和小日记，无法撤销。请先导出游戏存档、备份全部日记与原声，并另存需要保留的跟读录音。</p><button className="btn-small danger" onClick={() => { if (confirm("确定清空全部存档、录音和小日记吗？此操作无法撤销。")) resetAll(); }}>清空全部数据</button></div></details></>}
   </div>
  </div>;
}
