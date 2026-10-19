import {trafficPage} from './analyticsPolicy';
import {TRAFFIC_ENDPOINT,TRAFFIC_PREFERENCE_KEY,trafficAvailable,trafficEnabled} from './trafficPolicy';
const CHANGE='pokepal-traffic-change';
let previous='',timer:ReturnType<typeof setTimeout>|undefined,blocked=false;
const pending=new Map<string,number>();
const inFlight=new Set<AbortController>();
export function aggregateAvailable(){return trafficAvailable(!!import.meta.env.VITE_ONLINE,location.hostname);}
export function aggregateEnabled(){try{return !blocked&&trafficEnabled(localStorage,navigator as Navigator&{globalPrivacyControl?:boolean});}catch{return false;}}
function discard(){clearTimeout(timer);timer=undefined;pending.clear();for(const c of inFlight)c.abort();inFlight.clear();}
export function setAggregateEnabled(enabled:boolean){
 blocked=!enabled;
 try{localStorage.setItem(TRAFFIC_PREFERENCE_KEY,enabled?'0':'1');}catch{blocked=true;discard();window.dispatchEvent(new Event(CHANGE));return false;}
 if(!enabled)discard();
 window.dispatchEvent(new Event(CHANGE));return true;
}
export function subscribeAggregate(listener:()=>void){
 window.addEventListener(CHANGE,listener);
 const storage=(e:StorageEvent)=>{if(e.key===TRAFFIC_PREFERENCE_KEY||e.key===null){blocked=false;if(!aggregateEnabled())discard();listener();}};
 window.addEventListener('storage',storage);return()=>{window.removeEventListener(CHANGE,listener);window.removeEventListener('storage',storage);};
}
export function flushTraffic(){
 clearTimeout(timer);timer=undefined;
 if(!aggregateAvailable()||!aggregateEnabled()){discard();return;}
 if(!pending.size)return;
 const body=JSON.stringify({pages:[...pending].map(([page,count])=>({page,count}))});pending.clear();
 const controller=new AbortController();inFlight.add(controller);
 const timeout=setTimeout(()=>controller.abort(),8000);
 // Deliberately no retries, cookies, referrer, persistent queue or visitor identifier.
 void fetch(TRAFFIC_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true,signal:controller.signal})
  .catch(()=>{}).finally(()=>{clearTimeout(timeout);inFlight.delete(controller);});
}
export function recordAggregatePage(page:string){
 if(!trafficPage(page)||page===previous)return;
 previous=page;
 if(!aggregateAvailable()||!aggregateEnabled())return;
 pending.set(page,Math.min(20,(pending.get(page)??0)+1));
 timer??=setTimeout(flushTraffic,5000);
}
export function initializeAggregate(){
 const hidden=()=>{if(document.hidden)flushTraffic();};
 const unsubscribe=subscribeAggregate(()=>{if(!aggregateEnabled())discard();});
 document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',flushTraffic);
 return()=>{discard();unsubscribe();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',flushTraffic);};
}
