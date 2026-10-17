// Run only in an isolated Vite dev browser via agent-browser eval --stdin.
(async()=>{
 const g=window.__game;
 if(!g?.getState().loaded)throw new Error('Open an isolated dev session and finish loading first');
 const {db,readSaveSnapshot}=await import('/src/lib/db.ts');
 const {flushPendingSave}=await import('/src/store.ts');
 const check=(value,message)=>{if(!value)throw new Error(message);};
 const evidence=[];
 const fixture=structuredClone(g.getState().save);
 fixture.energy=30;fixture.balls.poke=2;fixture.captures=[];
 fixture.farm={version:1,plots:[{berry:'oran',plantedAt:Date.now()-100000,wateredAt:Date.now()-90000},null,null],basket:{oran:0,pecha:0,cheri:0}};
 fixture.daily.participated=[];fixture.daily.energyEarned=0;fixture.daily.goalDone=false;
 await g.getState().importSave(fixture);g.getState().go({name:'shop'});
 const original=db.kv.put, originalTransaction=db.transaction;
 try{
  db.transaction=async function(...args){await new Promise(r=>setTimeout(r,150));return originalTransaction.apply(this,args);};
  const first=g.getState().buyBall();
  check(g.getState().save.energy===30,'no success balance before persistence');
  check(await g.getState().buyBall()===false,'repeat during write rejected');
  check(await first===true,'first exchange succeeds');
  check((await readSaveSnapshot()).save.balls.poke===3,'success exchange already on disk');
  evidence.push('delayed exchange: no premature balance, repeat rejected, disk committed');
 }finally{db.transaction=originalTransaction;}
 check(await g.getState().catchPokemon(25),'capture succeeds');
 check(!await g.getState().catchPokemon(25),'repeat capture rejected');
 let disk=(await readSaveSnapshot()).save;
 check(disk.captures.length===1&&disk.balls.poke===2,'capture is atomic and durable');
 const reward=await g.getState().completeTask('listen',0);
 disk=(await readSaveSnapshot()).save;
 check(reward?.gained===2&&disk.daily.participated.includes('listen'),'task reward durable before result');
 check((await g.getState().completeTask('listen',0))?.gained===0,'same task no duplicate energy');
 check(await g.getState().harvestCrop(0),'harvest succeeds');
 check(!await g.getState().harvestCrop(0),'repeat harvest rejected');
 disk=(await readSaveSnapshot()).save;
 check(disk.farm.basket.oran===2&&disk.farm.plots[0]===null,'harvest durable before result');
 evidence.push('capture / task / harvest: committed before return, no duplicate resources');
 await flushPendingSave();
 const before=structuredClone(g.getState().save);
 try{
  db.kv.put=async()=>{throw new DOMException('Audit simulated full storage','QuotaExceededError');};
  check(!await g.getState().buyBall(),'write failure cannot return success');
  check(g.getState().saveIssue==='write','write failure exposes recovery');
  check((await readSaveSnapshot()).save.energy===before.energy,'failed write leaves disk unchanged');
 }finally{db.kv.put=original;}
 await g.getState().retrySave();
 disk=(await readSaveSnapshot()).save;
 check(g.getState().saveIssue===null,'retry clears failure');
 check(disk.energy===before.energy-5&&disk.balls.poke===before.balls.poke+1,'retry saves same transaction exactly once');
 evidence.push('quota fault: no success, old disk intact, retry commits exactly once');
 return {passed:true,evidence,final:{energy:disk.energy,balls:disk.balls,captures:disk.captures.length,basket:disk.farm.basket}};
})()
