import { useEffect, useState } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { learningEntry } from '../data/curriculum';
import { CROP_KINDS, cropStage, growth, newFarm } from '../lib/farm';
import { sayOnIsland as say } from '../lib/islandSpeech';
import { learningVoice } from '../lib/learningVoice';
import { sfx, stopSpeech } from '../lib/speech';
import { learnedKeys } from './plays';
import { showMood } from './mood';

/**
 * The garden's three plots, drawn in the scene: an empty one is planted (the friend says which fruit), a planted one
 * is watered with a tap, a ripe one is picked into the basket. Every plot shows its own state; nothing needs reading.
 */
export function GardenPlots({ helper, onPlant }: { helper: number; onPlant: (index: number) => void }) {
 const save = useGame(s => s.save), farm = save.farm ?? newFarm();
 const [clock, setClock] = useState(() => Date.now()), [splash, setSplash] = useState<number | null>(null);
 const growing = farm.plots.some(p => p && cropStage(p, clock) === 'growing');
 useEffect(() => { if (!growing) return; const t = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(t); }, [growing]);
 const hear = (word: string) => { const e = learnedKeys(save).has(word) ? learningEntry(word) : undefined; if (e) void say(...learningVoice(e)); };
 const tap = async (index: number) => {
  const crop = farm.plots[index], stage = cropStage(crop, Date.now());
  stopSpeech();
  if (stage === 'empty') { onPlant(index); return; }
  if (stage === 'thirsty') {
   if (!useGame.getState().waterCrop(index, crop!.plantedAt, helper)) return;
   sfx('pop'); showMood(helper, 'cheer'); setSplash(index); setTimeout(() => setSplash(s => s === index ? null : s), 900); setClock(Date.now()); hear('water');
   return;
  }
  if (stage === 'growing') { sfx('boop'); return; }
  if (await useGame.getState().harvestCrop(index)) { sfx('sparkle'); showMood(helper, 'giggle'); hear(crop!.berry); }
 };
 const basket = CROP_KINDS.filter(k => farm.basket[k] > 0);
 return <>
  {farm.plots.map((crop, i) => {
   const stage = cropStage(crop, clock), size = 0.45 + growth(crop, clock) * 0.55;
   return <button key={i} type="button" className={`garden-plot is-${stage}`} style={{ left: `${44 + i * 20}%` }} onClick={() => void tap(i)}
    aria-label={`第 ${i + 1} 块地：${{ empty: '空地，点一下种水果', thirsty: '口渴了，点一下浇水', growing: '正在长', ripe: '熟啦，点一下摘' }[stage]}`}>
    <span className="garden-soil" aria-hidden="true" />
    {stage === 'empty' && <Icon name="seed" size={56} className="garden-hint" />}
    {stage === 'thirsty' && <><Icon name="seed" size={64} className="garden-crop" /><Icon name="watering-can" size={64} className="garden-hint" /></>}
    {stage === 'growing' && <Icon name="leaf" size={96} className="garden-crop" style={{ scale: String(size) }} />}
    {stage === 'ripe' && <><Icon name={crop!.berry} size={110} className="garden-crop is-ripe" /><Icon name="sparkle" size={44} className="garden-sparkle" /></>}
    {splash === i && <Icon name="water" size={64} className="garden-splash" />}
   </button>;
  })}
  {basket.length > 0 && <ul className="garden-basket" aria-label="果篮里的水果">{basket.map(k => <li key={k} aria-label={`${learningEntry(k)?.zh ?? k} ${farm.basket[k]} 个`}><Icon name={k} size={44} /><b>{farm.basket[k]}</b></li>)}</ul>}
 </>;
}
