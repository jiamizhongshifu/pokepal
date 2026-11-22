/** One pending transition per round. Replays, pause, navigation and hidden tabs invalidate it. */
/**
 * Whether a finished round may move on by itself. Open help only holds it: once help is closed the round goes on;
 * a pause the child chose (`paused`) is the only one that lasts.
 */
export const advanceAllowed = (s: { ready: boolean; paused: boolean; visible: boolean; helpOpen: boolean }) => s.ready && !s.paused && s.visible && !s.helpOpen;
export class RoundAdvance {
 private timer:ReturnType<typeof setTimeout>|undefined;
 private version=0;
 cancel(){this.version++;clearTimeout(this.timer);this.timer=undefined;}
 schedule(action:()=>void,delay:number){this.cancel();const ticket=this.version;this.timer=setTimeout(()=>{this.timer=undefined;if(ticket===this.version)action();},delay);}
}
