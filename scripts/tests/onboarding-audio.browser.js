(async()=>{
 const g=window.__game,s=await import('/src/lib/speech.ts'),mic=await import('/src/lib/mic.ts');
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));const results=[];
 const check=(v,l)=>{if(!v)throw Error(l);results.push(l);};
 g.getState().resetGuides();g.getState().go({name:'energy'});await sleep(1300);
 check(s.isForegroundAudioActive(),'first-use energy guide automatically plays');
 const newer=s.say(1600);document.querySelector('[data-guide="energy"] .guide-dismiss').click();
 check(s.isForegroundAudioActive(),'closing old guide preserves later foreground narration');await newer;
 // Simulate a pending microphone permission request, without capturing microphone data.
 const real=navigator.mediaDevices.getUserMedia;
 navigator.mediaDevices.getUserMedia=()=>new Promise(()=>{});
 const recording=mic.record();
 check(mic.isMicActive(),'microphone permission wait is treated as recording');
 g.getState().go({name:'practice'});await sleep(1300);
 check(!s.isForegroundAudioActive(),'no automatic guide audio while microphone is active');
 document.querySelector('[data-guide="practice"] .guide-hear').click();await sleep(150);
 check(!s.isForegroundAudioActive(),'manual help cannot inject audio into recording');
 mic.releaseMic();await recording;navigator.mediaDevices.getUserMedia=real;
 check(!mic.isMicActive(),'recording cancellation releases guide guard');
 g.getState().go({name:'energy'});await sleep(250);document.querySelector('.guide-reopen').click();await sleep(150);
 check(s.isForegroundAudioActive(),'manual guide can play after recording');
 g.getState().go({name:'parent'});await sleep(250);
 check(!s.isForegroundAudioActive(),'route change stops guide voice');
 return {passed:true,results};
})()
