(async()=>{
 const routes=[{name:'home'},{name:'practice'},{name:'home',view:'island'},{name:'catch'},{name:'dex'},{name:'dexDetail',id:1001},{name:'notebook'},{name:'stories'},{name:'story',id:'magic-words'},...['listen','wordpic','repeat','trace'].map(kind=>({name:'task',kind,boardIndex:null,session:Date.now()}))];
 const g=window.__game,results=[];
 const {FIRST_FRIEND}=await import('/src/data/creatures.ts');
 if(!g.getState().save.captures.length && !await g.getState().inviteFriend(FIRST_FRIEND))throw Error('island guide requires a companion');
 g.getState().resetGuides();
 for(const route of routes){
  g.getState().go(route);await new Promise(r=>setTimeout(r,650));
  const guide=document.querySelector('.feature-guide'),rect=guide?.getBoundingClientRect(),screen=document.querySelector('#root>.screen:not(.home)');
  if(!rect?.width||!rect.height)throw Error('missing guide for '+JSON.stringify(route));
  results.push({route:route.kind||route.name,guide:guide?.dataset.guide,visible:!!rect&&rect.width>0,target:document.querySelector('.guide-target')?.className,overflow:screen?screen.scrollWidth>screen.clientWidth+1:false,buttons:guide?[...guide.querySelectorAll('button')].map(b=>({label:b.getAttribute('aria-label'),w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})):[]});
 }
 if(results.some(item=>item.overflow))throw Error('guide page overflows its viewport');
 return {passed:true,results};
})()
