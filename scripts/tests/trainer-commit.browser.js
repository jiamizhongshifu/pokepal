// Synthetic data only, isolated local Vite profile. Never run in a real user's browser.
(async()=>{
 const {useGame,flushPendingSave}=await import('/src/store.ts');
 const {db,readSaveSnapshot}=await import('/src/lib/db.ts');
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 await useGame.getState().load();await flushPendingSave();
 check(!useGame.getState().save.trainer,'Requires a fresh isolated profile');
 const before=useGame.getState().save.balls.poke;
 const original=db.transaction;
 try{
  db.transaction=async function(...args){await new Promise(r=>setTimeout(r,300));return original.apply(this,args);};
  const first=useGame.getState().createTrainer('avatar-red');
  check(useGame.getState().save.trainer===null,'No premature trainer success');
  check(await useGame.getState().createTrainer('avatar-blue')===false,'Reject repeat during persistence');
  check(await first===true,'First creation succeeds');
 }finally{db.transaction=original;}
 const disk=(await readSaveSnapshot()).save;
 check(disk.trainer.avatar==='avatar-red'&&disk.balls.poke===before+1,'Trainer and gift are durable before return');
 await useGame.getState().createTrainer('avatar-blue');
 const repeat=(await readSaveSnapshot()).save;
 check(repeat.balls.poke===before+1&&repeat.trainer.avatar==='avatar-red','Repeated creation cannot mint gifts or replace trainer');
 return {passed:true,trainerPersisted:true,repeatGiftPrevented:true,balls:repeat.balls.poke};
})()
