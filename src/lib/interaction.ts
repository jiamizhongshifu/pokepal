import {interactionEvent,type InteractionEvent} from './interactionPolicy';
let sink:((event:InteractionEvent)=>void)|undefined;
/** No offline backlog: actions before consent are never replayed later. */
export function trackInteraction(event:InteractionEvent){
 const safe=interactionEvent(event);if(!safe)return;
 try{sink?.(safe);}catch{/* Telemetry cannot break play or persistence. */}
}
export function connectInteractions(handler:(event:InteractionEvent)=>void){sink=handler;return()=>{if(sink===handler)sink=undefined;};}
export function trackLearningCompletion(event:'lesson_completed'|'practice_completed'|'review_completed'|'story_completed',reward:{gained:number;bonus:number}|undefined){
 if(!reward)return;
 trackInteraction(event);
 if(reward.gained+reward.bonus>0)trackInteraction('energy_earned');
}
