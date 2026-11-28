// Isolated dev browser regression: real audio and actual continuation buttons.
(async()=>{
 const g=window.__game,{stageProfile}=await import('/src/lib/learningStage.ts');
 const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 async function until(find,label){
  const end=Date.now()+25000;
  while(Date.now()<end){const result=find();if(result)return result;await new Promise(r=>setTimeout(r,80));}
  throw Error(label);
 }
 g.getState().setGuideAutomatic(false);
 const results=[];
 for(const stage of ['listen','discover','express']){
  g.getState().go({name:'parent'});await frame();
  await g.getState().setLearningProfile(stageProfile(stage));
  const key='expression:red apples',before=structuredClone(g.getState().save.learning?.records[key]??{});
  g.getState().go({name:'review',keys:[key]});await frame();
  const pace=await until(()=>document.querySelector('.learning-round .round-pace'),'review pace button');
  pace.click();
  document.querySelector('.learning-round .round-hear').click();
  const next=await until(()=>document.querySelector('.learning-round .round-pace.is-next'),stage+' audio playback');
  next.click();await frame();
  const after=g.getState().save.learning.records[key];
  if(after.attempts!==(before.attempts??0)||after.supported!==(before.supported??0)||after.independent!==(before.independent??0))throw new Error(`${stage}: listening invented an answer`);
  if(after.nextReview<Date.now())throw new Error('listening did not rest word');
  results.push({stage,attempts:after.attempts,supported:after.supported,independent:after.independent,seen:after.seen});
 }
 return {passed:true,results};
})()
