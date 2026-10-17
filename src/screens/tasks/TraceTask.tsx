import { learningProfile } from '../../lib/learningStage';
import { useEffect, useMemo, useRef, useState } from "react";
import { dailyLearningPlan } from "../../data/learning";
import { useGame } from "../../store";
import { LETTERS, PIC_WORDS, pickOne } from "../../data/words";
import { artUrl } from "../../data/pokemon";
import { say, sfx, stopSpeech } from "../../lib/speech";
import { Icon } from "../../icons";
import { bi } from "../../lib/bi";
import { traceIntro, traceSuccess } from "../../data/taskEnglish";
import { LETTER_STROKES } from "../../data/letterStrokes";
import { TraceStroke,type TracePoint } from "../../lib/traceStroke";
import { PokeImg } from "../../components/PokeImg";

const SIZE = 460;
const BRUSH = 30;

/**
 * Shared vector strokes keep the model, direction cues and touch guidance aligned.
 */
export function TraceTask({ onFinish, excluded=[] }: { onFinish: (letter:string) => void; excluded?:string[] }) {
  const captures = useGame((s) => s.save.captures);
  const caught = useMemo(() => captures.map((c) => c.id), [captures]);
  const stats = useGame((s) => s.save.wordStats);
  const noteWord = useGame((s) => s.noteWord);
  const item = useMemo(() => {
    const save=useGame.getState().save;
    const plan=dailyLearningPlan(save,excluded.length>0);
    if(learningProfile(save.settings).vocabulary===1 || plan.words.some(w=>w.icon&&!excluded.includes(w.en[0].toUpperCase()))){
      const eligible=PIC_WORDS.filter(w=>w.icon && !excluded.includes(w.en[0].toUpperCase()));
      const themed=eligible.filter(w=>plan.words.some(p=>p.en===w.en));
      const words=themed.length ? themed : eligible;
      const w=words[0];
      return {letter:w.en[0].toUpperCase(),en:w.en,zh:w.zh,icon:w.icon,pokemonId:undefined};
    }
    // 进阶可以描画熟悉伙伴的首字母
    const pool = LETTERS.filter(l=>!excluded.includes(l.letter));
    const mine = pool.filter((l) => l.pokemonId && caught.includes(l.pokemonId));
    const fresh = pool.filter((l) => !stats[`letter:${l.letter}`]);
    return pickOne(mine.length && Math.random() < 0.6 ? mine : fresh.length ? fresh : pool);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const strokes = LETTER_STROKES[item.letter];
  const paths = useRef<(SVGPathElement|null)[]>([]);
  const ink = useRef<HTMLCanvasElement>(null);
  const dot = useRef<SVGGElement>(null), trail = useRef<SVGPathElement>(null);
  const trackers = useRef<TraceStroke[]>([]);
  const last = useRef<TracePoint|null>(null), pointer = useRef<number|null>(null);
  const current = useRef(0), alive = useRef(true), doneRef = useRef(false);
  const [step,setStep] = useState(0), [coverage,setCoverage] = useState(0);
  const [drawing,setDrawing] = useState(false), [completed,setCompleted] = useState(false);
  const [demo,setDemo] = useState<number|null>(0), [replay,setReplay] = useState(0);
  const [hint,setHint] = useState(''), [reduced,setReduced] = useState(false);
  const introTimer=useRef<ReturnType<typeof setTimeout>>();
  const shown = demo ?? step;
  const intro = () => say(...bi(...traceIntro(item)));

  useEffect(() => {
    alive.current=true;
    const dpr=Math.min(2,window.devicePixelRatio||1),c=ink.current!;
    c.width=SIZE*dpr;c.height=SIZE*dpr;c.getContext('2d')!.scale(dpr,dpr);
    trackers.current=paths.current.map(path=>{
      const length=path!.getTotalLength(),count=Math.ceil(length/5);
      return new TraceStroke(Array.from({length:count+1},(_,i)=>{
        const p=path!.getPointAtLength(length*i/count);return {x:p.x,y:p.y};
      }));
    });
    setReplay(v=>v+1);
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion=()=>setReduced(media.matches);motion();media.addEventListener('change',motion);
    introTimer.current=setTimeout(intro,300);
    return()=>{alive.current=false;clearTimeout(introTimer.current);media.removeEventListener('change',motion);stopSpeech();};
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate only the small guide, without rerendering React on every frame.
  useEffect(()=>{
    const path=paths.current[shown];if(!path||!dot.current||!trail.current)return;
    if(drawing||completed||demo===null){dot.current.style.visibility='hidden';trail.current.style.visibility='hidden';return;}
    dot.current.style.visibility=reduced?'hidden':'visible';trail.current.style.visibility=reduced?'hidden':'visible';
    const length=path.getTotalLength(),duration=Math.max(1800,Math.min(4200,length*7));
    const startAt=0;
    let frame=0,start:number|undefined;
    const animate=(now:number)=>{
      start??=now;
      const elapsed=now-start,cycle=duration+900,phase=Math.min(1,elapsed/duration);
      const p=path.getPointAtLength(length*(startAt+(1-startAt)*phase));
      dot.current?.setAttribute('transform',`translate(${p.x} ${p.y})`);
      trail.current?.setAttribute('stroke-dashoffset',String(1-(startAt+(1-startAt)*phase)));
      if(demo!==null&&elapsed>=cycle){setDemo(demo+1<strokes.length?demo+1:null);return;}
      frame=requestAnimationFrame(animate);
    };
    // Reduced motion shows each static start briefly, then also finishes once.
    let timer:ReturnType<typeof setTimeout>|undefined;
    if(reduced)timer=setTimeout(()=>setDemo(demo+1<strokes.length?demo+1:null),1200);
    else frame=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(frame);clearTimeout(timer);};
  },[shown,step,drawing,completed,demo,replay,reduced,strokes.length]);

  const pos=(e:React.PointerEvent):TracePoint=>{
    const r=ink.current!.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*SIZE,y:(e.clientY-r.top)/r.height*SIZE};
  };
  const paint=(p:TracePoint)=>{
    const tracker=trackers.current[current.current];if(doneRef.current||!tracker||tracker.done)return;
    const c=ink.current!.getContext('2d')!,from=last.current??p;
    c.lineCap='round';c.lineJoin='round';c.lineWidth=BRUSH;c.strokeStyle='#7652ba';
    c.beginPath();c.moveTo(from.x,from.y);c.lineTo(p.x,p.y);c.stroke();
    tracker.advance(from,p);last.current=p;
    setCoverage((current.current+tracker.progress)/strokes.length);
    if(tracker.done)setHint(current.current+1<strokes.length?'这一笔写好了，抬起手指再写下一笔。':'写好啦，抬起小手！');
  };
  const complete=async()=>{
    if(doneRef.current)return;doneRef.current=true;setCompleted(true);setDemo(null);setHint('你把每一笔都写出来啦。');
    clearTimeout(introTimer.current);sfx('sparkle');noteWord(`letter:${item.letter}`,'correct');
    await say(...bi(...traceSuccess(item)));if(alive.current)onFinish(item.letter);
  };
  const lift=(e:React.PointerEvent)=>{
    if(pointer.current!==e.pointerId)return;
    if(e.type==='pointerup')paint(pos(e));
    pointer.current=null;last.current=null;setDrawing(false);
    try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{/* already released */}
    if(trackers.current[current.current]?.done){
      if(current.current+1===strokes.length){void complete();return;}
      current.current++;setStep(current.current);setHint('抬起小手，从新的圆点开始。');
    }
  };
  const clear=()=>{
    if(doneRef.current)return;
    pointer.current=null;last.current=null;setDrawing(false);current.current=0;setStep(0);setDemo(null);
    ink.current!.getContext('2d')!.clearRect(0,0,SIZE,SIZE);
    trackers.current.forEach(t=>t.cursor=0);setCoverage(0);setHint('');setReplay(v=>v+1);
  };
  const showDemo=()=>{if(doneRef.current)return;pointer.current=null;last.current=null;setDrawing(false);setHint('');setDemo(0);setReplay(v=>v+1);};
  const currentPath=paths.current[shown],length=currentPath?.getTotalLength()??0;
  const guideAt=demo===null?(trackers.current[step]?.progress??0):0;
  const startPoint=currentPath?.getPointAtLength(length*guideAt);
  const arrowAt=Math.min(length,length*guideAt+62),arrow=currentPath?.getPointAtLength(arrowAt);
  const tangent=currentPath?.getPointAtLength(Math.min(length,arrowAt+3));
  const angle=arrow&&tangent?Math.atan2(tangent.y-arrow.y,tangent.x-arrow.x)*180/Math.PI:0;
  const startNumbers=strokes[shown].path.match(/^M([\d.]+) ([\d.]+)/)!;
  const startX=startPoint?.x??Number(startNumbers[1]),startY=startPoint?.y??Number(startNumbers[2]);

  return (
    <div className="round trace-round">
      <div className="trace-side">
        <div className="trace-example">
        {item.pokemonId ? <PokeImg src={artUrl(item.pokemonId)} alt="" /> : <Icon name={item.icon ?? "star"} size={170} className="trace-icon" />}
        <div className="trace-word"><b>{item.letter}</b>{item.en.slice(1)}</div>
        <div className="trace-zh">{item.zh}</div>
        <button className="replay trace-listen" onClick={intro} disabled={completed}><Icon name="speaker" size={32} /> 听一听</button>
        </div>
      </div>
      <div className="trace-workspace">
        <p className="trace-instruction"><Icon name="hand" size={30} /><span>{completed?'写好啦！':`第 ${shown+1} 笔 · ${strokes[shown].hint}`}<small>{completed?'每一笔都完成了':demo!==null?'先看小圆点怎么走，也可以直接开始写':'从圆点出发，跟着箭头写'}</small></span></p>
        <div className="trace-pad" data-letter={item.letter} data-stroke={step+1} data-demonstrating={demo!==null}>
          <svg className="trace-canvas trace-template" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            <path className="trace-baseline" d="M55 90 H405 M55 370 H405"/>
            {strokes.map((s,i)=><path key={i} ref={el=>{paths.current[i]=el;}} d={s.path} className={`trace-letter-stroke ${i<step||completed?'finished':i===shown?'current':''}`}/>)}
          </svg>
          <canvas ref={ink} className="trace-canvas ink" aria-label={`描写大写字母 ${item.letter}，共 ${strokes.length} 笔`} onPointerDown={e=>{
            if(doneRef.current||pointer.current!==null||e.button!==0)return;
            setDemo(null);const p=pos(e),tracker=trackers.current[current.current];
            if(!tracker?.canStart(p)){setHint('先找到数字圆点，从那里开始。');return;}
            pointer.current=e.pointerId;try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* unsupported */}
            setDrawing(true);setHint('');last.current=null;paint(p);
          }} onPointerMove={e=>{if(pointer.current===e.pointerId)paint(pos(e));}} onPointerUp={lift} onPointerCancel={lift} onLostPointerCapture={lift}/>
          <svg className="trace-canvas trace-guide-overlay" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            {!completed&&<>
              <path ref={trail} d={strokes[shown].path} className="trace-demo-trail" pathLength="1" strokeDasharray="1" strokeDashoffset="1"/>
              {!drawing&&<><circle className="trace-start" cx={startX} cy={startY} r="23"/><text className="trace-start-number" x={startX} y={startY+1}>{shown+1}</text>
                {arrow&&<path className="trace-direction" d="M-9 -10 L2 0 L-9 10" transform={`translate(${arrow.x} ${arrow.y}) rotate(${angle})`}/>}</>}
              <g ref={dot} className="trace-moving-dot"><circle r="13"/><circle r="4"/></g>
            </>}
          </svg>
        </div>
        <div className="trace-steps" aria-label={`已完成 ${completed?strokes.length:step} / ${strokes.length} 笔`}>
          {strokes.map((_,i)=><span key={i} className={i<step||completed?'done':i===shown?'current':''}>{i<step||completed?'✓':i+1}</span>)}
          <span className="trace-steps-label">{completed?'真棒！':demo!==null?'正在示范':'一笔一笔，慢慢来'}</span>
          
        </div>
        <div className="trace-tools">
          <button className="replay trace-demo-button" onClick={showDemo} disabled={completed} aria-pressed={demo!==null}><Icon name="hand" size={28} /> 看一遍</button>
          <button className="replay" onClick={clear} disabled={completed}><Icon name="eraser" size={28} /> 重写</button>
        </div>
        <div className="trace-status" role="status">{hint||' '}</div>
        <progress className="trace-accessible-progress" aria-label="字母书写进度" max={1} value={coverage}/>
      </div>
    </div>
  );
}
