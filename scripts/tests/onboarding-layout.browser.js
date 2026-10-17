(async()=>{
 const routes=[{name:'tasks'},{name:'practice'},{name:'energy'},{name:'shop'},{name:'dex'},{name:'dexDetail',id:1},{name:'journey'},{name:'notebook'},{name:'stories'},{name:'story',id:'magic-words'},...['listen','wordpic','repeat','trace'].map(kind=>({name:'task',kind,boardIndex:null,session:Date.now()}))];
 const g=window.__game,results=[];
 g.getState().resetGuides();
 for(const route of routes){
  g.getState().go(route);await new Promise(r=>setTimeout(r,650));
  const guide=document.querySelector('.feature-guide'),rect=guide?.getBoundingClientRect(),screen=document.querySelector('#root>.screen:not(.home)');
  results.push({route:route.kind||route.name,guide:guide?.dataset.guide,visible:!!rect&&rect.width>0,target:document.querySelector('.guide-target')?.className,overflow:screen?screen.scrollWidth>screen.clientWidth+1:false,buttons:guide?[...guide.querySelectorAll('button')].map(b=>({label:b.getAttribute('aria-label'),w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})):[]});
 }
 return results;
})()
