import {RoundProgress} from '../../components/RoundProgress';
import { learningProfile } from '../../lib/learningStage';
import { ListeningDiscovery } from './ListeningDiscovery';
import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../../store";
import { dailyLearningPlan } from '../../data/learning';
import { learningLevel } from '../../data/curriculum';
import { POKEMON, COLORS, getPokemon, spriteUrl } from "../../data/pokemon";
import { PIC_WORDS, type PicWord, pickOne, pickRandom } from "../../data/words";
import { say, playCry, wait, stopSpeech } from "../../lib/speech";
import { useChoice } from "./useChoice";
import { Icon } from "../../icons";
import type { Pokemon } from "../../types";
import { PokeImg } from "../../components/PokeImg";
import {
  picAsk, picYes, picNo, COUNT_ITEMS, askParts, feedbackParts, colorAsk, colorNo, colorYes, countAsk, countNo, countYes, cryAsk, cryNo, cryYes,
  nameAsk, nameNo, nameYes, sizeAsk, sizeNo, sizeYes, type CountItem, type Lines
} from "../../data/taskEnglish";

/**
 * 听一听（3–6 岁）：颜色、名字、叫声、数一数（1–5）、大小（big / small）五种小题，每次抽 3 道。
 * 指令先说英文、再给中文提示、最后英文复述；答错时说出孩子点的是什么，再重复指令。永不失败。
 */
type Opt = { key: string; pokemon?: Pokemon; count?: number; big?: boolean; word?:PicWord };
type Round =
  | {kind:"word";options:Opt[];target:Opt}
  | { kind: "color" | "name" | "cry"; options: Opt[]; target: Opt }
  | { kind: "count"; options: Opt[]; target: Opt; item: CountItem }
  | { kind: "size"; options: Opt[]; target: Opt; pokemon: Pokemon };

const bilingual = () => (useGame.getState().save.settings.englishMode ?? "bilingual") === "bilingual";

function makeRounds(caughtIds: number[], level: 1 | 2, practice:boolean): Round[] {
  const caught = caughtIds.map(getPokemon);
  const familiar = [...new Set([...caughtIds,25,1,4,7,133])].map(getPokemon);
  const choices = learningProfile(useGame.getState().save.settings).choices;
  const fav = caught.length ? caught : [getPokemon(25)];
  const pool:Round["kind"][]=level === 1 ? ["color", "name", "count", "size"] : caught.length >= 3 ? ["color", "name", "cry", "count", "size"] : ["color", "name", "count", "size"];
  // Keep one playful concept round alongside the current theme, not two unrelated quizzes.
  const kinds = [...pickRandom(pool,pool.length),...pickRandom(pool,pool.length)].slice(0,practice?6:3);
  const rounds=kinds.map((kind): Round => {
    if (kind === "color") {
      // Pokédex colour classifications can disagree with a multi-coloured model.
      // Use unambiguous colour swatches and the existing colour-word voice lines.
      const colors=pickRandom(PIC_WORDS.filter(w=>w.theme==='color'&&w.level<=level),choices);
      const options=colors.map(word=>({key:word.en,word}));
      return {kind:'word',options,target:pickOne(options)};
    }
    if (kind === "count") {
      const max = level === 1 ? 3 : 5;
      const nums = pickRandom(Array.from({ length: max }, (_, i) => i + 1), choices);
      const options = nums.map((n) => ({ key: `n${n}`, count: n }));
      return { kind, options, target: pickOne(options), item: pickOne(COUNT_ITEMS) };
    }
    if (kind === "size") {
      const pokemon = pickOne(fav);
      const options = pickRandom([{ key: "big", big: true }, { key: "small", big: false }], 2);
      return { kind, options, target: pickOne(options), pokemon };
    }
    const pool = kind === "cry" ? caught : (level === 1 ? familiar : POKEMON).filter((p) => !p.evoOnly || caughtIds.includes(p.id));
    const opts = pickRandom(pool, choices).map((p) => ({ key: `p${p.id}`, pokemon: p }));
    const mine = opts.filter((o) => caughtIds.includes(o.pokemon!.id));
    return { kind, options: opts, target: mine.length ? pickOne(mine) : pickOne(opts) };
  });
  const focus=dailyLearningPlan(useGame.getState().save,practice).words;
  focus.slice(0,practice?4:2).forEach((target,i)=>{
   const options=pickRandom([target,...pickRandom(PIC_WORDS.filter(w=>w!==target&&w.level<=level),choices-1)],choices).map(word=>({key:word.en,word}));
   rounds[i]={kind:'word',options,target:options.find(o=>o.key===target.en)!};
  });
  return rounds;
}

