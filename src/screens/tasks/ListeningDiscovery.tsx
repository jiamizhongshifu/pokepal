import {RoundProgress} from '../../components/RoundProgress';
import { useMemo,useState } from 'react';
import { dailyLearningPlan } from '../../data/learning';
import { learningEntry } from '../../data/curriculum';
import { learningProfile } from '../../lib/learningStage';
import { useGame } from '../../store';
import { LearningRound } from '../LearningLesson';

/** The listening stage uses familiar pictures without inventing correct-answer evidence. */
export function ListeningDiscovery({onFinish,practice=false,source}:{onFinish:()=>void;practice?:boolean;source:string}){
 const [idx,setIdx]=useState(0);
 const session=useMemo(()=>{const save=useGame.getState().save;return {words:dailyLearningPlan(save,practice).words,profile:learningProfile(save.settings)};},[]);
 const target=learningEntry(session.words[idx].en)!;
 return <div className="listening-discovery">
  <RoundProgress index={idx} total={session.words.length} unit="个小发现"/>
  <LearningRound key={idx} target={target} count={session.profile.choices} listenFirst onNext={()=>idx+1<session.words.length?setIdx(idx+1):onFinish()} source={source}/>
 </div>;
}
