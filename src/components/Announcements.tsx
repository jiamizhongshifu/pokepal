import {useModalLayer} from '../lib/modalLayer';
import { useEffect,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons';
import { checkNotices,markNoticesRead,useNotices } from '../lib/announcements';
import { loadedVersion,versionLabel } from '../lib/offlineUpdate';
import { stopSpeech } from '../lib/speech';
import { DeviceSetup } from './DeviceSetup';
import './announcements.css';
export function Announcements({welcome=false,active=true}:{welcome?:boolean;active?:boolean}){
 const {feed,unread,updateAvailable,error}=useNotices(active);
 const [open,setOpen]=useState(false),[checking,setChecking]=useState(false);
 useModalLayer(open);
 const dialog=useRef<HTMLDialogElement>(null),entry=useRef<HTMLButtonElement>(null);
 const close=()=>{dialog.current?.close();setOpen(false);entry.current?.focus();};
 useEffect(()=>{if(!active){dialog.current?.close();setOpen(false);}},[active]);
 useEffect(()=>{if(open){stopSpeech();dialog.current?.showModal();markNoticesRead();}return()=>dialog.current?.close();},[open]);
 // Only mark a newly fetched feed when it is actually visible in the open panel.
 useEffect(()=>{if(open)markNoticesRead();},[open,feed]);
 return <><button ref={entry} className={`notice-entry ${welcome?'welcome-notice':''}`} aria-label={`小岛公告${unread?'，有新消息':''}`} onClick={()=>{setOpen(true);void checkNotices(true);}}><Icon name="speaker" size={30}/><span>公告</span>{unread&&<i className="notice-dot" aria-hidden="true"/>}</button>
 {open&&createPortal(<dialog ref={dialog} className="notice-dialog" aria-labelledby="island-notice-heading" onCancel={close} onClick={e=>{if(e.target===dialog.current)close();}}><div className="notice-inner">
  <header><span className="notice-mail"><Icon name="speaker" size={48}/></span><div><h2 id="island-notice-heading">小岛来信啦</h2><p>和家人一起看看新发现</p></div><button autoFocus aria-label="关闭公告" onClick={close}><Icon name="close" size={28}/></button></header>
  <div className="notice-scroll"><p className="notice-version"><Icon name={updateAvailable?'refresh':'check'} size={28}/>{updateAvailable?`新版本 ${versionLabel(feed.build)} 已到达`:`当前版本 ${loadedVersion}`}</p>
  {feed.notes.map(note=><article key={note.id}><small>{note.date}</small><h3>{note.title}</h3>{note.items.map(item=><div className="notice-item" key={item.title}><Icon name={item.icon} size={44}/><div><strong>{item.title}</strong><p>{item.text}</p></div></div>)}</article>)}
  {error&&<p role="status">暂时没有连上公告站，先看看已保存的来信。</p>}
  <button className="notice-recheck" disabled={checking} onClick={async()=>{setChecking(true);await checkNotices(true);setChecking(false);}}><Icon name="refresh" size={24}/>{checking?'正在收信…':'看看有没有新消息'}</button>
  <DeviceSetup initiallyOpen={updateAvailable}/>
  </div>
 </div></dialog>,document.body)}</>;
}
