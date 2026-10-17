import {recommendedUnit,selectedUnit} from '../data/curriculum';
import type {SaveData} from '../types';
/** Optional next invitations, never gates: the next course remains accessible at every step. */
export function learningTrail(save:SaveData){
 const unit=selectedUnit(save),progress=save.learning?.units[unit.id];
 const done={lesson:!!progress?.completedAt,island:!!progress?.encounteredAt,story:!!progress?.storyAt};
 const phase:'lesson'|'island'|'story'|'revisit'=!done.lesson?'lesson':!done.island?'island':!done.story?'story':'revisit';
 return {unit,done,phase,next:recommendedUnit(save)};
}

/** The learning home always launches a course; optional transfer never replaces it. */
export function learningHome(save:SaveData){
 const trail=learningTrail(save);
 const unit=trail.done.lesson?trail.next:trail.unit;
 const progress=save.learning?.units[unit.id];
 return {unit,resuming:!progress?.completedAt&&!!progress?.round,completed:!!progress?.completedAt,extension:trail.unit};
}
