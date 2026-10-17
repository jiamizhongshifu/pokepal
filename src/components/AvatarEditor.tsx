import {stopSpeech} from '../lib/speech';
import {useModalLayer} from '../lib/modalLayer';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AVATARS, Icon } from '../icons';
import { useGame } from '../store';
import { prepareAvatarPhoto } from '../lib/avatar';
import { TrainerAvatar } from './TrainerAvatar';
import './avatar-editor.css';

export function AvatarEditor({onClose}:{onClose:()=>void}) {
  useModalLayer();
  const trainer=useGame(s=>s.save.trainer);
  const setAvatar=useGame(s=>s.setTrainerAvatar);
  const [avatar,setChoice]=useState(trainer?.avatar ?? 'avatar-red');
  const [photo,setPhoto]=useState(trainer?.avatarPhoto);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  const library=useRef<HTMLInputElement>(null);
  const camera=useRef<HTMLInputElement>(null);
  const job=useRef(0);
  useEffect(()=>{
    stopSpeech();
    const el=dialog.current;
    el?.showModal();
    return ()=>{job.current++;el?.close();};
  },[]);
  const choose=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    const ticket=++job.current;
    setBusy(true);setError('');
    try { const result=await prepareAvatarPhoto(file);if(ticket===job.current)setPhoto(result); }
    catch(e){if(ticket===job.current)setError(e instanceof Error?e.message:'照片处理失败，请再试一次。');}
    finally {if(ticket===job.current)setBusy(false);}
  };
  return <dialog className="avatar-editor" ref={dialog} aria-labelledby="avatar-editor-title" onCancel={onClose}>
    <header><h2 id="avatar-editor-title">换个头像</h2><button className="avatar-editor-close" onClick={onClose} aria-label="取消更换头像"><Icon name="close" size={24}/></button></header>
    <div className="avatar-preview"><TrainerAvatar avatar={avatar} photo={photo} size={96}/></div>
    <p className="avatar-photo-hint">照片会居中裁成圆形</p>
    <div className="avatar-photo-actions">
      <button disabled={busy} onClick={()=>library.current?.click()}><Icon name="picture" size={44}/>选择照片</button>
      <button disabled={busy} onClick={()=>camera.current?.click()}><Icon name="camera" size={44}/>拍一张</button>
    </div>
    <input hidden ref={library} type="file" accept="image/*" onChange={choose} aria-label="从相册选择头像"/>
    <input hidden ref={camera} type="file" accept="image/*" capture="user" onChange={choose} aria-label="拍摄头像照片"/>
    <p className="avatar-preset-label">也可以选一位小训练师</p>
    <div className="avatar-presets">{AVATARS.map((a,i)=><button key={a} disabled={busy} aria-label={`选择${['红帽子','粉帽子','蓝帽子','黄帽子'][i]}头像`} aria-pressed={!photo&&avatar===a} onClick={()=>{setChoice(a);setPhoto(undefined);setError('');}}><Icon name={a} size={48}/></button>)}</div>
    {busy&&<p role="status">正在准备照片…</p>}
    {error&&<p className="avatar-error" role="alert">{error}</p>}
    <button className="avatar-save" disabled={busy} onClick={()=>{setAvatar(avatar,photo);onClose();}}><Icon name="check" size={28}/>就用这个</button>
    <p className="avatar-privacy">照片只保存在这台设备，不会上传。</p>
  </dialog>;
}
