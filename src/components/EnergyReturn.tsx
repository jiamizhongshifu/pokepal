import {useState} from 'react';
import {useGame} from '../store';
import {energyGoalState} from '../lib/energyGoal';
import {Icon} from '../icons';
export function EnergyReturn(){
 const {save,screen,go}=useGame();const [dismissed,setDismissed]=useState(false);
 const goal='returnGoal' in screen?screen.returnGoal:undefined;
 if(!goal||dismissed)return null;
 const state=energyGoalState(save,goal);
 return <section className="energy-return" aria-label="刚才的小心愿"><Icon name={goal==='ball'?'pokeball':'upgrade'} size={40}/><div><strong>{state.ready?(goal==='ball'?'可以去找新伙伴啦':'可以去看看小岛啦'):`离${goal==='ball'?'精灵球':state.title}还差 ${state.short} 点能量`}</strong><p>{state.ready?'你的心愿，我们记着呢。':'不着急，随时可以休息。'}</p></div><button className="btn-small" onClick={()=>go(state.ready?(goal==='ball'?(state.hasBall?{name:'catch'}:{name:'shop'}):{name:'home',station:`upgrades:${goal}`}):{name:'energy',goal})}>{state.ready?(goal==='ball'?(state.hasBall?'去草丛':'去换球'):'去看看'):'看看小心愿'}</button><button className="btn-small" onClick={()=>setDismissed(true)}>先自由玩</button></section>;
}
