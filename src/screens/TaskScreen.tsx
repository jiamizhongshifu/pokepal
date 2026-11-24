import { storyBackground } from '../data/sceneArt';
import './task-scene.css';
import { CreatureImg } from "../components/CreatureImg";
import { creatureExpression, getCreature } from "../data/creatures";
import { BuddyImg } from "../components/BuddyImg";
import {trackInteraction} from '../lib/interaction';
import {EnergyToast} from '../components/EnergyToast';
import {ProgressHost,RoundProgress} from '../components/RoundProgress';
import { learningProfile } from '../lib/learningStage';
import {selectedUnit,learningEntry} from '../data/curriculum';
import {LearningArt} from '../components/LearningItem';
import '../components/learning-trail.css';
import { FeatureGuide } from '../components/FeatureGuide';
import { useEffect, useRef, useState } from "react";
import { TASK_INFO, useGame, type TaskReward } from "../store";
import { TopBar } from "../components/TopBar";
import { Celebration } from "../components/Celebration";
import { say } from "../lib/speech";
import { releaseMic } from "../lib/mic";
import { ListenTask } from "./tasks/ListenTask";
import { RepeatTask } from "./tasks/RepeatTask";
import { WordPicTask } from "./tasks/WordPicTask";
import { TraceTask } from "./tasks/TraceTask";
import type { TaskKind } from "../types";
import { Icon } from "../icons";

/** Each practice game is played in a scene of its own, with the friend beside a titled card holding the game. */
const TASK_SCENE: Record<TaskKind, string> = { listen: 'meadow', wordpic: 'orchard', repeat: 'playground', trace: 'garden-path' };
const TASK_TITLE: Record<TaskKind, [kind: string, title: string]> = {
  listen: ['听一听', '听伙伴说，点出对的那个'], wordpic: ['认一认', '看看图，找出伙伴说的那个'],
  repeat: ['说一说', '听一句，跟着伙伴说一说'], trace: ['写一写', '从小圆点出发，跟着写一写'],
};
export function TaskScreen({ kind, boardIndex, practice=false }: { kind: TaskKind; boardIndex: number | null; practice?:boolean }) {
 const trackedStart=useRef(false);
 useEffect(()=>{if(!trackedStart.current){trackedStart.current=true;trackInteraction('practice_started');}},[]);
  const [progressHost,setProgressHost]=useState<HTMLDivElement|null>(null);
  const go = useGame((s) => s.go);
  const completeTask = useGame((s) => s.completeTask);
  const [reward, setReward] = useState<TaskReward | null>(null);
  // One companion practises alongside for the whole set; finishing counts as time played together.
  const [buddy]=useState(()=>{const ids=useGame.getState().save.captures.map(c=>c.id);return ids.length?ids[Math.floor(Math.random()*ids.length)]:undefined;});
  const info = TASK_INFO[kind];
  const passive=useGame(s=>learningProfile(s.save.settings).entry==='listen')&&(kind==='listen'||kind==='wordpic');
  const [sessionStart]=useState(()=>({unit:selectedUnit(useGame.getState().save),seen:Object.fromEntries(Object.entries(useGame.getState().save.learning?.records??{}).map(([key,r])=>[key,r.seen]))}));
  const [discoveries,setDiscoveries]=useState<string[]>([]);
  const [traced,setTraced]=useState<string[]>([]);
  const finished = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const finish = async () => {
    if (!active.current || finished.current) return; // 防止重复结算
    const state=useGame.getState();
    if(!state.loaded||state.saveIssue||state.saveBusy)return;
    finished.current = true;
    releaseMic();
    const r = await completeTask(kind, boardIndex, buddy);
    if(!active.current||!r)return;
    setDiscoveries(Object.entries(useGame.getState().save.learning?.records??{})
      .filter(([key,record])=>record.seen>(sessionStart.seen[key]??0)&&learningEntry(key))
      .sort(([,a],[,b])=>b.lastSeen-a.lastSeen).slice(0,3).map(([key])=>key));
    setReward(r);
    const parts: Parameters<typeof say> = [["en", "You did it!"]];
    if(r.ballGranted)parts.push(["en","You got an invite berry!"]);
    say(...parts);
  };

  const back = () => {
    releaseMic();
    go(practice ? { name: "practice" } : { name: "home" });
  };

  return (
    <ProgressHost.Provider value={progressHost}><div className={`screen task task-${kind} task-staged`} style={{backgroundImage:`url(${storyBackground(TASK_SCENE[kind])})`}}>
      <TopBar icon={info.icon} title={practice ? `${info.zh} · 加练` : info.zh} onBack={back} focused progress={!reward&&(kind==='trace'?<RoundProgress index={traced.length} total={practice?3:1} unit="个字母"/>:<div ref={setProgressHost}/>)} help={<FeatureGuide compact id={passive?"lesson":kind} autoVoice={false} enabled={!reward}>
        {(kind==='trace'||kind==='repeat')&&!reward&&<div className="guide-alternative">说和写都可以稍后再试。<button className="btn-small" onClick={()=>{releaseMic();go({name:'task',kind:'wordpic',boardIndex:null,session:Date.now()});}}><Icon name="picture" size={28}/>换个游戏</button></div>}
      </FeatureGuide>}/>

      {buddy!==undefined&&!reward&&<div className="task-friend"><BuddyImg id={buddy} alt=""/><span>{getCreature(buddy).nameZh}陪你练</span></div>}
      <div className="practice-card"><header><small>{TASK_TITLE[kind][0]}</small><h2>{TASK_TITLE[kind][1]}</h2></header>
      <div className="task-stage">
        {kind === "listen" && <ListenTask onFinish={finish} practice={practice} />}
        {kind === "repeat" && <RepeatTask onFinish={finish} practice={practice} buddyId={buddy} />}
        {kind === "wordpic" && <WordPicTask onFinish={finish} practice={practice} />}
        {kind === "trace" && <div className="trace-session"><TraceTask key={traced.length} excluded={traced} onFinish={letter=>{if(practice && traced.length<2)setTraced(prev=>[...prev,letter]);else finish();}} /></div>}
      </div></div>
      {reward && (
        <Celebration onClose={back}>
          <div className="learning-reward">
          <div className="cel-title">这一小段完成啦！</div>
          {buddy!==undefined&&<p className="task-buddy-done"><CreatureImg src={creatureExpression(buddy,"proud")} alt=""/>和{getCreature(buddy).nameZh}一起练了一次</p>}
          {!!discoveries.length&&<><p>刚才一起遇见了</p><div className="session-discoveries">{discoveries.map(key=>{const entry=learningEntry(key)!;return <span key={key}><LearningArt entry={entry}/><b lang="en">{entry.en}</b><small>{entry.zh}</small></span>;})}</div></>}
          <EnergyToast reward={reward}/>
          <div className="cel-actions completion-next">
            <button className="btn-big" onClick={()=>go({name:'home'})}><Icon name="sign" size={36}/>回到学习路线</button>
            <button className="btn-big alt" onClick={()=>go({name:'home',station:sessionStart.unit.station})}><Icon name="island" size={28}/>回小岛玩</button>
          </div>
          </div>
        </Celebration>
      )}
    </div></ProgressHost.Provider>
  );
}
