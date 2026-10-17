import {RoundProgress} from '../../components/RoundProgress';
import { learningProfile } from '../../lib/learningStage';
import { useEffect, useMemo, useRef, useState } from "react";
import { dailyLearningPlan } from "../../data/learning";
import { useGame } from "../../store";
import { getPokemon, artUrl } from "../../data/pokemon";
import { pickOne, PRAISE, type SayPhrase } from "../../data/words";
import { say, playCry, playUrl, sfx, wait, stopSpeech } from "../../lib/speech";
import { MicButton } from "../../components/MicButton";
import { SAY, feedbackParts } from "../../data/taskEnglish";
import { bi } from "../../lib/bi";
import { addRecording } from "../../lib/db";
import { todayStr } from "../../lib/date";
import type { RecordResult } from "../../lib/mic";
import type { Pokemon } from "../../types";
import { Icon } from "../../icons";
import { PokeImg } from "../../components/PokeImg";

export function RepeatTask({ onFinish, practice=false }: { onFinish: () => void; practice?:boolean }) {
  const save = useGame((s) => s.save);
  const noteWord = useGame((s) => s.noteWord);
  const { buddy, phrases } = useMemo(() => {
    const ids = save.captures.map((c) => c.id);
    const buddy = getPokemon(ids.length ? pickOne(ids) : 25);
    const picked = dailyLearningPlan(save,practice).phrases;
    // 第三句说宝可梦的名字
    const nameP: SayPhrase = { en: `${buddy.nameEn}!`, zh: `${buddy.nameZh}！`, level: 1 };
    return { buddy, phrases: !practice && learningProfile(save.settings).vocabulary===2 && ids.length ? [...picked.slice(0,2),nameP] : picked };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0);
  return (
    <SayRound
      key={idx}
      buddy={buddy}
      phrase={phrases[idx]}
      idx={idx}
      total={phrases.length}
      onSpoken={(w) => noteWord(w, "spoken")}
      onNext={() => (idx + 1 < phrases.length ? setIdx(idx + 1) : onFinish())}
    />
  );
}

function SayRound({ buddy, phrase, idx, total, onNext, onSpoken }: { buddy: Pokemon; phrase: SayPhrase; idx: number; total: number; onNext: () => void; onSpoken: (w: string) => void }) {
  const [ready, setReady] = useState(false);
  const [recording,setRecording]=useState(false);
  const active=useRef(true), processing=useRef(false),run=useRef(0);
  const [tries, setTries] = useState(0);
  const [participated, setParticipated] = useState(false);
  const [modelHeard,setModelHeard]=useState(false);
  const [busy, setBusy] = useState(false);

  const model = async () => {
    const ticket=++run.current;
    setReady(false);
    // 示范两遍（英文）→ 中文意思 → Your turn!
    const ok = await say(...bi(["en", phrase.en, phrase], 600, ["en", phrase.en, phrase], 400, ["zh", phrase.zh, phrase], 300, ["en", SAY.yourTurn.en[0], {en:SAY.yourTurn.en[0],zh:SAY.yourTurn.zh!}]));
    if (active.current&&ticket===run.current) {setReady(true);setModelHeard(ok);if(ok)useGame.getState().noteWord(phrase.en,'heard');}
    return ok;
  };
  useEffect(() => {
    active.current=true;
    const t = setTimeout(model, 300);
    return () => { active.current=false;run.current++;clearTimeout(t); stopSpeech(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onResult = async (r: RecordResult) => {
    if (processing.current||!active.current) return;
    processing.current=true;
    setBusy(true);
    if (r.voiced||r.confirmed) {
      onSpoken(phrase.en);
      setParticipated(true);
      sfx("ding");
      if (r.blob) {
        addRecording({ date: todayStr(), phrase: phrase.en, createdAt: Date.now(), voicedMs: r.voicedMs, blob: r.blob }).catch(() => {});
        await say(...bi(["en", SAY.listenYou.en[0]], ["zh", SAY.listenYou.zh!]));
        if(!active.current)return;
        const url = URL.createObjectURL(r.blob);
        await playUrl(url);
        URL.revokeObjectURL(url);
        if(!active.current)return;
      }
      const pr = pickOne(PRAISE);
      await say(...bi(["en", pr.en], 300, ["en", phrase.en], 300, ["zh", `${buddy.nameZh}也很开心！`]));
      if(!active.current)return;
      await playCry(buddy.id);
      await wait(300);
      if(active.current)onNext();
    } else if (tries === 0) {
      setTries(1);
      await say(...feedbackParts(SAY.louder, false), ...bi(["zh", SAY.louder.zh!]), 300, ["en", phrase.en]);
      if(active.current){processing.current=false;setBusy(false);}
    } else {
      setParticipated(true);
      await say(...bi(["en", SAY.goodTry.en[0]], ["zh", SAY.goodTry.zh!]));
      if(active.current)onNext();
    }
  };

  return (
    <div className="round say-round">
      <RoundProgress index={idx} total={total} unit="句"/>
      <div className="buddy">
        <PokeImg src={artUrl(buddy.id)} alt="" className={busy ? "bounce" : ""} />
        <button className="bubble" disabled={busy||recording} onClick={model} aria-label={`再听一次：${phrase.en}`}>
          <div className="bubble-en">{phrase.en}</div>
          <div className="bubble-zh">{phrase.zh}</div>
          <span className="bubble-replay"><Icon name="speaker" size={34} /></span>
        </button>
      </div>
      <div className="mic-area">
        {participated ? <div className="say-participation"><Icon name="heart" size={56}/>谢谢你愿意试一试</div> : <MicButton disabled={!ready || busy} onResult={onResult} onRecordingChange={setRecording} />}
        {!ready && !participated && <div className="muted">先听{buddy.nameZh}说…</div>}
        {ready&&!busy&&!recording&&<button className="btn-small" disabled={!modelHeard} onClick={()=>{if(!processing.current){processing.current=true;stopSpeech();onNext();}}}>这次先听听，继续</button>}
        {!participated&&<p className="participation-note">轻轻说就好，也可以先听。这里不评发音分数。</p>}
      </div>
    </div>
  );
}
