/** Bound every browser/network await, including Safari's service-worker lookup. */
export async function checkOnlineUpdate({loadedBuild,fetcher=fetch,workers,signal,onPreparing=()=>{},timeoutMs=25000}:{
 loadedBuild:string;fetcher?:typeof fetch;workers?:Pick<ServiceWorkerContainer,'getRegistration'>;signal?:AbortSignal;onPreparing?:(id:string)=>void;timeoutMs?:number;
}):Promise<{id:string;changed:boolean}>{
 const controller=new AbortController();
 const cancel=()=>controller.abort();
 if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(cancel,timeoutMs);
 const bounded=<T>(task:()=>Promise<T>)=>new Promise<T>((resolve,reject)=>{
  const abort=()=>{cleanup();reject(new Error('update-timeout'));};
  const cleanup=()=>controller.signal.removeEventListener('abort',abort);
  if(controller.signal.aborted){abort();return;}
  controller.signal.addEventListener('abort',abort,{once:true});
  Promise.resolve().then(()=>{if(controller.signal.aborted)throw new Error('update-timeout');return task();}).then(v=>{cleanup();resolve(v);},e=>{cleanup();reject(e);});
 });
 try{
  const response=await bounded(()=>fetcher(`/release.json?check=${Date.now()}`,{cache:'no-store',signal:controller.signal}));
  if(!response.ok)throw new Error('release-unavailable');
  const release=await bounded(()=>response.json());
  if(typeof release?.id!=='string'||release.mode!=='online'||!Number.isFinite(Date.parse(release.id)))throw new Error('invalid-release');
  const changed=release.id!==loadedBuild;
  if(!changed)return {id:release.id,changed:false};
  onPreparing(release.id);
  const reg=await bounded(()=>workers?.getRegistration()??Promise.resolve(undefined));
  if(reg){
   await bounded(()=>reg.update());
   const worker=reg.installing??reg.waiting;
   if(worker)await new Promise<void>((resolve,reject)=>{
    const cleanup=()=>{worker.removeEventListener('statechange',inspect);controller.signal.removeEventListener('abort',abort);};
    const abort=()=>{cleanup();reject(new Error('update-timeout'));};
    const inspect=()=>{if(worker.state==='activated'){cleanup();resolve();}else if(worker.state==='redundant'){cleanup();reject(new Error('update-failed'));}else if(worker.state==='installed'){try{worker.postMessage({type:'SKIP_WAITING'});}catch{cleanup();reject(new Error('update-failed'));}}};
    if(controller.signal.aborted){abort();return;}
    controller.signal.addEventListener('abort',abort,{once:true});worker.addEventListener('statechange',inspect);inspect();
   });
  }
  return {id:release.id,changed:true};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
// These paths bypass the navigation fallback in already-published online workers.
// Same origin and storage: do not unregister workers or delete IndexedDB/caches.
export function onlineUpdateEntry(){return `/release-entry.html?update=${Date.now()}`;}
