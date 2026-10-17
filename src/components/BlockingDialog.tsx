import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {useModalLayer} from '../lib/modalLayer';
/** Native top layer makes the background inert and keeps keyboard focus inside. */
export function BlockingDialog({children,className,label,onClose}:{children:ReactNode;className:string;label:string;onClose?:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useModalLayer();
 useLayoutEffect(()=>{
  const previous=document.activeElement as HTMLElement|null,el=dialog.current;
  el?.showModal();
  return()=>{el?.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
 return <dialog ref={dialog} className={`blocking-dialog ${className}`} aria-label={label} onCancel={e=>{e.preventDefault();onClose?.();}} onClick={e=>{if(e.target===e.currentTarget)onClose?.();}}>{children}</dialog>;
}
