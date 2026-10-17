/** Gentle voice-activity detection, not word recognition or pronunciation scoring. */
export class VoiceActivity {
  voicedMs = 0;
  silenceMs = 0;
  peak = 0;
  private floor = .002;
  private runMs = 0;
  sample(rms:number, elapsedMs:number) {
    const dt=Math.min(100,Math.max(0,elapsedMs));
    const value=Number.isFinite(rms)?Math.max(0,rms):0;
    // Do not learn the child's first syllable as background noise. Only quieter
    // samples adjust the floor; soft/short words can count from the first frame.
    if(value<.005)this.floor=this.floor*.9+value*.1;
    const threshold=Math.max(.005,Math.min(.01,this.floor*1.8));
    this.peak=Math.max(this.peak,Math.min(1,value/.15));
    if(value>threshold){this.runMs+=dt;this.silenceMs=0;}
    else {if(this.runMs>=120)this.voicedMs+=this.runMs;this.runMs=0;this.silenceMs+=dt;}
    const voiced=this.voicedMs+ (this.runMs>=120?this.runMs:0)>=180;
    return {level:Math.min(1,value/.09),voiced,done:voiced&&this.silenceMs>=800};
  }
  result(){const duration=this.voicedMs+(this.runMs>=120?this.runMs:0);return {voiced:duration>=180,voicedMs:Math.round(duration),peak:this.peak};}
}
