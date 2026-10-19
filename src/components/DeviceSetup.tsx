import {checkOnlineUpdate,onlineUpdateEntry} from '../lib/onlineUpdate';
import { Icon } from '../icons';
import { useEffect, useRef, useState } from 'react';
import { say, unlockAudio } from '../lib/speech';
import './device-setup.css';
import { viewportReport, requestGameFullscreen } from '../lib/viewport';
import { useOfflineUpdate, loadedVersion, versionLabel } from '../lib/offlineUpdate';
import { cameraReport, cameraSummary } from '../lib/cameraDiagnostics';
import { Capacitor } from '@capacitor/core';

type InstallPrompt = Event & { prompt(): Promise<unknown>; userChoice: Promise<{outcome:string}> };
let installPrompt: InstallPrompt | undefined;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event as InstallPrompt;
  window.dispatchEvent(new Event('pokepal-install-ready'));
});
window.addEventListener('appinstalled', () => {
  installPrompt = undefined;
  window.dispatchEvent(new Event('pokepal-install-ready'));
});

const mb=(bytes:number)=> (bytes/1024/1024).toFixed(1);

export function DeviceSetup({initiallyOpen=false,compactTools=false}:{initiallyOpen?:boolean;compactTools?:boolean}) { return import.meta.env.VITE_ONLINE ? <OnlineSetup initiallyOpen={initiallyOpen}/> : <OfflineSetup initiallyOpen={initiallyOpen} compactTools={compactTools}/>; }
function OnlineSetup({initiallyOpen}:{initiallyOpen:boolean}){
 const [phase,setPhase]=useState<'idle'|'checking'|'preparing'|'ready'|'latest'|'error'>('idle');
 const [target,setTarget]=useState('');
 const inFlight=useRef(false),pending=useRef<AbortController>();
 useEffect(()=>()=>pending.current?.abort(),[]);
 const busy=phase==='checking'||phase==='preparing';
 const titles={idle:'让小岛准备好',checking:'正在寻找新版本',preparing:'正在整理新页面',ready:'准备好啦，重新出发',latest:'已经是最新版本',error:'这次没连上，再试一次'};
 const check=async()=>{
  if(inFlight.current)return;inFlight.current=true;setPhase('checking');
  try{
   const controller=new AbortController();pending.current=controller;
   const {id,changed}=await checkOnlineUpdate({loadedBuild:import.meta.env.VITE_APP_BUILD_ID,workers:navigator.serviceWorker,signal:controller.signal,onPreparing:id=>{setTarget(versionLabel(id));setPhase('preparing');}});
   if(controller.signal.aborted)return;
   setTarget(versionLabel(id));
   setPhase(changed?'ready':'latest');
  }catch{if(!pending.current?.signal.aborted)setPhase('error');}finally{inFlight.current=false;}
 };
 return <details className="device-setup" open={initiallyOpen||undefined}><summary><Icon name="refresh" size={28}/>网页体验与更新 <small>家长使用</small></summary><div className="device-setup-body">
  <section className={`offline-update online-update is-${phase}`} aria-label="更新进度" aria-busy={busy}>
   <div className="offline-update-heading"><span className="offline-update-symbol"><Icon name={phase==='ready'||phase==='latest'?'check':phase==='error'?'cloud':'island'} size={48}/></span><div><strong role="status">{titles[phase]}</strong><small>当前版本 {loadedVersion}{target&&target!==loadedVersion?` → ${target}`:''}</small></div></div>
   {busy&&<progress aria-label={titles[phase]}/>}
   <ol className="offline-update-steps"><li className={phase==='checking'?'current':phase==='idle'||phase==='error'?'':'finished'}><Icon name="search" size={28}/>找一找</li><li className={phase==='preparing'?'current':phase==='ready'||phase==='latest'?'finished':''}><Icon name="island" size={28}/>准备小岛</li><li className={phase==='ready'||phase==='latest'?'finished':''}><Icon name="check" size={28}/>准备好了</li></ol>
   <p className="offline-update-detail">{phase==='error'?'检查未完成，可能是网络或浏览器更新服务暂时无响应。可重试，或点“打开新版入口”；不会清除本机存档。':phase==='ready'?'新页面已准备好，点下面的按钮进入。':'资源会在游玩时下载。更新保留本机的宝可梦、学习进度和日记。'}</p>
   <div className="offline-update-actions">{phase==='ready'?<button className="offline-update-reopen" onClick={()=>location.assign(onlineUpdateEntry())}><Icon name="play" size={28}/>打开新版本</button>:<button disabled={busy} onClick={()=>void check()}><Icon name="refresh" size={28}/>{busy?'正在准备…':phase==='error'?'再试一次':'检查更新'}</button>}{phase==='error'&&<button className="offline-update-reopen" onClick={()=>location.assign(onlineUpdateEntry())}>打开新版入口</button>}</div>
  </section>
  <details className="update-parent-notes"><summary>家长小贴士</summary><p>保持联网即可游玩，可以通过浏览器菜单添加到主屏幕。网页版不提供完整离线安装。</p><p>存档和日记录音保存在当前浏览器；更换网址或清除网站数据前，请在家长中心分别导出游戏存档、备份日记与原声，并另存需要保留的跟读录音。</p></details>
 </div></details>;
}
function OfflineSetup({initiallyOpen,compactTools}:{initiallyOpen:boolean;compactTools:boolean}) {
  const [open,setOpen] = useState(initiallyOpen);
  useEffect(()=>{if(initiallyOpen)setOpen(true);},[initiallyOpen]);
  const panel=useRef<HTMLDetailsElement>(null);
  const [persisted,setPersisted] = useState(false);
  const [canInstall,setCanInstall] = useState(!!installPrompt);
  const [note,setNote] = useState('');
  const [displayReport,setDisplayReport] = useState('');
  const native=Capacitor.isNativePlatform();
  const {state,check,checking,percent}=useOfflineUpdate(open,native);
  const busy=checking||state.phase==='checking'||state.phase==='activating'||(state.phase==='downloading'&&!state.stalled&&navigator.onLine);
  const complete=state.phase==='ready'||state.phase==='reload';
  const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || !!(navigator as Navigator & {standalone?:boolean}).standalone;
  const ipad = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  useEffect(()=>{
    const update=()=>setCanInstall(!!installPrompt);
    window.addEventListener('pokepal-install-ready',update);
    return ()=>window.removeEventListener('pokepal-install-ready',update);
  },[]);
  useEffect(()=>{
    if(open){
      const frame=initiallyOpen?0:requestAnimationFrame(()=>panel.current?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
      void navigator.storage?.persisted?.().then(setPersisted).catch(()=>{});
      return ()=>cancelAnimationFrame(frame);
    }
  },[open]);
  const install=async()=>{
    const prompt=installPrompt;
    if(!prompt)return;
    installPrompt=undefined;setCanInstall(false);
    try {await prompt.prompt();const result=await prompt.userChoice;setNote(result.outcome==='accepted'?'安装已确认，请从主屏幕打开并检查离线状态。':'可以稍后再安装。');}
    catch {setNote('请使用浏览器菜单中的“安装应用”或“添加到主屏幕”。');}
  };
  const keep=async()=>{
    try{const granted=await navigator.storage?.persist?.();setPersisted(!!granted);setNote(granted?'浏览器已允许持久保存。重要存档仍建议在家长中心导出备份。':'浏览器暂未允许持久保存；请保留足够空间并定期导出存档。');}
    catch{setNote('此浏览器未提供持久保存，请在家长中心导出存档备份。');}
  };
  const deviceTools=<>
      <p className="device-capabilities">麦克风接口：{typeof navigator.mediaDevices?.getUserMedia==='function'?'可用，跟读时请求授权':'当前不可用，可用手动确认跟读'}<br/>存储保护：{native?'保存在此应用中；卸载前请导出存档':persisted?'已启用':'由浏览器管理'}</p>
      <div className="device-actions">
        {ipad&&!native&&document.fullscreenEnabled&&<button onClick={async()=>setNote(await requestGameFullscreen()?'已进入系统全屏，请观察底部白边，再点“检查屏幕适配”。':'当前系统未开放网页全屏；已保留兼容显示模式，请点“检查屏幕适配”。')}>全屏显示</button>}
        {!native&&<button onClick={async()=>{
          const report=viewportReport();
          setDisplayReport(JSON.stringify(report,null,2));
          try {
            const response=await fetch('/__ipad/display-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
            setNote(response.ok?'屏幕诊断已发送到这台 Mac，可继续排查白边。':'诊断已显示在下方，请把数值发给我。');
          } catch {setNote('诊断已显示在下方，请把数值发给我。');}
        }}>检查屏幕适配</button>}
        {!native&&<button onClick={async()=>{
          const report=cameraReport();setDisplayReport(JSON.stringify(report,null,2));
          const summary=cameraSummary();
          try{const response=await fetch('/__ipad/camera-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report),signal:AbortSignal.timeout(8000)});setNote(summary+(response.ok?' 镜头诊断已发送到 Mac。':' 诊断显示在下方，尚未发送。'));}
          catch{setNote(summary+' 诊断显示在下方，未连接到 Mac。');}
        }}>检查观察镜头</button>}
        {canInstall&&!standalone&&!native&&<button onClick={install}>安装到主屏幕</button>}
        <button onClick={async()=>{unlockAudio();const ok=await say(['en',"Hello! I'm Pikachu!"],['zh','你好，我是皮卡丘！']);setNote(ok?'配音播放已完成，请确认设备扬声器能听到中英文。':'配音未播放成功，请等待下载完成后重试。');}}>试听中英配音</button>
        {!native&&<button onClick={keep}>保留离线资料</button>}

      </div>
      {note&&<p role="status">{note}</p>}
      {displayReport&&<pre className="device-display-report">{displayReport}</pre>}
      <small>{native?'更新时安装同一签名的新版本即可。请不要先卸载；卸载会清除本机进度和录音。':'安卓 USB 测试地址需要先通过电脑转发。请等资源就绪，再拔线测试；拔线后要下载更新时需重新连接。存档只在当前设备与网址保存。'}</small>
  </>;
  return <details ref={panel} className="device-setup" open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary><Icon name="refresh" size={28}/>安装与离线准备 <small>家长使用</small></summary>
    <div className="device-setup-body">
      <p>{native?'正在运行安卓安装包。':standalone?'正在以主屏幕应用运行。':ipad?'iPad：请用 Safari 打开，选择“分享 → 添加到主屏幕”，再从图标启动。':'安卓：请用 Chrome 打开，在菜单选择“安装应用”或“添加到主屏幕”。部分学习机不提供此入口。'}</p>
      <section className={`offline-update is-${state.phase}`} aria-label="更新进度" aria-busy={busy}>
        <div className="offline-update-heading">
          <span className="offline-update-symbol" aria-hidden="true"><Icon name={complete?'check':state.phase==='error'?'cloud':'refresh'} size={42}/></span>
          <div><strong role={state.phase==='error'?'alert':'status'}>{state.title}</strong><small>当前版本 {loadedVersion}{state.snapshot&&versionLabel(state.snapshot.id)!==loadedVersion?` → 新版本 ${versionLabel(state.snapshot.id)}`:''}</small></div>
          {percent!==null&&state.phase!=='checking'&&<b className="offline-update-percent">{percent}<small>%</small></b>}
        </div>
        {!native&&state.phase!=='unsupported'&&<>
          <progress aria-label="离线资源准备进度" max={100} value={state.phase==='checking'||percent===null?undefined:percent}/>
          <ol className="offline-update-steps" aria-label="更新步骤"><li className={state.phase==='checking'?'current':'finished'}><Icon name="search" size={28}/>找一找</li><li className={state.phase==='downloading'?'current':complete||state.phase==='activating'?'finished':''}><Icon name="island" size={28}/>准备小岛</li><li className={complete?'finished':state.phase==='activating'?'current':''}><Icon name="check" size={28}/>准备好了</li></ol>
          {state.snapshot&&<div className="offline-update-resources">
            {([['页面与模型',state.snapshot.core],['火山配音',state.snapshot.voice]] as const).map(([label,item])=><div key={label}><span>{label}</span><b>{item.total?`${item.done.toLocaleString()} / ${item.total.toLocaleString()}${label==='火山配音'?' 包':' 项'}`:'正在读取清单…'}</b>{item.total>0&&<small>{mb(item.bytes)} / {mb(item.totalBytes)} MB</small>}</div>)}
          </div>}
        </>}
        <p className="offline-update-detail">{state.detail}</p>
        {state.errorCode&&<small className="offline-update-time">诊断：{state.errorCode}</small>}
        {state.checkedAt&&<small className="offline-update-time">最近检查：{new Date(state.checkedAt).toLocaleTimeString('zh-CN',{hour12:false})}</small>}
        {!native&&state.phase!=='unsupported'&&<div className="offline-update-actions">
          {state.phase==='reload'&&<button className="offline-update-reopen" onClick={()=>location.reload()}><Icon name="play" size={28}/>立即重开，使用新版本</button>}
          <button onClick={()=>void check()} disabled={busy}><Icon name="refresh" size={26}/>{checking||state.phase==='checking'?'正在检查…':busy?'正在更新…':state.phase==='error'||state.stalled?'重试更新':'重新检查'}</button>
        </div>}
      </section>
      {compactTools?<details className="update-parent-notes"><summary>设备检查与安装帮助</summary>{deviceTools}</details>:deviceTools}
    </div>
  </details>;
}
