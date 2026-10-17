export type TracePoint={x:number;y:number};
const distance=(a:TracePoint,b:TracePoint)=>Math.hypot(a.x-b.x,a.y-b.y);
function segmentDistance(p:TracePoint,a:TracePoint,b:TracePoint){
 const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
 const t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;
 return distance(p,{x:a.x+t*dx,y:a.y+t*dy});
}
/** Ordered, generous tracing. A child may lift and resume at the next guide dot. */
export class TraceStroke {
 cursor=0;
 constructor(readonly points:TracePoint[]){}
 get progress(){return this.points.length?this.cursor/this.points.length:0;}
 get done(){return this.points.length>0&&this.cursor>=this.points.length;}
 get next(){return this.points[Math.min(this.cursor,this.points.length-1)];}
 canStart(p:TracePoint){return !this.done&&!!this.next&&distance(p,this.next)<=40;}
 advance(from:TracePoint,to:TracePoint){
  // Walk samples in order, including between sparse touch events. A backwards
  // stroke or a shortcut across a curve cannot fill the rest of the letter.
  while(this.cursor<this.points.length&&segmentDistance(this.points[this.cursor],from,to)<=40)this.cursor++;
  return this.done;
 }
}
