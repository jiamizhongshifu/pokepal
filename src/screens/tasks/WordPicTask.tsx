import {RoundProgress} from '../../components/RoundProgress';
import { learningProfile } from '../../lib/learningStage';
import { ListeningDiscovery } from './ListeningDiscovery';
import { useEffect, useMemo, useRef, useState } from "react";
import { dailyLearningPlan } from "../../data/learning";
import { learningLevel } from '../../data/curriculum';
import { useGame } from "../../store";
import { PIC_WORDS, pickRandom, type PicWord } from "../../data/words";
import { askParts, feedbackParts, picAsk, picNo, picYes } from "../../data/taskEnglish";
import { say, wait, stopSpeech } from "../../lib/speech";
import { useChoice } from "./useChoice";
import { Icon } from "../../icons";

interface Round { options: PicWord[]; target: PicWord }

function makeRounds(level:1|2,practice:boolean):Round[]{
 const save=useGame.getState().save,choices=learningProfile(save.settings).choices;
 const targets=dailyLearningPlan(save,practice).words;
 return targets.map(target=>({target,options:pickRandom([target,...pickRandom(PIC_WORDS.filter(w=>w!==target&&w.level<=level),choices-1)],choices)}));
}

export function WordPicTask({onFinish,practice=false}:{onFinish:()=>void;practice?:boolean}){
 const entry=useGame(s=>learningProfile(s.save.settings).entry);
 return entry==='listen'?<ListeningDiscovery onFinish={onFinish} practice={practice} source="wordpictask:listening"/>:<WordPicTaskChoices onFinish={onFinish} practice={practice}/>;
}
function WordPicTaskChoices({ onFinish, practice=false }: { onFinish: () => void; practice?:boolean }) {
  const level = useGame((s) => learningLevel(s.save));
  const noteWord = useGame((s) => s.noteWord);
  const rounds = useMemo(() => makeRounds(level, practice), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0);
  return <PicRound key={idx} round={rounds[idx]} idx={idx} total={rounds.length} noteWord={noteWord} onNext={() => (idx + 1 < rounds.length ? setIdx(idx + 1) : onFinish())} />;
}

function Pic({ w }: { w: PicWord }) {
  return w.css ? <span className="color-dot" style={{ background: w.css }} /> : <Icon name={w.icon ?? "star"} size={170} className="pic-icon" />;
}

function PicRound({ round, idx, total, onNext, noteWord }: { round: Round; idx: number; total: number; onNext: () => void; noteWord: (w: string, k: "heard" | "spoken" | "correct") => void }) {
  const { visible, pick, solved, shake, hint, eliminated } = useChoice(round.options, round.target);
  const t = round.target;
  const missed=useRef(false),heard=useRef(false);
  const [help,setHelp]=useState(false);
  const bilingual = () => (useGame.getState().save.settings.englishMode ?? "bilingual") === "bilingual";
  // 先英文（Apple! Find the apple!）→ 中文提示 → 再说一遍指令
  const ask = async (withHelp=help) => {const ok=await say(...askParts(picAsk(t),withHelp));if(ok&&active.current){heard.current=true;noteWord(t.en,'heard');}};
  const active = useRef(true);
  const introTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    active.current = true;
    introTimer.current = setTimeout(()=>ask(), 300);
    return () => { active.current = false; clearTimeout(introTimer.current); stopSpeech(); };
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = async (w: PicWord) => {
    clearTimeout(introTimer.current);
    const res = pick(w);
    if(res!=='ignored'){useGame.getState().noteAttempt(t.en,res==='correct',missed.current||help||!heard.current,'wordpic');if(res==='wrong')missed.current=true;}
    if (res === "correct") {
      noteWord(t.en, "correct");
      // Yes! An apple! Can you say it? —— 留一点时间让孩子跟着说
      await say(...feedbackParts(picYes(t), bilingual()), 1200, ["en", `${t.en[0].toUpperCase()}${t.en.slice(1)}!`]);
      await wait(300);
      if (active.current) onNext();
    } else if (res === "wrong") {
      await say(...feedbackParts(picNo(w, t), bilingual()));
    }
  };

  return (
    <div className="round picture-round">
      <RoundProgress index={idx} total={total}/>
      <h1 className="round-instruction"><span lang="en">{picAsk(t).en.slice(-1)[0]}</span>{help&&<small>{picAsk(t).zh}</small>}</h1>
      <div className="choice-audio-tools">
      <button className="replay" disabled={solved} onClick={()=>ask()}><Icon name="speaker" size={32} /> 再听一次</button>
      {!help&&<button className="replay" disabled={solved} onClick={()=>{setHelp(true);void ask(true);}}><Icon name="hand" size={26}/>帮我听懂</button>}
      </div>
      <div className={`choices ${round.options.length===2 ? "two" : ""}`}>
        {visible.map((w) => (
          <button key={w.en} className={`choice pic ${shake === w ? "shake" : ""} ${solved && w === t ? "right" : ""} ${hint && w === t ? "glow" : ""} ${eliminated.includes(w) ? "eliminated" : ""}`} aria-label={w.zh} disabled={solved || shake !== null || eliminated.includes(w)} onClick={() => tap(w)}>
            <span className="choice-art"><Pic w={w} /></span>
            <span className="pic-label" aria-hidden={!(solved && w === t)}>{solved && w === t ? w.en : "\u00a0"}</span>
          </button>
        ))}
      </div>
      <div className="choice-feedback" role="status">{solved ? "找对啦！" : eliminated.length > 0 ? "再看看，点另一张" : "听一听，再点图片"}</div>
    </div>
  );
}
