// Run only in an isolated development browser, after a real user gesture unlocks audio.
(async()=>{
 const g=window.__game,speech=await import('/src/lib/speech.ts');
 const results=[];
 const waitFor=async(fn,label)=>{const deadline=Date.now()+12000;while(!fn()){if(Date.now()>deadline)throw new Error(label+': '+JSON.stringify(window.__music));await new Promise(r=>setTimeout(r,100));}};
 const check=(ok,label)=>{if(!ok)throw new Error(label);results.push(label);};
 speech.stopSpeech();g.getState().updateSettings({ambientEnglish:'off',backgroundMusic:'soft'});
 g.getState().go({name:'home'});
 for(const sky of ['morning','day','evening','night']){
  window.__sky=sky;await waitFor(()=>window.__music.playing.includes(sky)&&window.__music.pending===null,'load '+sky);
  check(window.__music.playing.length<=2,'bounded crossfade '+sky);
 }
 // Calling the actual speech engine holds ducking across spoken-sequence pauses too.
 const narration=speech.say(1000);await waitFor(()=>window.__music.gain<.03,'duck speech');
 check(window.__music.gain>0,'music remains quiet under narration');await narration;
 await waitFor(()=>window.__music.gain===.13,'restore volume');
 for(const [screen,track] of [['catch','meadow'],['stories','storybook'],['dex','village']]){
  g.getState().go({name:screen});await waitFor(()=>window.__music.playing.includes(track)&&window.__music.pending===null,'route '+screen);
  check(window.__music.cached<=2,'decoded cache bounded '+screen);
 }
 for(const screen of ['diary','parent']){
  g.getState().go({name:screen});await waitFor(()=>window.__music.playing.length===0&&window.__music.desired===null,'silent '+screen);
  check(true,'silent '+screen);
 }
 g.getState().go({name:'home'});await waitFor(()=>window.__music.playing.includes('night'),'return home');
 g.getState().updateSettings({backgroundMusic:'off'});await waitFor(()=>window.__music.playing.length===0,'mute');
 check(window.__music.desired===null,'disabled has no pending track');
 await (await import('/src/store.ts')).flushPendingSave();
 check((await (await import('/src/lib/db.ts')).readSaveSnapshot()).save.settings.backgroundMusic==='off','mute persisted to IndexedDB');
 g.getState().updateSettings({backgroundMusic:'normal'});await waitFor(()=>window.__music.playing.includes('night')&&window.__music.gain===.24,'resume');
 g.getState().updateSettings({backgroundMusic:'soft'});delete window.__sky;
 return {passed:true,results};
})()
