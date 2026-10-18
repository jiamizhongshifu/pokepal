// Run in an isolated Vite browser. Exercises actual map controls without touching a user's save.
(async()=>{
 const g=window.__game,{LEARNING_UNITS,LEARNING_CHAPTERS}=await import('/src/data/curriculum.ts');
 if(!g)throw new Error('Use an isolated dev browser with window.__game set to useGame');
 const original=structuredClone(g.getState().save),originalScreen=g.getState().screen;
 const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const assert=(ok,message)=>{if(!ok)throw new Error(message);};
 const seed=async(count)=>{
  const save=structuredClone(original);save.learning={...save.learning,units:Object.fromEntries(LEARNING_UNITS.slice(0,count).map(u=>[u.id,{completedAt:1,round:0}]))};
  g.setState({save,screen:{name:'tasks'}});await frame();g.setState({screen:{name:'journey'}});await frame();
 };
 try{
  await seed(2);
  const before=JSON.stringify(g.getState().save.learning);
  assert(document.querySelectorAll('.adventure-stop').length===4,'Stage overview omits lessons');
  assert(document.querySelectorAll('.is-done').length===2,'Completed markers do not reflect save');
  document.querySelector('.adventure-stop.is-future').click();await frame();
  assert(document.querySelector('.adventure-brief h2')?.textContent===LEARNING_UNITS[3].title,'Future preview has wrong lesson');
  assert(!document.querySelector('.adventure-start'),'Future preview bypasses progression');
  document.querySelector('.adventure-detail-close').click();await frame();
  assert(!document.querySelector('.adventure-brief'),'Preview does not dismiss');
  const stages=[];
  for(let i=0;i<LEARNING_CHAPTERS.length;i++){
   assert(document.querySelectorAll('.adventure-stop').length===4,`Stage ${i+1} omits lessons`);
   assert(document.querySelector('.region-title h1').textContent===LEARNING_CHAPTERS[i].title,'Wrong stage heading');
   stages.push(LEARNING_CHAPTERS[i].title);
   if(i<LEARNING_CHAPTERS.length-1){document.querySelector('[aria-label="查看下一阶段"]').click();await frame();}
  }
  assert(document.querySelector('[aria-label="查看下一阶段"]').disabled,'Last stage has invalid next navigation');
  assert(JSON.stringify(g.getState().save.learning)===before,'Browsing map mutated progress');
  document.querySelector('.map-caption>button').click();await frame();
  assert(document.querySelector('.is-current')?.textContent.includes(LEARNING_UNITS[2].title),'Find me returns wrong lesson');
  document.querySelectorAll('.journey-tabs button')[1].click();await frame();
  assert(document.querySelectorAll('.journey-review-grid>button').length===2,'Review includes incomplete lessons');
  document.querySelectorAll('.journey-tabs button')[0].click();await frame();
  // Observe startUnit arguments without allowing test data to be persisted.
  const start=g.getState().startUnit;let launched;
  g.setState({startUnit:id=>{launched=id;}});await frame();
  try{document.querySelector('.is-current').click();assert(launched===LEARNING_UNITS[2].id,'Current node is not one-tap launch');}finally{g.setState({startUnit:start});}
  await seed(24);
  assert(!document.querySelector('.adventure-stop.is-current'),'Completed curriculum pretends to have unfinished lesson');
  assert(document.querySelector('.adventure-finish.is-earned'),'Completed stage badge missing');
  document.querySelector('.adventure-finish').click();await frame();
  assert(document.querySelectorAll('.journey-review-grid>button').length===24,'Final badge does not lead to complete review');
  return {passed:true,stages,lessons:24,checks:['overview','locked-preview','dismiss','stage-navigation','progress-preserved','find-me','review','one-tap-start','all-complete']};
 }finally{g.setState({save:original,screen:{name:'tasks'}});await frame();g.setState({screen:originalScreen});await frame();}
})()
