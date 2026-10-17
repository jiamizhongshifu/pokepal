import {useLayoutEffect,useSyncExternalStore} from 'react';
const owners=new Set<symbol>();
const listeners=new Set<()=>void>();
const publish=()=>listeners.forEach(fn=>fn());
export const modalIsOpen=()=>owners.size>0;
export function useModalLayer(open=true){
 useLayoutEffect(()=>{
  if(!open)return;
  const id=Symbol();owners.add(id);publish();
  return()=>{owners.delete(id);publish();};
 },[open]);
}
export function useModalBlocked(){
 return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},modalIsOpen,()=>false);
}
