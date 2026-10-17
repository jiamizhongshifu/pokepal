// Run with agent-browser eval --stdin in an isolated DEV session after an audio-unlocking click.
(async()=>{
 const g=window.__game,speech=await import('/src/lib/speech.ts'),results=[];
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async(fn,label)=>{const end=Date.now()+10000;while(!fn()){if(Date.now()>end)throw Error(label);await sleep(80);}};
 const check=(yes,label)=>{if(!yes)throw Error(label);results.push(label);};
 const guide=id=>document.querySelector(`[data-guide="${id}"]`);
 const route=async screen=>{g.getState().go(screen);await sleep(250);};
 g.getState().resetGuides();await route({name:'tasks'});
 g.getState().updateSettings({ambientEnglish:'off',backgroundMusic:'off'});
 await route({name:'energy'});await wait(()=>guide('energy')?.classList.contains('is-open'),'first visit');
 check(!!g.getState().save.onboarding.seen.energy,'first visit persisted');
 guide('energy').querySelector('.guide-dismiss').click();
 await route({name:'tasks'});await route({name:'energy'});
 check(guide('energy').classList.contains('is-closed'),'revisit does not reopen');
 guide('energy').querySelector('.guide-reopen').click();await sleep(150);
 check(guide('energy').classList.contains('is-open'),'manual replay opens');
 await wait(()=>speech.isForegroundAudioActive(),'manual voice starts');check(true,'Volcengine guide voice plays');
 // Child action cancels its queued/playing instruction; subsequent foreground speech is not cancelled.
 document.querySelector('.energy-activity').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
 check(!speech.isForegroundAudioActive(),'child action stops owned hint');
 const next=speech.say(1200);await route({name:'energy'}); // same page, new scope; guide cannot take later narration
 await next;
 await route({name:'stories'});guide('stories')?.querySelector('.guide-dismiss')?.click();
 // Auto hint must not arrive after a child begins interacting on the new page.
 g.getState().resetGuides();await route({name:'dex'});
 document.querySelector('.dex-search input, .dex-cell').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
 await sleep(700);speech.stopSpeech();await sleep(1500);check(!speech.isForegroundAudioActive(),'queued hint cancelled by interaction');
 g.getState().setGuideAutomatic(false);await route({name:'practice'});
 check(guide('practice').classList.contains('is-closed'),'parent preference suppresses new automatic hint');
 guide('practice').querySelector('.guide-reopen').click();await sleep(150);
 check(guide('practice').classList.contains('is-open'),'manual help remains available when automatic disabled');
 g.getState().resetGuides();await route({name:'tasks'});
 check(guide('tasks').classList.contains('is-open'),'parent reset re-enables hints');
 await route({name:'task',kind:'wordpic',boardIndex:null,session:Date.now()});
 await wait(()=>document.querySelector('.choices'),'choices');
 check(!!document.querySelector('.choices.guide-target')&&!document.querySelector('.choice.guide-target'),'guidance never points at a particular answer');
 check(!document.querySelector('.home .feature-guide'),'hidden island cannot leave guidance mounted');
 await sleep(700); // allow the application instance's debounced durable write
 const persisted=(await (await import('/src/lib/db.ts')).readSaveSnapshot()).save;
 check(persisted.onboarding.seen.tasks===true&&persisted.onboarding.automatic===true,'preferences survive IndexedDB write '+JSON.stringify(persisted.onboarding));
 check(persisted.energy===0&&persisted.balls.poke===1&&persisted.captures.length===0,'guide has no reward or capture side effects');
 return {passed:true,results};
})()
