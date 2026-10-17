import { useRef, useState } from 'react';
import { db } from '../lib/db';
import { decodeDiaryBackup, encodeDiaryBackup, downloadDiaryFile, DIARY_BACKUP_MAX_BYTES } from '../lib/diaryBackup';
import type { DiaryEntry } from '../lib/diary';

export function DiaryBackup({ entry }: { entry?: DiaryEntry }) {
  const [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const input = useRef<HTMLInputElement>(null), lock = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setStatus('正在整理日记…');
    try { await action(); } catch (e) { setStatus(e instanceof Error ? e.message : '暂时没有完成，原来的日记还在。'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div className="diary-backup">
    <p>{entry ? '备份这篇日记的文字和每段原声，换设备后也能珍藏。' : '日记单独备份，包含文字、故事页和每段原声。恢复时只添加缺少的日记，不覆盖本机已有记录。'}</p>
    <div className="row">
      <button className="btn-small" disabled={busy} onClick={() => void run(async () => {
        const entries = entry ? [entry] : await db.diaries.toArray();
        if (!entries.length) { setStatus('还没有需要备份的日记。'); return; }
        const content = await encodeDiaryBackup(entries);
        downloadDiaryFile(new Blob([content], { type: 'application/json' }), `pokepal-diaries-${Date.now()}.json`);
        setStatus(`已准备 ${entries.length} 篇日记，请在下载中保存好文件。`);
      })}>{busy ? '正在处理…' : entry ? '备份这篇日记与原声' : '备份全部日记与原声'}</button>
      {!entry && <><button className="btn-small" disabled={busy} onClick={() => input.current?.click()}>恢复日记备份</button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={e => {
          const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
          void run(async () => {
            if (file.size > DIARY_BACKUP_MAX_BYTES) throw new Error('文件过大，请使用逐篇导出的日记备份。');
            const entries = decodeDiaryBackup(await file.text());
            const added = await db.transaction('rw', db.diaries, async () => {
              const existing = new Set(await db.diaries.toCollection().primaryKeys());
              const missing = entries.filter(v => !existing.has(v.id));
              await db.diaries.bulkAdd(missing); return missing.length;
            });
            setStatus(`已恢复 ${added} 篇日记，${entries.length - added} 篇已有日记保持原样。`);
          });
        }}/></>}
    </div>
    <p role="status">{status}</p>
  </div>;
}
