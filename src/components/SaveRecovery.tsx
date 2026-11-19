import { useEffect, useState } from 'react';
import { useGame } from '../store';
import { readSaveSnapshot } from '../lib/db';
import { diagnosticText, downloadJson, exportableSave, storageFacts, type StorageFacts } from '../lib/saveExport';
import { Icon } from '../icons';

export function SaveRecovery(){
 const issue=useGame(s=>s.saveIssue),busy=useGame(s=>s.saveBusy),retry=useGame(s=>s.retrySave);
 const [facts,setFacts]=useState<StorageFacts>({}),[note,setNote]=useState('');
 useEffect(()=>{void storageFacts().then(setFacts);},[issue]);
 const exportNow=async()=>{
  try{
   if(issue==='write'){downloadJson(exportableSave(useGame.getState().save),`pokepal-save-unsaved-${Date.now()}.json`);setNote('已导出当前页面里的进度。空间腾出后可以先重试保存；仍不行时，可在家长中心“导入存档”。');}
   else{const raw=(await readSaveSnapshot()).save;if(raw===undefined){setNote('本机没有找到原有存档。');return;}downloadJson(exportableSave(raw),`pokepal-save-unreadable-${Date.now()}.json`);setNote('已导出原有存档的原样内容，方便排查；它没能通过检查，不能直接导入。原存档仍留在本机。');}
  }catch{setNote('没能导出，原有存档没有改动。');}
 };
 const title=issue==='busy'?'游戏已在另一个窗口打开':issue==='conflict'?'另一窗口更新了进度':issue==='write'?'进度还没有保存好':'暂时没能读取进度';
 const detail=issue==='busy'?'请关闭另一个游戏窗口，再点下面的按钮继续。':issue==='conflict'?'请关闭其他游戏窗口，重新读取最新进度后继续。':issue==='write'?'这次的进度还保留在当前页面。请先不要关闭应用，腾出一些设备空间后重试。':'原有存档没有被清空。请重试读取；仍无法打开时，请让家长帮忙检查。';
 return <div className="screen save-recovery"><Icon name="heart" size={64}/><h1>{title}</h1><p role="status">{detail}</p><button className="btn-big" disabled={busy} onClick={()=>void retry()}>{busy?'正在处理…':issue==='write'?'重试保存':issue==='busy'?'继续游戏':'重新读取进度'}</button>{(issue==='write'||issue==='load')&&<details className="save-recovery-parent"><summary>给大人：先把进度导出保管</summary><p>导出的文件不含录音、日记和头像照片，只保存在你选择的位置。</p><button className="btn-small" onClick={()=>void exportNow()}>{issue==='write'?'导出还没保存的进度':'导出原有存档（排查用）'}</button><p role="status">{note}</p><p className="save-recovery-diagnostic">{diagnosticText(issue,facts)}</p></details>}<a href="/feedback/" target="_blank" rel="noopener noreferrer">家长联系与反馈</a></div>;
}