export function ListenTask({onFinish,practice=false}:{onFinish:()=>void;practice?:boolean}){
 const entry=useGame(s=>learningProfile(s.save.settings).entry);
 return entry==='listen'?<ListeningDiscovery onFinish={onFinish} practice={practice} source="listentask:listening"/>:<ListenTaskChoices onFinish={onFinish} practice={practice}/>;
}
function ListenTaskChoices({ onFinish, practice=false }: { onFinish: () => void; practice?:boolean }) {
  const captures = useGame((s) => s.save.captures);
  const level = useGame((s) => learningLevel(s.save));
  const caughtIds = useMemo(() => captures.map((c) => c.id), [captures]);
  const noteWord = useGame((s) => s.noteWord);
  const rounds = useMemo(() => makeRounds(caughtIds, level, practice), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0);
  return <ListenRound key={idx} round={rounds[idx]} idx={idx} total={rounds.length} noteWord={noteWord} onNext={() => (idx + 1 < rounds.length ? setIdx(idx + 1) : onFinish())} />;
}

function askLines(r: Round): Lines {
  const t = r.target;
  if (r.kind === "word") return picAsk(t.word!);
  if (r.kind === "color") {
    const c = COLORS[t.pokemon!.color];
    return colorAsk(c.en, c.zh);
  }
  if (r.kind === "name") return nameAsk(t.pokemon!);
  if (r.kind === "count") return countAsk(t.count!, r.item);
  if (r.kind === "size") return sizeAsk(r.pokemon, t.big!);
  return cryAsk;
}

async function ask(r: Round,active:()=>boolean,help=false) {
  const ok = await say(...askParts(askLines(r), help));
  if (ok && active() && r.kind === "cry") {
    await wait(250);
    if(active())await playCry(r.target.pokemon!.id, 0.7);
  }
  return ok;
}

function OptionView({ round, o }: { round: Round; o: Opt }) {
  if(round.kind==="word")return o.word!.css?<span className="color-dot" style={{background:o.word!.css}}/>:<Icon name={o.word!.icon??"star"} size={170}/>;
  if (round.kind === "count") {
    return (
      <span className={`count-group n${o.count}`}>
        {Array.from({ length: o.count! }, (_, i) => (
          <Icon key={i} name={round.item.icon} size={o.count! > 3 ? 54 : 66} />
        ))}
      </span>
    );
  }
  if (round.kind === "size") return <span className="size-stage"><PokeImg src={spriteUrl(round.pokemon.id)} alt="" draggable={false} className={o.big ? "size-big" : "size-small"} /></span>;
  return <PokeImg src={spriteUrl(o.pokemon!.id)} alt="" draggable={false} />;
}

