// Isolated dev browser regression: real audio and actual continuation buttons.
(async()=>{
 const g=window.__game,{stageProfile}=await import('/src/lib/learningStage.ts');
 const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const results=[];
 for(const stage of ['listen','discover','express']){
  g.getState().go({name:'parent'});await frame();
  await g.getState().setLearningProfile(stageProfile(stage));
  const key='expression:red apples',before=structuredClone(g.getState().save.learning?.records[key]??{});
  g.getState().go({name:'review',keys:[key]});await frame();
  document.querySelector('.learning-round .lesson-actions button, .learning-round .btn-small').click();
  const deadline=Date.now()+25000;
  while(document.querySelector('.learning-round .journey-primary')?.disabled&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100));
  const next=document.querySelector('.learning-round .journey-primary');
  if(!next||next.disabled)throw new Error(`${stage}: audio not ready`);
  next.click();await frame();
  const after=g.getState().save.learning.records[key];
  if(after.attempts!==(before.attempts??0)||after.supported!==(before.supported??0)||after.independent!==(before.independent??0))throw new Error(`${stage}: listening invented an answer`);
  if(after.nextReview<Date.now())throw new Error('listening did not rest word');
  results.push({stage,attempts:after.attempts,supported:after.supported,independent:after.independent,seen:after.seen});
 }
 return {passed:true,results};
})()
