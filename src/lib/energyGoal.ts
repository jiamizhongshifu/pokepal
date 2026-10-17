import type {SaveData} from '../types';
import {UPGRADES,type UpgradeId} from './islandProgress';
import {BALLS} from '../data/pokemon';
export type EnergyGoal='ball'|UpgradeId;
/** Resource states, not the entry route, decide the next useful action. */
export function energyGoalState(save:SaveData,goal:EnergyGoal='ball'){
 if(goal==='ball')return {goal,title:'邀请一个新伙伴',cost:BALLS.poke.cost,short:Math.max(0,BALLS.poke.cost-save.energy),ready:save.balls.poke>0||save.energy>=BALLS.poke.cost,complete:false,hasBall:save.balls.poke>0};
 const spec=UPGRADES.find(u=>u.id===goal)!,level=save.islandProgress?.levels[goal]??0;
 const complete=level>=spec.cost.length,cost=complete?0:spec.cost[level];
 return {goal,title:spec.name,cost,short:Math.max(0,cost-save.energy),ready:complete||save.energy>=cost,complete,hasBall:false};
}
