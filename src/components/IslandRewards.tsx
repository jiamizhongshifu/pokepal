import {useEffect,useState} from 'react';
import {useGame} from '../store';
import {FURNITURE} from '../lib/islandLiving';
import {UPGRADES,type UpgradeId} from '../lib/islandProgress';
import type {DecorPreview} from '../lib/decorPreview';
import {Icon} from '../icons';
import {sfx} from '../lib/speech';
export function IslandRewards({onSeeIsland,initialUpgrade,onPreview}:{onSeeIsland:()=>void;initialUpgrade?:UpgradeId;onPreview:(p:DecorPreview|null)=>void}){
 const {save,setFurniture,upgradeIsland,go}=useGame();
 const [tab,setTab]=useState<'decorate'|'upgrade'>(initialUpgrade?'upgrade':'decorate');
 const [preview,setPreview]=useState<DecorPreview|null>(()=>initialUpgrade?{kind:'upgrade',id:initialUpgrade,level:save.islandProgress?.levels[initialUpgrade]??0,after:true}:null);
 const [message,setMessage]=useState('');
 useEffect(()=>{onPreview(preview);},[preview]);
 useEffect(()=>()=>onPreview(null),[]);
 const placed=save.islandLiving?.furniture??[];
 if(preview){
  const furniture=preview.kind==='decoration'?FURNITURE.find(f=>f.id===preview.id):undefined;
  const upgrade=preview.kind==='upgrade'?UPGRADES.find(u=>u.id===preview.id):undefined;
  const canUpgrade=preview.kind==='upgrade'&&!preview.purchased&&preview.level<2;
  const cost=canUpgrade?upgrade!.cost[preview.level as 0|1]:0;
  return <div className="dress-preview-strip" aria-label="看看实际场景"><header><button aria-label="返回装扮目录" onClick={()=>setPreview(null)}><Icon name="back" size={26}/></button><strong>{furniture?.name??upgrade?.name}</strong><button aria-label="关闭装扮" onClick={onSeeIsland}><Icon name="close" size={26}/></button></header>
   <p role="status">{message||(furniture?'已经摆好啦，看看它在哪里。':canUpgrade?'这是场景预览，还没有花能量。':'已经升级好啦。')}</p>
   {preview.kind==='upgrade'&&canUpgrade&&<><div className="dress-compare" aria-label="真实场景前后对比"><button aria-pressed={!preview.after} onClick={()=>setPreview({...preview,after:false})}>现在</button><button aria-pressed={preview.after} onClick={()=>setPreview({...preview,after:true})}>升级后</button></div><small>{upgrade!.changes[preview.level as 0|1]}</small><button className="farm-primary" onClick={()=>{
    if(save.energy<cost){go({name:'energy',goal:preview.id});return;}
    if(upgradeIsland(preview.id,preview.level)){sfx('sparkle');setPreview({...preview,purchased:true,after:true});setMessage('小岛升级啦！');}else{setPreview(null);setMessage('刚才没有升级，也没有扣能量，请重新看看。');}
   }}><Icon name={save.energy<cost?'bolt':'upgrade'} size={28}/>{save.energy<cost?`还差 ${cost-save.energy} 能量，去看看`:`用 ${cost} 能量升级`}</button></>}
   {furniture&&<details className="dress-remove"><summary>调整装饰</summary><button onClick={()=>{setFurniture(furniture.id,false);setPreview(null);setMessage(`${furniture.name}收好啦，随时可以再摆上。`);}}>收起来</button></details>}
  </div>;
 }
 return <div className="island-rewards"><div className="dress-tabs" aria-label="装扮方式"><button aria-pressed={tab==='decorate'} onClick={()=>{setTab('decorate');setMessage('');}}><Icon name="flower" size={36}/>放装饰</button><button aria-pressed={tab==='upgrade'} onClick={()=>{setTab('upgrade');setMessage('');}}><Icon name="upgrade" size={36}/>升一级</button></div>
 <div className="dress-feedback" role="status"><Icon name={message?'check':'hand'} size={28}/><span>{message||(tab==='decorate'?'点一下就摆好，再点可以看看。':'先看看真实变化，再决定升级。')}</span></div>
 {tab==='decorate'?<div className="dress-catalog">{FURNITURE.map(f=>{const on=placed.includes(f.id);return <button className="dress-item" key={f.id} aria-label={`${f.name}，${on?'已摆好，点击查看':'点击自动摆放'}`} onClick={()=>{if(on||setFurniture(f.id,true)){if(!on)sfx('sparkle');setMessage(on?'这是我们摆好的装饰。':`${f.name}摆好啦！`);setPreview({kind:'decoration',id:f.id});}}}><span className="dress-item-art"><Icon name={`decor-${f.id}`} size={68}/>{on&&<span className="dress-check"><Icon name="check" size={20}/></span>}</span><strong>{f.name}</strong><small>{f.area}</small><span className="dress-item-action"><Icon name={on?'eye':'hand'} size={22}/>{on?'看看':'放这里'}</span></button>;})}</div>:<><p className="dress-energy"><Icon name="bolt" size={28}/>你有 <strong>{save.energy}</strong> 点能量</p>{UPGRADES.map(u=>{const level=save.islandProgress?.levels[u.id]??0;return <div className="upgrade-choice" key={u.id}><Icon name={u.icon} size={52}/><div><strong>{u.name}</strong><small>{level===2?'已经升级完成':u.changes[level as 0|1]}</small></div><button className="upgrade-preview" aria-label={`看看${u.name}${level===2?'':'升级后'}`} onClick={()=>{setMessage('');setPreview({kind:'upgrade',id:u.id,level,after:true});}}><Icon name="eye" size={28}/>看看{level<2&&<small>{u.cost[level as 0|1]} 能量</small>}</button></div>;})}</>}
 <button className="dress-see" onClick={onSeeIsland}><Icon name="eye" size={30}/>看看我们的小岛</button></div>;
}
