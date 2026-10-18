import type {SaveData} from '../types';
import {LEARNING_UNITS,learningEntry,selectedUnit} from '../data/curriculum';
import {todayStr} from './date';

/** Observed app activity only. No inference about who tapped, understood or helped. */
export function familyLearning(s:SaveData){
 const completed=LEARNING_UNITS.filter(u=>{
  const at=s.learning?.units[u.id]?.completedAt;
  return !!at&&todayStr(new Date(at))===s.daily.date;
 }).sort((a,b)=>s.learning!.units[b.id].completedAt!-s.learning!.units[a.id].completedAt!);
 const words=[...new Set(s.daily.words)].map(learningEntry).filter(e=>!!e).slice(0,3);
 const focus=completed[0]??selectedUnit(s);
 return {completed,words,focus};
}
