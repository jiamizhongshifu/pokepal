import { worldArt } from '../data/sceneArt';
import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import type { Capture } from '../types';
import type { Visit } from '../scene/islandLife';
import { STATIONS } from '../scene/islandLife';
import type { Effect } from '../scene/zones';
import type { IslandWeather } from '../lib/weather';
import { cropStage, type FarmState } from '../lib/farm';
import { creatureArt, getCreature } from '../data/creatures';
import { Icon } from '../icons';
import { STATION_SPOTS, stationSpot, type Spot } from './spots';
import './island-map.css';

export type Sky = 'morning' | 'day' | 'evening' | 'night';
/** Open lawn and beach spots for creatures that are not visiting a station. */
const IDLE_SPOTS: Spot[] = [[48, 60], [35, 53], [58, 62], [70, 42], [32, 38], [66, 64], [46, 37], [76, 56], [25, 49], [52, 42], [38, 67], [61, 35], [29, 70], [56, 74], [72, 66], [43, 57]];
/** The three vegetable plots painted on the island, left to right. */
const PLOT_SPOTS: Spot[] = [[11.9, 39.5], [17.8, 39.5], [24.4, 39.5]];
const WALK_MS = 2200;
const STAGE_SIZE = [11, 13, 15];

export interface IslandMapProps {
 captures: Capture[];
 visits: Visit[];
 activeVisits: Visit[];
 onArrival: (id: number, key: string, ready: boolean) => void;
 onStation: (id: string) => void;
 selected: number | null;
 onSelect: (id: number) => void;
 onDeselect: () => void;
 sky: Sky;
 weather: IslandWeather;
 effect: Effect | null;
 need?: { id: number; kind: 'feed' | 'pet' } | null;
 farm: { open: boolean; farm?: FarmState; clock: number; working: number | null; onPlot: (index: number) => void };
 /** Partners in a shared activity stand together at its station. */
 together?: { partners: number[]; station?: string };
 active?: boolean;
 showInterface?: boolean;
}

const offset = (spot: Spot, slot: number, of: number): Spot => of < 2 ? spot : [spot[0] + (slot - (of - 1) / 2) * 5, spot[1] + (slot % 2) * 1.5];

/** Island home as one illustration: stations are tappable spots, creatures walk between them with a short glide. */
export function IslandMap({ captures, visits, activeVisits, onArrival, onStation, selected, onSelect, onDeselect, sky, weather, effect, need, farm, together, active = true, showInterface = true }: IslandMapProps) {
 const targets = useMemo(() => {
  const byStation = new Map<string, number[]>();
  const placed = new Map<number, { spot: Spot; visit?: Visit }>();
  for (const c of captures) {
   const visit = visits.find(v => v.pokemonId === c.id);
   const station = visit?.station.id ?? (together?.partners.includes(c.id) ? together.station : undefined);
   if (station && stationSpot(station)) byStation.set(station, [...(byStation.get(station) ?? []), c.id]);
  }
  let idle = 0;
  for (const c of captures) {
   const visit = visits.find(v => v.pokemonId === c.id);
   const station = visit?.station.id ?? (together?.partners.includes(c.id) ? together.station : undefined);
   const group = station ? byStation.get(station) : undefined;
   if (station && group && stationSpot(station)) placed.set(c.id, { spot: offset(stationSpot(station)!, group.indexOf(c.id), group.length), visit });
   else placed.set(c.id, { spot: IDLE_SPOTS[idle++ % IDLE_SPOTS.length] });
  }
  return placed;
 }, [captures, visits, together]);

 // Report departure at once and arrival after the glide, matching the walking contract of the island life hooks.
 const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
 const reported = useRef(new Map<number, string>());
 useEffect(() => {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const [id, { visit }] of targets) {
   if (!visit || reported.current.get(id) === visit.key) continue;
   reported.current.set(id, visit.key);
   clearTimeout(timers.current.get(id));
   const already = activeVisits.some(v => v.key === visit.key);
   if (already) continue;
   onArrival(id, visit.key, false);
   timers.current.set(id, setTimeout(() => onArrival(id, visit.key, true), reduced ? 50 : WALK_MS));
  }
  for (const id of [...reported.current.keys()]) if (!targets.get(id)?.visit) { reported.current.delete(id); clearTimeout(timers.current.get(id)); }
 }, [targets, activeVisits, onArrival]);
 useEffect(() => () => timers.current.forEach(clearTimeout), []);

 const background = (e: MouseEvent) => { if (e.target === e.currentTarget) onDeselect(); };
 const raining = weather.rain > 0.15;
 const interactive = active && showInterface;

 return <div className={`island-map sky-${sky}${weather.cloud > 0.55 ? ' is-cloudy' : ''}`} onClick={background} role="group" aria-label="我的小岛">
  <img className="island-map-art" src={worldArt('island-map')} alt="" draggable={false} onClick={onDeselect} />
  {interactive && STATIONS.filter(s => STATION_SPOTS[s.id]).map(s => <button key={s.id} type="button" className="island-station" style={{ left: `${STATION_SPOTS[s.id][0]}%`, top: `${STATION_SPOTS[s.id][1]}%` }} aria-label={s.name} onClick={e => { e.stopPropagation(); onStation(s.id); }} />)}
  {interactive && !farm.open && PLOT_SPOTS.map((spot, i) => {
   const stage = cropStage(farm.farm?.plots[i] ?? null, farm.clock);
   return <button key={i} type="button" className={`island-plot is-${stage}`} style={{ left: `${spot[0]}%`, top: `${spot[1]}%` }} aria-label={`第 ${i + 1} 块地：${{ empty: '空地', thirsty: '口渴了', growing: '正在长', ripe: '可以收啦' }[stage]}`} aria-busy={farm.working === i} onClick={e => { e.stopPropagation(); farm.onPlot(i); }}>
    {stage !== 'empty' && <Icon name={stage === 'thirsty' ? 'water' : stage === 'ripe' ? 'strawberry' : 'grass'} size={26} />}
   </button>;
  })}
  {captures.map(c => {
   const creature = getCreature(c.id);
   const target = targets.get(c.id)!;
   const style = { left: `${target.spot[0]}%`, top: `${target.spot[1]}%`, '--size': `${STAGE_SIZE[creature.stage - 1] ?? 8}%`, '--walk': `${WALK_MS}ms` } as CSSProperties;
   return <button key={c.id} type="button" className="island-resident" data-selected={selected === c.id || undefined} style={style} aria-label={`${creature.nameZh} ${creature.nameEn}`} onClick={e => { e.stopPropagation(); onSelect(c.id); }}>
    <img src={creatureArt(c.id)} alt="" draggable={false} />
    {need?.id === c.id && <span className="island-bubble" aria-hidden="true"><Icon name={need.kind === 'feed' ? 'apple' : 'heart'} size={24} /></span>}
    {effect?.id === c.id && <span key={effect.at} className="island-effect" aria-hidden="true"><Icon name={effect.icon} size={30} /></span>}
   </button>;
  })}
  <div className="island-tint" aria-hidden="true" />
  {raining && <div className="island-rain" aria-hidden="true" />}
 </div>;
}
