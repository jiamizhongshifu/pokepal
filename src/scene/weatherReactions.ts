import type {Pokemon} from '../types';
import type {Habit} from '../data/behaviors';
import type {WeatherKind} from '../lib/weather';
import {onIsland} from './layout';
import {BEHAVIORS} from '../data/behaviors';
import {stationById,isAquatic,type Visit} from './islandLife';

export function weatherReaction(p:Pokemon,habit:Habit,weather:WeatherKind):'shelter'|'splash'|'leaves'|'perch'|'shade'|null{
 if(['sleep','nap','buried'].includes(habit.activity))return weather==='rain'&&!p.types.includes('water')&&!p.types.includes('grass')&&BEHAVIORS[p.id]?.locomotion!=='swim'?'shelter':null;
 if(weather==='rain')return p.types.includes('water')?'splash':p.types.includes('grass')?'leaves':'shelter';
 if(weather==='breezy'&&['fly','float'].includes(BEHAVIORS[p.id]?.locomotion))return 'perch';
 if(weather==='cloudy'&&habit.activity==='sunbathe')return 'shade';
 return null;
}
export function weatherVisit(p:Pokemon,habit:Habit,weather:WeatherKind,neighbor=0):Visit|null{
 const reaction=weatherReaction(p,habit,weather);if(!reaction)return null;
 const base=stationById(reaction==='splash'?(isAquatic(p)?(p.id%2?'shore':'sea'):'shells'):reaction==='leaves'?'tree':reaction==='perch'?'tree':p.id%2?'parasol':'tent');
 const angle=neighbor*2.3999632297,radius=neighbor?2.1*Math.sqrt(neighbor):0;
 const target=base.water?{...onIsland(10+(neighbor*7)%60,1.45),y:-.16}:{...base.target,x:base.target.x+Math.cos(angle)*radius,z:base.target.z+Math.sin(angle)*radius};
 const sleeping=['sleep','nap','buried'].includes(habit.activity);
 const activity=sleeping?'nap':reaction==='splash'?'splash':reaction==='leaves'?'guard':reaction==='perch'?'guard':'meditate';
 const name={shelter:'撑着叶伞歇歇',splash:'在小雨里玩水',leaves:'在雨里看看叶子',perch:'停下来听听风',shade:'在柔光里歇歇'}[reaction];
 return {pokemonId:p.id,manual:false,key:`weather-${weather}-${p.id}`,station:{...base,id:`weather-${reaction}`,name,activity,action:name,target}};
}
