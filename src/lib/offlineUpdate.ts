import { useEffect, useRef, useState } from 'react';

export type ResourceProgress = { done:number; total:number; bytes:number; totalBytes:number };
export type OfflineSnapshot = { type:'POKE_OFFLINE_STATUS'; id:string; core:ResourceProgress; voice:ResourceProgress; error?:string };
export type UpdatePhase = 'checking'|'downloading'|'activating'|'reload'|'ready'|'error'|'unsupported';
export type UpdateState = { phase:UpdatePhase; title:string; detail:string; snapshot?:OfflineSnapshot; checkedAt?:number; stalled?:boolean; errorCode?:string };
const loadedBuild = import.meta.env.VITE_APP_BUILD_ID as string | undefined;
export const versionLabel = (id?:string) => id && !Number.isNaN(Date.parse(id)) ? new Date(id).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}) : '待确认';
export const loadedVersion = versionLabel(loadedBuild);
export function resourcesReady(s:OfflineSnapshot) {
  return !!s.core?.total && !!s.voice?.total && s.core.done===s.core.total && s.voice.done===s.voice.total;
}
function readWorker(worker:ServiceWorker):Promise<OfflineSnapshot> {
  return new Promise((resolve,reject)=>{
    const channel=new MessageChannel();
    const end=()=>{clearTimeout(timer);channel.port1.close();channel.port2.close();};
    const timer=setTimeout(()=>{end();reject(new Error('worker-timeout'));},20000);
    channel.port1.onmessage=e=>{end();resolve(e.data);};
    try {worker.postMessage({type:'POKE_OFFLINE_STATUS'},[channel.port2]);} catch(e){end();reject(e);}
  });
}

