/** One pending transition per round. Replays, pause, navigation and hidden tabs invalidate it. */
export class RoundAdvance {
 private timer:ReturnType<typeof setTimeout>|undefined;
 private version=0;
 cancel(){this.version++;clearTimeout(this.timer);this.timer=undefined;}
 schedule(action:()=>void,delay:number){this.cancel();const ticket=this.version;this.timer=setTimeout(()=>{this.timer=undefined;if(ticket===this.version)action();},delay);}
}
