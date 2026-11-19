import { useGame } from '../store';
import { DAILY_GOAL, participationCount, type ParticipationKind } from '../lib/participation';
export function ParticipationNote({kind}:{kind:ParticipationKind}){
 const save=useGame(s=>s.save),done=save.daily.participated?.includes(kind);
 return <p className="participation-note" role="status">{done?'这类参与今天已经记下啦。':'完成这一小段，就会记下今天的参与。'} 今天已体验 {Math.min(DAILY_GOAL,participationCount(save))} / {DAILY_GOAL} 类；听、指、共读都可以。</p>;
}
