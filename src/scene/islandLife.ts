import {planWalk} from './navigation';
import type { Pokemon } from '../types';
import type { Activity } from '../lib/routine';
import { BEHAVIORS, type Habit } from '../data/behaviors';
import { PICNIC, FARM_ENTRY, FARM_PLOTS, BERRY_BUSHES, BOWLS, COAST_ROCKS, HAMMOCK_PALMS, FENCE, PIER, CAMPFIRE, CUSHIONS, HQ_PROPS, LAMPS, PALMS, PARASOL, PILOT_GARDEN, PLAYGROUND, SIGN, TENT, onIsland } from './layout';
import type { Spot } from './zones';
import { GROVE_TREES } from './layout';

export type District = 'garden' | 'play' | 'leisure' | 'camp' | 'beach';
export const DISTRICTS: {id: District; name: string; icon: string; color: string; x: number; z: number}[] = [
  {id:'garden', name:'种植区', icon:'flower', color:'#82c995', x:5.3,z:-1.5},
  {id:'play', name:'游乐区', icon:'balloon', color:'#edbb72', x:-8.2,z:-.6},
  {id:'leisure', name:'休闲区', icon:'sun', color:'#82cbd0', x:-3.5,z:4.5},
  {id:'camp', name:'营地区', icon:'tent', color:'#e6a88e', x:-3.8,z:-6.6},
  {id:'beach', name:'海岸区', icon:'waves', color:'#8abddf', x:8.1,z:2.8}
];
export interface Station {
  id: string; district: District; name: string; icon: string; activity: Activity;
  x: number; z: number; target: Spot; likes: string[]; action: string;
  water?: boolean; secondary?: boolean;
}
const make = (id: string, district: District, name: string, icon: string, activity: Activity, p: {x:number;z:number}, likes: string[], action: string, offset = {x:0,z:1.65}): Station =>
  ({id,district,name,icon,activity,...p,target:{x:p.x+offset.x,z:p.z+offset.z},likes,action});
