// Run only in an isolated Vite dev browser via agent-browser eval --stdin.
(async()=>{
 const g=window.__game;
 if(!g?.getState().loaded || g.getState().save.trainer || g.getState().save.captures.length)throw new Error('Open an isolated dev session and finish loading first');
 const {db,readSaveSnapshot}=await import('/src/lib/db.ts');
 const {flushPendingSave}=await import('/src/store.ts');
 const check=(value,message)=>{if(!value)throw new Error(message);};
 const evidence=[];
 const fixture=structuredClone(g.getState().save);
 fixture.energy=0;fixture.balls.poke=2;fixture.captures=[];
 fixture.farm={version:1,plots:[{berry:'oran',plantedAt:Date.now()-100000,wateredAt:Date.now()-90000},null,null],basket:{oran:0,pecha:0,cheri:0}};
 fixture.daily.participated=[];fixture.daily.energyEarned=0;fixture.daily.goalDone=false;
 await g.getState().importSave(fixture);
 const original=db.kv.put, originalTransaction=db.transaction;
 try{
  db.transaction=async function(...args){await new Promise(r=>setTimeout(r,150));return originalTransaction.apply(this,args);};
  const first=g.getState().inviteFriend(1001);
  check(g.getState().save.balls.poke===2,'no invitation spent before persistence');
  check(await g.getState().inviteFriend(1001)===false,'repeat during write rejected');
  check(await first===true,'first invitation succeeds');
 }finally{db.transaction=originalTransaction;}
 check(!await g.getState().inviteFriend(1001),'repeat invite rejected');
 let disk=(await readSaveSnapshot()).save;
 check(disk.captures.length===1&&disk.balls.poke===1,'new friend and spent invitation are durable together');
 evidence.push('delayed invitation: no premature balance, repeat rejected, disk committed');
 const reward=await g.getState().completeTask('listen',0);
 disk=(await readSaveSnapshot()).save;
 check(reward?.fresh===true&&disk.daily.participated.includes('listen'),'task reward durable before result');
 check((await g.getState().completeTask('listen',0))?.fresh===false,'same task is not fresh twice');
 check(await g.getState().harvestCrop(0),'harvest succeeds');
 check(!await g.getState().harvestCrop(0),'repeat harvest rejected');
 disk=(await readSaveSnapshot()).save;
 check(disk.farm.basket.grapes===2&&disk.farm.plots[0]===null,'harvest durable before result');
 evidence.push('capture / task / harvest: committed before return, no duplicate resources');
 await flushPendingSave();
 const before=structuredClone(g.getState().save);
 try{
  db.kv.put=async()=>{throw new DOMException('Audit simulated full storage','QuotaExceededError');};
  check(!await g.getState().inviteFriend(1011),'write failure cannot return success');
  check(g.getState().saveIssue==='write','write failure exposes recovery');
  check((await readSaveSnapshot()).save.balls.poke===before.balls.poke,'failed write leaves disk unchanged');
 }finally{db.kv.put=original;}
 await g.getState().retrySave();
 disk=(await readSaveSnapshot()).save;
 check(g.getState().saveIssue===null,'retry clears failure');
 check(disk.balls.poke===before.balls.poke-1&&disk.captures.filter(c=>c.id===1011).length===1,'retry saves same transaction exactly once');
 evidence.push('quota fault: no success, old disk intact, retry commits exactly once');
 return {passed:true,evidence,final:{energy:disk.energy,balls:disk.balls,captures:disk.captures.length,basket:disk.farm.basket}};
})()