function ListenRound({ round, idx, total, onNext, noteWord }: { round: Round; idx: number; total: number; onNext: () => void; noteWord: (w: string, k: "heard" | "spoken" | "correct") => void }) {
  const { visible, pick, solved, shake, hint, eliminated } = useChoice(round.options, round.target);
  const active = useRef(true);
  const missed=useRef(false),heard=useRef(false);
  const [help,setHelp]=useState(false);
  const hear=async(withHelp=help)=>{const ok=await ask(round,()=>active.current,withHelp);if(ok&&active.current)heard.current=true;};
  const introTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    active.current = true;
    introTimer.current = setTimeout(() => hear(), 300);
    return () => { active.current = false; clearTimeout(introTimer.current); stopSpeech(); };
  }, [round]);

  const tap = async (o: Opt) => {
    clearTimeout(introTimer.current);
    const res = pick(o);
    const bl = bilingual();
    const t = round.target;
    const key=round.kind==='word'?t.word!.en:round.kind==='color'?COLORS[t.pokemon!.color].en:round.kind==='count'?`count:${t.count}`:round.kind==='size'?(t.big?'big':'small'):t.pokemon!.nameEn;
    if(res!=='ignored'&&round.kind!=='cry'){useGame.getState().noteAttempt(key,res==='correct',missed.current||help||!heard.current,'listen');if(res==='wrong')missed.current=true;}
    if (res === "correct") {
      let fb: Lines;
      if(round.kind==="word"){fb=picYes(t.word!);noteWord(t.word!.en,"correct");}
      else if (round.kind === "color") { fb = colorYes(t.pokemon!); noteWord(COLORS[t.pokemon!.color].en, "correct"); }
      else if (round.kind === "count") { fb = countYes(t.count!, round.item); noteWord(`count:${t.count}`, "correct"); }
      else if (round.kind === "size") { fb = sizeYes(round.pokemon, t.big!); noteWord(t.big ? "big" : "small", "correct"); }
      else if (round.kind === "cry") { fb = cryYes(t.pokemon!); noteWord(t.pokemon!.nameEn, "correct"); }
      else { fb = nameYes(t.pokemon!); noteWord(t.pokemon!.nameEn, "correct"); }
      await say(...feedbackParts(fb, bl));
      if(!active.current)return;
      if (round.kind === "cry" || round.kind === "name") await playCry(t.pokemon!.id, 0.6);
      await wait(400);
      if (active.current) onNext();
    } else if (res === "wrong") {
      let fb: Lines;
      if(round.kind==="word")fb=picNo(o.word!,t.word!);
      else if (round.kind === "color") fb = colorNo(o.pokemon!, COLORS[t.pokemon!.color].en);
      else if (round.kind === "count") fb = countNo(o.count!, round.item, t.count!);
      else if (round.kind === "size") fb = sizeNo(t.big!);
      else if (round.kind === "cry") fb = cryNo(o.pokemon!);
      else fb = nameNo(o.pokemon!, t.pokemon!);
      await say(...feedbackParts(fb, bl));
      if (active.current && round.kind === "cry") await playCry(t.pokemon!.id, 0.7);
    }
  };

  return (
    <div className="round listen-round" data-kind={round.kind}>
      <RoundProgress index={idx} total={total}/>
      <h1 className="round-instruction"><span lang="en">{askLines(round).en.slice(-1)[0]}</span>{help&&<small>{askLines(round).zh}</small>}</h1>
      <div className="choice-audio-tools">
      <button className="replay" disabled={solved} onClick={() => hear()}><Icon name="speaker" size={32} /> 再听一次</button>
      {!help&&<button className="replay" disabled={solved} onClick={()=>{setHelp(true);void hear(true);}}><Icon name="hand" size={26}/>帮我听懂</button>}
      </div>
      <div className={`choices ${round.kind === "size" ? "two size-choices" : round.options.length===2 ? "two" : ""}`}>
        {visible.map((o) => (
          <button
            key={o.key}
            className={`choice ${round.kind === "count" ? "count" : "poke"} ${shake === o ? "shake" : ""} ${solved && o === round.target ? "right" : ""} ${hint && o === round.target ? "glow" : ""} ${eliminated.includes(o) ? "eliminated" : ""}`}
            disabled={solved || shake !== null || eliminated.includes(o)}
            aria-label={round.kind === "size" ? `${o.big ? "大大的" : "小小的"}${round.pokemon.nameZh}` : round.kind === "count" ? `${o.count} ${round.item.zh}` : o.word?.zh??o.pokemon?.nameZh}
            onClick={() => tap(o)}
          >
            <OptionView round={round} o={o} />
          </button>
        ))}
      </div>
      <div className="choice-feedback" role="status">{solved ? "找对啦！" : eliminated.length > 0 ? "再看看，点另一张" : "听一听，再点图片"}</div>
    </div>
  );
}