/** Observe the installing worker, not the previous release's shared voice index. */
export function useOfflineUpdate(open:boolean,native:boolean) {
  const [state,setState]=useState<UpdateState>({phase:'checking',title:'正在读取离线状态',detail:'正在连接本机的更新服务…'});
  const [checking,setChecking]=useState(false);
  const target=useRef<string>();
  const checkedAt=useRef<number>();
  const requested=useRef(false);
  const alive=useRef(true);
  const failure=useRef('');
  const reported=useRef('');
  const checkInFlight=useRef(false);
  const pendingWorker=useRef<ServiceWorker>();
  const progress=useRef({signature:'',at:Date.now()});
  const checkAbort=useRef<AbortController>();
  const refresh=useRef<()=>Promise<void>>(async()=>{});
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;checkAbort.current?.abort();};},[]);
  useEffect(()=>{
    if(!open)return;
    if(native){setState({phase:'ready',title:'安装包资源已就绪',detail:'模型、故事与火山配音已内置，无需首次联网下载。'});return;}
    if(!isSecureContext||!('serviceWorker' in navigator)||import.meta.env.DEV){
      setState({phase:'unsupported',title:'当前页面不能检查正式更新',detail:import.meta.env.DEV?'这是开发预览，请打开正式构建地址。':'请使用可信 HTTPS 地址，在 Safari 或 Chrome 中打开。'});return;
    }
    let stopped=false,busy=false,timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      if(stopped||busy)return;
      busy=true;
      try {
        if(checkInFlight.current)return;
        if(failure.current && !target.current)throw new Error(failure.current);
        const reg=await navigator.serviceWorker.getRegistration();
        if(reg?.installing)pendingWorker.current=reg.installing;
        if(pendingWorker.current?.state==='redundant'&&!reg?.installing&&!reg?.waiting){failure.current ||= 'install-failed';pendingWorker.current=undefined;}
        const worker=reg?.installing||reg?.waiting||reg?.active;
        if(!worker){if(Date.now()-progress.current.at>30000)throw new Error('worker-unavailable');if(!stopped)setState({phase:'checking',title:'正在准备更新服务',detail:'请保持页面打开；首次安装可能需要一点时间。'});return;}
        const snapshot=await readWorker(worker);
        if(stopped||checkInFlight.current)return;
        if(snapshot.error)throw new Error(snapshot.error);
        if(target.current&&snapshot.id!==target.current){
          if(failure.current && !reg?.installing && !reg?.waiting)throw new Error(failure.current);
          if(Date.now()-progress.current.at>60000){throw new Error('version-not-installed');}
          setState(prev=>({...prev,phase:'checking',title:'发现新版本，正在准备下载',detail:'正在启动新版本的资源安装…',snapshot:undefined}));return;
        }
        failure.current='';
        const ready=resourcesReady(snapshot);
        const installing=!!reg?.installing||!!reg?.waiting||worker.state!=='activated';
        const signature=JSON.stringify([snapshot.id,snapshot.core,snapshot.voice]);
        if(signature!==progress.current.signature)progress.current={signature,at:Date.now()};
        const stalled=Date.now()-progress.current.at>25000;
        const phase:UpdatePhase=!ready?'downloading':installing?'activating':snapshot.id!==loadedBuild?'reload':'ready';
        const titles={downloading:target.current&&target.current!==loadedBuild?'发现新版本，正在下载':'正在准备离线资源',activating:'下载完成，正在启用新版本',reload:'更新成功，重开即可使用',ready:requested.current?'已是最新版本':'离线资源已就绪'};
        const details={downloading:navigator.onLine?(stalled?'暂时没有新进度，请确认 Wi-Fi 和 Mac 服务可用；已完成的资源会保留。':'请保持页面打开、iPad 亮屏并连接 Wi-Fi。已缓存的资源会自动复用。'):'网络已断开，已完成的资源会保留。恢复连接后点击重新检查。',activating:'正在完成最后的安装，请稍候。',reload:'新资源已保存。点击下方“立即重开”载入新版本，宝可梦和学习进度不会被清空。',ready:requested.current?'本次检查未发现待安装的更新；当前版本与离线资源均已就绪。':'页面、模型和配音均已保存在此设备，可以离线使用。'};
        setState({phase,title:titles[phase],detail:details[phase],snapshot,checkedAt:checkedAt.current,stalled:!ready&&stalled});
      } catch (error) {
        if(!stopped&&!checkInFlight.current){
          const code=error instanceof Error?error.message:String(error);
          const slow=code==='worker-timeout';
          const detail=!navigator.onLine?'网络已断开。已下载的资源会保留，恢复 Wi-Fi 后可重试。'
            : /QuotaExceeded/i.test(code)?'iPad 可用存储不足，未能保存资源。请释放一些设备空间后重试，不必卸载游戏。'
            : slow?'更新服务仍在忙，暂时未读到进度；这不代表下载失败。页面会继续检查，也可以稍后重试。'
            : /HTTP|Incomplete|hash mismatch|DownloadError|Abort|Timeout/i.test(code)?'有资源未下载完整。已完成的分包会复用，点击重试可接着下载。'
            : '未能完成版本检查或安装。请保持 iPad 与 Mac 在同一 Wi-Fi，点击重试；不会清除宝可梦和学习记录。';
          setState(prev=>({...prev,phase:slow?'downloading':'error',stalled:slow,title:slow?'正在等待更新进度':navigator.onLine?'更新暂未完成':'当前处于离线状态',detail,errorCode:code.slice(0,200),checkedAt:checkedAt.current}));
          if(!slow&&code!==reported.current){reported.current=code;void fetch('/__ipad/update-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:'ipad-update-1',release:target.current||loadedBuild,phase:'page-error',error:code.slice(0,600)}),signal:AbortSignal.timeout(5000)}).catch(()=>{});}
        }

      } finally {busy=false;if(!stopped)timer=setTimeout(poll,1200);}
    };
    refresh.current=async()=>{clearTimeout(timer);await poll();};
    const onMessage=(event:MessageEvent)=>{
      const data=event.data as OfflineSnapshot;
      if(data?.type==='POKE_OFFLINE_STATUS'&&data.error&&(!target.current||data.id===target.current)) {failure.current=data.error;void refresh.current();}
    };
    navigator.serviceWorker.addEventListener('message',onMessage);
    void poll();
    return ()=>{stopped=true;clearTimeout(timer);navigator.serviceWorker.removeEventListener('message',onMessage);};
  },[open,native]);

  const check=async()=>{
    if(checkInFlight.current)return;
    checkInFlight.current=true;pendingWorker.current=undefined;
    requested.current=true;failure.current='';reported.current='';target.current=undefined;checkedAt.current=undefined;
    setChecking(true);setState(prev=>({...prev,phase:'checking',title:'正在检查新版本',detail:'正在连接 Mac，比较当前版本与可用版本…',checkedAt:undefined}));
    const abort=new AbortController();checkAbort.current=abort;
    const timeout=setTimeout(()=>abort.abort(),45000);
    try {
      const response=await fetch('/offline-release.json?check='+Date.now(),{cache:'no-store',signal:abort.signal});
      if(!response.ok)throw new Error('release-unavailable');
      const release=await response.json();if(typeof release.id!=='string'||!Array.isArray(release.assets))throw new Error('invalid-release');
      target.current=release.id;
      const reg=await navigator.serviceWorker.getRegistration()||await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
      if(abort.signal.aborted)throw new Error('check-timeout');
      // update() resolves after checking the script, not after the resources finish installing.
      await Promise.race([reg.update(),new Promise((_,reject)=>abort.signal.addEventListener('abort',()=>reject(new Error('check-timeout')),{once:true}))]);
      if(reg.installing)pendingWorker.current=reg.installing;
      else if(reg.active)reg.active.postMessage({type:'POKE_OFFLINE_RETRY'});
      checkedAt.current=Date.now();progress.current={signature:'',at:Date.now()};
    } catch(error) {failure.current=error instanceof Error?error.message:'check-failed';}
    finally {clearTimeout(timeout);checkInFlight.current=false;if(alive.current){setChecking(false);await refresh.current();}}
  };
  const total=(state.snapshot?.core.totalBytes??0)+(state.snapshot?.voice.totalBytes??0);
  const done=(state.snapshot?.core.bytes??0)+(state.snapshot?.voice.bytes??0);
  return {state,check,checking,percent:state.snapshot?.core.total&&state.snapshot?.voice.total&&total?Math.min(100,Math.floor(done/total*100)):null};
}
