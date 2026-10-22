import {useEffect,useRef,useState} from 'react';
import {loadSupport} from '../lib/supportChatClient';

export function ParentLiveChat() {
  const token=import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN as string|undefined;
  const [status,setStatus]=useState<'idle'|'loading'|'error'>('idle');
  const trigger=useRef<HTMLButtonElement>(null);
  const openedFromTrigger=useRef(false);
  useEffect(()=>{const closed=()=>{if(openedFromTrigger.current)requestAnimationFrame(()=>trigger.current?.focus());openedFromTrigger.current=false;};window.addEventListener('chatwoot:closed',closed);return()=>window.removeEventListener('chatwoot:closed',closed);},[]);
  if(!token||!/^[a-zA-Z0-9_-]{16,128}$/.test(token))return null;
  return <section><h2>和我们聊聊</h2>
    <p>仅供家长使用。点击后连接 Chatwoot 客服，发送的消息与必要的浏览器信息会由该服务处理；不会读取小岛存档、照片或录音。请勿提供孩子的个人信息。</p>
    <p className="ps-muted">离线时也可留言，请用同一浏览器返回查看回复。聊天记录保留 30 天；邮件联系方式仍在上方。</p>
    <button type="button" className="ps-primary" ref={trigger} disabled={status==='loading'} aria-busy={status==='loading'} onClick={async()=>{
      setStatus('loading');
      openedFromTrigger.current=true;
      try{const widget=await loadSupport({baseUrl:'https://app.chatwoot.com',websiteToken:token},'zh-CN');widget.toggle('open');setStatus('idle');}catch{openedFromTrigger.current=false;setStatus('error');}
    }}>{status==='loading'?'正在连接…':status==='error'?'重试在线客服':'联系在线客服'}</button>
    {status==='error'&&<p role="alert">暂时无法连接，请重试或使用本页的邮件、微信联系方式。</p>}
  </section>;
}
