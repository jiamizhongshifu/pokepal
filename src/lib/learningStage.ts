import type { Settings } from '../types';

export type LearningStageId = 'listen' | 'discover' | 'express';
export interface LearningProfile {
 version:1;
 stage:LearningStageId|'custom';
 vocabulary:1|2;
 entry:'listen'|'choose';
 phrases:'listen'|'supported'|'situations';
 choices:2|3;
 review:2|3;
}
export const LEARNING_STAGES:{id:LearningStageId;title:string;icon:string;description:string;example:string;profile:LearningProfile}[]=[
 {id:'listen',title:'听音探索',icon:'ear',description:'刚开始接触英语，喜欢看图、听声音。课程和认词练习先陪着听，不要求答题。',example:'听 ball，看小球，再和伙伴玩。',profile:{version:1,stage:'listen',vocabulary:1,entry:'listen',phrases:'listen',choices:2,review:2}},
 {id:'discover',title:'听词指认',icon:'picture',description:'愿意听词找图片，开始认出熟悉的事物。较长的短句先一起听。',example:'听到 apple，从两张图片里找苹果。',profile:{version:1,stage:'discover',vocabulary:1,entry:'choose',phrases:'supported',choices:2,review:2}},
 {id:'express',title:'日常表达',icon:'speak',description:'已经认识一些词，准备在生活情境里理解和尝试使用短句。开口仍可自选。',example:'点心时间，听听怎样说 More, please!',profile:{version:1,stage:'express',vocabulary:2,entry:'choose',phrases:'situations',choices:3,review:3}}
];
export function stageProfile(id:LearningStageId):LearningProfile {return {...LEARNING_STAGES.find(s=>s.id===id)!.profile};}
export function validLearningProfile(value:unknown):value is LearningProfile {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const p=value as LearningProfile;
 return p.version===1&&['listen','discover','express','custom'].includes(p.stage)&&[1,2].includes(p.vocabulary)&&['listen','choose'].includes(p.entry)&&['listen','supported','situations'].includes(p.phrases)&&[2,3].includes(p.choices)&&[2,3].includes(p.review);
}
/** Stable stage IDs leave room for later curricula; legacy saves retain their current difficulty. */
export function learningProfile(settings:Pick<Settings,'level'|'learningProfile'>):LearningProfile {
 const p=settings.learningProfile;
 if(validLearningProfile(p))return p.stage==='custom'?{...p}:stageProfile(p.stage);
 return stageProfile(settings.level===2?'express':'discover');
}
export function normalizeLearningSettings(settings:Settings):Settings {
 const profile=learningProfile(settings);
 return {...settings,level:profile.vocabulary,learningProfile:profile};
}
/** All settings changes share one source of truth, including legacy level callers. */
export function applyLearningSettings(settings:Settings,patch:Partial<Settings>):Settings {
 const next={...settings,...patch};
 if(patch.learningProfile!==undefined&&!validLearningProfile(patch.learningProfile))return settings;
 if(patch.level!==undefined&&patch.learningProfile===undefined)delete next.learningProfile;
 return normalizeLearningSettings(next);
}
export function learningStageTitle(settings:Settings){const p=learningProfile(settings);return p.stage==='custom'?'宝宝的专属节奏':LEARNING_STAGES.find(s=>s.id===p.stage)!.title;}
export function startsWithListening(profile:LearningProfile,kind:string,phraseLevel:1|2=1){
 return kind==='phrase'?profile.phrases==='listen'||(profile.phrases==='supported'&&phraseLevel===2):profile.entry==='listen';
}
