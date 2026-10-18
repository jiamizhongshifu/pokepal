import { useGame } from '../store';
import { Icon } from '../icons';

export function SaveRecovery(){
 const issue=useGame(s=>s.saveIssue),busy=useGame(s=>s.saveBusy),retry=useGame(s=>s.retrySave);
 const title=issue==='busy'?'游戏已在另一个窗口打开':issue==='conflict'?'另一窗口更新了进度':issue==='write'?'进度还没有保存好':'暂时没能读取进度';
 const detail=issue==='busy'?'请关闭另一个游戏窗口，再点下面的按钮继续。':issue==='conflict'?'请关闭其他游戏窗口，重新读取最新进度后继续。':issue==='write'?'这次的进度还保留在当前页面。请先不要关闭应用，腾出一些设备空间后重试。':'原有存档没有被清空。请重试读取；仍无法打开时，请让家长帮忙检查。';
 return <div className="screen save-recovery"><Icon name="heart" size={64}/><h1>{title}</h1><p role="status">{detail}</p><button className="btn-big" disabled={busy} onClick={()=>void retry()}>{busy?'正在处理…':issue==='write'?'重试保存':issue==='busy'?'继续游戏':'重新读取进度'}</button><a href="/feedback/" target="_blank" rel="noopener noreferrer">家长联系与反馈</a></div>;
}
