import {EnergyToast} from '../components/EnergyToast';
import { EnergyReturn } from '../components/EnergyReturn';
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

export function TaskScreen({ kind, boardIndex, practice=false }: { kind: TaskKind; boardIndex: number | null; practice?:boolean }) {
  const [progressHost,setProgressHost]=useState<HTMLDivElement|null>(null);
  const go = useGame((s) => s.go);
  const completeTask = useGame((s) => s.completeTask);
  const [reward, setReward] = useState<TaskReward | null>(null);
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
    if (!active.current || finished.current) return; // 防止重复结算能量
    const state=useGame.getState();
    if(!state.loaded||state.saveIssue||state.saveBusy)return;
    finished.current = true;
    releaseMic();
    const r = await completeTask(kind, boardIndex);
    if(!active.current||!r)return;
    setDiscoveries(Object.entries(useGame.getState().save.learning?.records??{})
      .filter(([key,record])=>record.seen>(sessionStart.seen[key]??0)&&learningEntry(key))
      .sort(([,a],[,b])=>b.lastSeen-a.lastSeen).slice(0,3).map(([key])=>key));
    setReward(r);
    const parts: Parameters<typeof say> = [["en", "You did it!"]];
    if(r.gained+r.bonus>0)parts.push(["zh",`你得到了${r.gained+r.bonus}点能量！`]);
    if(r.ballGranted)parts.push(["en","You got a Poké Ball!"]);
    say(...parts);
  };

  const back = () => {
    releaseMic();
    go({ name: practice ? "practice" : "tasks" });
  };

  return (
    <ProgressHost.Provider value={progressHost}><div className={`screen task task-${kind}`} >
      <TopBar icon={info.icon} title={practice ? `${info.zh} · 加练` : info.zh} onBack={back} focused progress={!reward&&(kind==='trace'?<RoundProgress index={traced.length} total={practice?3:1} unit="个字母"/>:<div ref={setProgressHost}/>)} help={<FeatureGuide compact id={passive?"lesson":kind} autoVoice={false} enabled={!reward}>
        {(kind==='trace'||kind==='repeat')&&!reward&&<div className="guide-alternative">说和写都可以稍后再试。<button className="btn-small" onClick={()=>{releaseMic();go({name:'task',kind:'wordpic',returnGoal:('returnGoal' in useGame.getState().screen?(useGame.getState().screen as {returnGoal?:import('../lib/energyGoal').EnergyGoal}).returnGoal:undefined),boardIndex:null,session:Date.now()});}}><Icon name="picture" size={28}/>换个游戏</button></div>}
      </FeatureGuide>}/>

      <div className="task-stage">
        {kind === "listen" && <ListenTask onFinish={finish} practice={practice} />}
        {kind === "repeat" && <RepeatTask onFinish={finish} practice={practice} />}
        {kind === "wordpic" && <WordPicTask onFinish={finish} practice={practice} />}
        {kind === "trace" && <div className="trace-session"><TraceTask key={traced.length} excluded={traced} onFinish={letter=>{if(practice && traced.length<2)setTraced(prev=>[...prev,letter]);else finish();}} /></div>}
      </div>
      {reward && (
        <Celebration onClose={back}>
          <div className="learning-reward">
          <div className="cel-title">这一小段完成啦！</div>
          {!!discoveries.length&&<><p>刚才一起遇见了</p><div className="session-discoveries">{discoveries.map(key=>{const entry=learningEntry(key)!;return <span key={key}><LearningArt entry={entry}/><b lang="en">{entry.en}</b><small>{entry.zh}</small></span>;})}</div></>}
          <EnergyToast reward={reward}/>
          <div className="cel-actions completion-next">
            <button className="btn-big" onClick={()=>go({name:'journey'})}><Icon name="sign" size={36}/>看看下一站</button>
            <button className="btn-big alt" onClick={()=>go({name:'home',station:sessionStart.unit.station})}><Icon name="island" size={28}/>回小岛玩</button>
          </div><EnergyReturn/>
          </div>
        </Celebration>
      )}
    </div></ProgressHost.Provider>
  );
}
