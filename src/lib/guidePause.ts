// A mounted, open guide owns its pause. Closing one guide must not release another.
const owners=new Set<symbol>();
const listeners=new Set<()=>void>();
export const guideIsOpen=()=>owners.size>0;
export const subscribeGuides=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export function holdGuide(){
 const owner=Symbol();owners.add(owner);listeners.forEach(fn=>fn());
 return()=>{if(owners.delete(owner))listeners.forEach(fn=>fn());};
}