export const STATIONS: Station[] = [
  {...make('farm','garden','树果园','apple','play',FARM_ENTRY,['grass','water','ground'],'照料树果'),target:FARM_ENTRY,secondary:true},
  ...FARM_PLOTS.map((p,i)=>({...make(`farm-${i}`,'garden','照料树果','water','play',p,['grass','water','ground'],'给树果浇水',{x:0,z:1.9}),secondary:true})),
  make('tree','garden','看看果树','apple','explore',PILOT_GARDEN.tree,['grass','bug','flying'],'观察树叶'),
  make('windmill','garden','转转风车','wind','play',PLAYGROUND.windmill,['flying','electric'],'转动小风车',{x:1.8,z:0}),
  make('ball','play','一起玩球','balloon','play',PLAYGROUND.ball,['electric','normal','fighting'],'玩小皮球'),
  make('music','play','音乐舞台','music','sing',PLAYGROUND.music,['fairy','normal','flying'],'跟着节拍跳舞'),
  make('sand','play','挖挖沙坑','shovel','collect',PLAYGROUND.sand,['ground','rock'],'寻找沙里的贝壳'),
  make('picnic','leisure','树荫野餐','book','eat',PICNIC,['normal','grass','fairy'],'分享野餐点心',{x:1.4,z:0}),
  make('bench','leisure','长椅歇歇','sun','sunbathe',PILOT_GARDEN.bench,['grass','normal'],'在长椅旁晒太阳',{x:1.4,z:0}),
  make('parasol','leisure','伞下乘凉','sun','nap',PARASOL,['ice','normal'],'在遮阳伞下休息',{x:1,z:0}),
  make('tent','camp','帐篷守望','tent','guard',TENT,['fire','fighting'],'守护小营地',{x:3.2,z:.5}),
  make('fire','camp','暖暖篝火','flame','warm',CAMPFIRE,['fire'],'围着篝火取暖',{x:0,z:1.9}),
  {...make('shore','beach','浅滩玩水','water','splash',onIsland(28,1.42),['water'],'在浅滩扑腾水花'),target:{...onIsland(28,1.42),y:-.16},water:true},
  {...make('sea','beach','海边游游','waves','swim',onIsland(10,1.45),['water'],'在海里游泳'),target:{...onIsland(10,1.45),y:-.16},water:true},
  make('shells','beach','找找贝壳','search','collect',onIsland(42,1.08),['water','ground'],'寻找漂亮贝壳',{x:-1,z:0}),
  make('pier','beach','栈桥观海','waves','fish',{x:PIER.x,z:PIER.z},['water','psychic'],'在栈桥岸边观察海浪',{x:-1.5,z:-1.7}),
  {...make('hammock','leisure','吊床听风','wind','nap',{x:(PALMS[HAMMOCK_PALMS[0]].x+PALMS[HAMMOCK_PALMS[1]].x)/2,z:(PALMS[HAMMOCK_PALMS[0]].z+PALMS[HAMMOCK_PALMS[1]].z)/2},['normal','grass'],'在吊床旁听风',{x:1.5,z:0}),secondary:true},
  {...make('fence','camp','巡逻小栅栏','search','guard',{x:FENCE.cx,z:FENCE.cz-FENCE.r},['fighting','fire'],'沿着栅栏观察小岛',{x:0,z:-1.2}),secondary:true},
  ...COAST_ROCKS.map((p,i)=>({...make(`rock-${i}`,'beach','岩石小发现','sparkle','meditate',p,['rock','psychic'],'在岩石旁静静冥想',{x:-1.9,z:0}),secondary:true})),
  ...BERRY_BUSHES.map((p,i)=>make(`berry-${i}`,'garden','树果点心','apple','eat',p,['grass','bug','normal'],'品尝树果',i===3?{x:0,z:-2.9}:i===0?{x:0,z:-2.3}:i===2?{x:-2.1,z:0}:{x:0,z:2.3})),
  ...CUSHIONS.map((p,i)=>({...make(`bed-${i}`,'camp','软软睡垫','moon','sleep',p,['normal','psychic'],'在睡垫上休息',{x:0,z:0}),secondary:true})),
  ...BOWLS.map((p,i)=>({...make(`bowl-${i}`,'camp','开饭啦','bowl','eat',p,['normal'],'吃一口点心',{x:0,z:.85}),secondary:true})),
  ...LAMPS.map((p,i)=>({...make(`lamp-${i}`,i===0?'beach':'camp','点亮路灯','sparkle','glow',p,['electric'],'陪路灯闪闪发光',{x:0,z:1.1}),secondary:true})),
  ...PALMS.map((p,i)=>({...make(`palm-${i}`,'leisure','树荫休息','grass','sunbathe',p,['grass','flying','bug'],'在树荫下休息',{x:1.25,z:0}),secondary:true})),
  ...GROVE_TREES.map(p=>({...make(`grove-${p.id}`,p.x>0?'garden':p.z < -5?'camp':'leisure','看看植物','grass','explore',{x:p.x,z:p.z},['grass','bug','flying'],'观察树叶',p.approach??{x:0,z:1.6}),secondary:true})),
  {...make('sign','leisure','小岛向导','sign','guard',SIGN,['normal','fighting'],'在路牌旁迎接伙伴'),secondary:true},
  ...HQ_PROPS.filter(p=>!['pier','wooden_lantern_01'].includes(p.m)).map((p,i)=>({...make(`prop-${i}`,p.m==='lambis_shell'||p.m==='starfish'?'beach':p.m==='log_seat'?'camp':'garden',p.m==='log_seat'?'原木歇歇':p.m==='lambis_shell'?'看看海螺':p.m==='starfish'?'观察海星':p.m==='shrub'||p.m==='cedar'?'看看植物':'营地小发现',p.m==='log_seat'?'sun':'search',p.m==='log_seat'?'warm':'explore',p,['normal','bug'],'观察身边的小发现'),secondary:true}))
];
// Keep the facility anchor unchanged. Each resident plans from its actual position
// with its own body size and the current decorations/expansion.
export const stationById = (id:string) => STATIONS.find(s=>s.id===id)!;
export const isAquatic = (p:Pokemon) => BEHAVIORS[p.id]?.locomotion === 'swim';
export function compatible(p:Pokemon,s:Station) { return isAquatic(p) ? !!s.water : !s.water || p.types.includes('water'); }
export function affinity(p:Pokemon,s:Station,habit?:Habit) {
  if (!compatible(p,s)) return -1000;
  return p.types.reduce((n,t)=>n+(s.likes.includes(t)?12:0),0)
    + (habit?.activity===s.activity?22:0) + (s.id==='music'&&[35,36,39,40,124].includes(p.id)?30:0)
    + (s.id==='sand'&&BEHAVIORS[p.id]?.locomotion==='slither'?16:0);
}
export interface Visit { faceTo?:Spot; station: Station; pokemonId: number; manual: boolean; key: string; }

/** A placed track moves the existing ball activity into the clear shared play space. */
export function furnishedStation(s:Station,items:readonly string[]):Station{return s.id==='ball'&&items.includes('track')?{...s,x:0,z:0,target:{x:-2.6,z:0}}:s;}

/** A fixture keeps its identity. Only the walking approach may move, within reach. */
export function stationReach(station:Station,radius:number){
 return (station.id==='tent'||station.id==='pier'?1.9:station.id==='tree'?1.5:1.2)+radius+.4;
}
export function planStationWalk(from:Spot,station:Station,radius=.82,occupied:readonly {x:number;z:number;r:number}[]=[],height=.8){
 return planWalk(from,station.target,radius,occupied,height,{center:station,radius:stationReach(station,radius)});
}
