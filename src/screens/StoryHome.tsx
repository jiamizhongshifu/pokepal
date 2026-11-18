import {useGame} from '../store';
import {todayStory} from '../lib/storyHome';
import {StoryNextButton} from '../components/StoryNextButton';
import {ParentButton} from '../components/TopBar';
import {PokeImg} from '../components/PokeImg';
import {creatureArt,getCreature} from '../data/creatures';
import {Icon} from '../icons';
import './story-home.css';
export function StoryHome({companion}:{companion?:number}){
 const save=useGame(s=>s.save),go=useGame(s=>s.go),step=todayStory(save,companion);
 const friend=step.companion?getCreature(step.companion):undefined;
 return <div className="screen story-home">
 <header className="story-home-header"><div><span>PokéPal</span><p>{save.trainer?.name??'小训练师'}的故事小岛</p></div><ParentButton onOpen={()=>go({name:'parent'})}/></header>
 <main>
 <section className="today-story" aria-label="今天的故事">
 <div className="today-picture"><img className="today-backdrop" src="/story-art/painted-v1/backgrounds/orchard.png" alt="阳光下的故事小岛"/>{friend?<PokeImg className="today-partner" src={creatureArt(friend.id)} alt={friend.nameZh}/>:<img className="today-basket" src="/story-art/painted-v1/props/basket-apples.png" alt="留给新朋友的一篮苹果"/>}<span className="today-note">{friend?`${friend.nameZh}在等你`:'一个故事，一位新朋友'}</span></div>
 <div className="today-copy"><p className="today-eyebrow">今天，有你一起</p><h1>{friend?'和自己的伙伴，过一个小故事':'小训练师，故事开始啦'}</h1><p>{step.description}</p><StoryNextButton className="today-start" step={step}/><small>可以随时停下来，故事会等你。</small></div>
 </section>
 <div className="story-day-path" aria-label="故事里的小发现">{[['apple','分享点心'],['flower','照顾小苗'],['ball','一起玩'],['pokeball','认识朋友']].map(([icon,label])=><span key={label}><Icon name={icon} size={28}/>{label}</span>)}</div>
 <details className="story-home-more"><summary>更多玩法 <span aria-hidden="true">⌄</span></summary><nav aria-label="更多玩法">
 <button onClick={()=>go({name:'stories'})}><Icon name="book" size={28}/>故事书架</button>
 <button onClick={()=>go({name:'home',view:'island'})}><Icon name="island" size={28}/>自由逛小岛</button>
 <button onClick={()=>go({name:'dex'})}><Icon name="dex" size={28}/>我的伙伴与图鉴</button>
 <button onClick={()=>go({name:'tasks'})}><Icon name="tasks" size={28}/>英语小发现</button>
 <button onClick={()=>go({name:'diary'})}><Icon name="diary" size={28}/>小日记</button>
 <button onClick={()=>go({name:'energy',goal:'ball'})}><Icon name="bolt" size={28}/>能量与精灵球</button>
 </nav><p>已有 {save.captures.length} 位伙伴 · {save.energy} 能量 · {save.balls.poke} 个精灵球</p></details>
 </main></div>;
}
