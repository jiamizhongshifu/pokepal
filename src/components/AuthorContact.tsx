import {trackInteraction} from '../lib/interaction';
import {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {PARENT_CONTACT} from '../data/parentContact';
import {Icon} from '../icons';
import {useModalLayer} from '../lib/modalLayer';
import {stopSpeech} from '../lib/speech';
import './author-contact.css';

export const SOURCE_REPOSITORY = 'https://github.com/jiamizhongshifu/pokepal';
const WECHAT_QR='/art/contact/wechat-author-v1.jpg';

export function SourceRepositoryLink() {
  return <a className="author-entry" onClick={()=>trackInteraction('source_repository_opened')} href={SOURCE_REPOSITORY} target="_blank" rel="noopener noreferrer" aria-label="开源仓库（新标签页）"><span className="source-symbol" aria-hidden="true">&lt;/&gt;</span><span>开源仓库</span></a>;
}

export function AuthorContact({active=true}:{active?:boolean}) {
  const [open,setOpen]=useState(false);
  const [status,setStatus]=useState('');
  const [qrUnavailable,setQrUnavailable]=useState(false);
  const heading=useId();
  const dialog=useRef<HTMLDialogElement>(null);
  const entry=useRef<HTMLButtonElement>(null);
  const wechat=useRef<HTMLInputElement>(null);
  const email=useRef<HTMLInputElement>(null);
  useModalLayer(open&&active);
  const close=()=>{dialog.current?.close();setOpen(false);entry.current?.focus();};
  useEffect(()=>{if(!active)setOpen(false);},[active]);
  useEffect(()=>{
    if(!open||!active)return;
    stopSpeech();
    const el=dialog.current;el?.showModal();
    return()=>el?.close();
  },[open,active]);
  const copy=async(kind:'wechat'|'email')=>{
    const label=kind==='wechat'?'微信号':'邮箱';
    try {await navigator.clipboard.writeText(PARENT_CONTACT[kind]);setStatus(`${label}已复制，可以粘贴使用。`);}
    catch {const field=(kind==='wechat'?wechat:email).current;field?.focus();field?.select();setStatus(`未能自动复制，已选中${label}，请长按或使用系统复制。`);}
  };
  return <>
    <button ref={entry} className="author-entry" aria-haspopup="dialog" aria-expanded={open&&active} onClick={e=>{e.stopPropagation();trackInteraction('author_contact_opened');setStatus('');setOpen(true);}}><Icon name="heart" size={26}/><span>联系作者</span></button>
    {open&&active&&createPortal(<dialog ref={dialog} className="author-dialog" aria-labelledby={heading} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{e.stopPropagation();if(e.target===dialog.current)close();}}>
      <header><div><small>给陪伴的家长</small><h2 id={heading}>联系作者 · {PARENT_CONTACT.operator}</h2></div><button autoFocus aria-label="关闭联系作者" onClick={close}><Icon name="close" size={26}/></button></header>
      <p>欢迎告诉我宝宝喜欢什么、哪里不太好用，或遇到的问题。</p>
      <div className="author-contact-body">
      <section className="author-wechat-qr" aria-label="扫码添加作者微信">
        <h3>微信扫一扫，添加好友</h3>
        {qrUnavailable?<p>二维码暂时没有加载出来，可以复制右侧或下方的微信号添加。</p>:<a className="author-qr-image" href={WECHAT_QR} target="_blank" rel="noopener noreferrer" aria-label="打开作者微信二维码原图（新标签页）"><img src={WECHAT_QR} width={888} height={1131} alt="钟师傅的微信好友二维码" onError={()=>setQrUnavailable(true)}/></a>}
        <p>另一台设备可直接扫码；同一台设备可保存图片，在微信扫一扫中从相册选择。</p>
        {!qrUnavailable&&<a className="author-qr-save" href={WECHAT_QR} download="钟师傅-微信二维码.jpg">保存二维码</a>}
      </section>
      <div className="author-contact-details">
      <div className="author-contact-row"><label>微信号<input ref={wechat} readOnly value={PARENT_CONTACT.wechat} aria-label="作者微信号" onFocus={e=>e.currentTarget.select()}/></label><button onClick={()=>void copy('wechat')}>复制微信号</button></div>
      <div className="author-contact-row"><label>邮箱<input ref={email} readOnly value={PARENT_CONTACT.email} aria-label="作者邮箱" onFocus={e=>e.currentTarget.select()}/></label><button onClick={()=>void copy('email')}>复制邮箱</button></div>
      <p className="author-copy-status" role="status">{status}</p>
      <div className="author-contact-actions"><a href={`mailto:${PARENT_CONTACT.email}?subject=${encodeURIComponent('宝可梦小小训练师 · 体验反馈')}`}>写邮件</a><a href="/feedback/" target="_blank" rel="noopener noreferrer">整理问题反馈 ↗</a></div>
      </div>
      </div>
      <p className="author-contact-note">请由家长联系。截图前请遮住孩子的姓名和照片，不需要提供孩子的录音、学校或住址。</p>
    </dialog>,document.body)}
  </>;
}
