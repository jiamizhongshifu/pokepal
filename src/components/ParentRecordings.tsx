import { useEffect, useState } from 'react';
import { deleteDiary, deleteRecording, db, listRecordings, RECORDING_LIMIT, type Recording } from '../lib/db';
import type { DiaryEntry } from '../lib/diary';
import { playUrl } from '../lib/speech';
import { Icon } from '../icons';

const when = (at: number) => new Date(at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const extension = (b: Blob) => b.type.includes('mp4') ? 'm4a' : b.type.includes('ogg') ? 'ogg' : b.type.includes('wav') ? 'wav' : 'webm';
function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Delete asks twice on the same button: the first tap arms it, the second within a few seconds removes. */
function useConfirm() {
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(null), 6000); return () => clearTimeout(t); }, [armed]);
  return { armed, ask: (key: string) => { if (armed === key) { setArmed(null); return true; } setArmed(key); return false; } };
}

/** Follow-along clips: kept on this device only, newest 60, each can be played, saved by the parent or deleted. */
export function ParentRecordings({ onCount }: { onCount?: (n: number) => void }) {
  const [recs, setRecs] = useState<Recording[]>([]), [status, setStatus] = useState('');
  const confirm = useConfirm();
  const refresh = () => listRecordings().then(r => { setRecs(r); onCount?.(r.length); }).catch(() => setStatus('暂时读不到录音，原有录音没有改动。'));
  useEffect(() => { void refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = async (r: Recording) => {
    if (!confirm.ask(`rec-${r.id}`)) return;
    try { await deleteRecording(r.id!); setStatus(`已删除 ${r.phrase}（${when(r.createdAt)}）。`); await refresh(); }
    catch { setStatus('没有删掉，录音还在。可以稍后再试。'); }
  };
  return <div className="parent-recordings">
    <p className="muted">跟读时检测到声音会自动保存在本机，最多保留最近 {RECORDING_LIMIT} 段，超出时自动删掉最早的一段。不上传，也不做发音评分。</p>
    {recs.length === 0 && <p className="muted">还没有录音。点“我说完啦”不一定产生录音。</p>}
    <ul className="parent-media-list">{recs.map(r => <li key={r.id}>
      <button className="btn-small" onClick={() => { const u = URL.createObjectURL(r.blob); void playUrl(u).then(() => URL.revokeObjectURL(u)); }}><Icon name="play" size={22} /><b lang="en">{r.phrase}</b><small>{when(r.createdAt)}</small></button>
      <button className="btn-small" onClick={() => saveFile(r.blob, `跟读-${r.phrase.replace(/[^\w]+/g, '')}-${r.createdAt}.${extension(r.blob)}`)}>保存到设备</button>
      <button className={`btn-small${confirm.armed === `rec-${r.id}` ? ' is-armed' : ''}`} onClick={() => void remove(r)}>{confirm.armed === `rec-${r.id}` ? '再点一次删除' : '删除'}</button>
    </li>)}</ul>
    <p role="status" className="parent-media-status">{status}</p>
  </div>;
}

/** Diaries stay until a parent deletes them here, clears all local data, or the browser clears site data. */
export function ParentDiaries() {
  const [list, setList] = useState<DiaryEntry[]>([]), [status, setStatus] = useState('');
  const confirm = useConfirm();
  const refresh = () => db.diaries.orderBy('createdAt').reverse().toArray().then(setList).catch(() => setStatus('暂时读不到日记，原有日记没有改动。'));
  useEffect(() => { void refresh(); }, []);
  const remove = async (d: DiaryEntry) => {
    if (!confirm.ask(`diary-${d.id}`)) return;
    try { await deleteDiary(d.id); setStatus(`已删除 ${when(d.createdAt)} 的日记（文字和原声）。`); await refresh(); }
    catch { setStatus('没有删掉，日记还在。可以稍后再试。'); }
  };
  const voices = (d: DiaryEntry) => (d.audio ? 1 : 0) + (d.answers?.filter(a => a.audio).length ?? 0);
  return <div className="parent-diaries">
    <p className="muted">小日记的文字和原声没有数量上限，会一直留在本机，直到在这里删除、清空本机数据或浏览器清除网站数据。删除前可以先用上面的备份保存。</p>
    {list.length === 0 && <p className="muted">还没有日记。</p>}
    <ul className="parent-media-list">{list.map(d => <li key={d.id}>
      <span><b>{d.title || when(d.createdAt)}</b><small>{when(d.createdAt)} · {voices(d)} 段原声</small></span>
      <button className={`btn-small${confirm.armed === `diary-${d.id}` ? ' is-armed' : ''}`} onClick={() => void remove(d)}>{confirm.armed === `diary-${d.id}` ? '再点一次删除' : '删除这篇'}</button>
    </li>)}</ul>
    <p role="status" className="parent-media-status">{status}</p>
  </div>;
}
