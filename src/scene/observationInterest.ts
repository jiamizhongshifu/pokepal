/** One-shot interest cues; never changes the idle timer or takes input ownership. */
const interest=new Map<number,number>();
export function markInteresting(ids:number[]){const at=performance.now();for(const id of ids)interest.set(id,at);}
export function observationInterest(id:number){const at=interest.get(id);return at!==undefined&&performance.now()-at<120000?at:undefined;}
