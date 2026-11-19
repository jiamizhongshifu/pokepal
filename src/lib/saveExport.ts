/**
 * Exports for a parent: the save as readable JSON without the avatar photo (recordings and diaries are never part of
 * the save). A save that failed validation is exported untouched otherwise, so nothing is lost while it is checked.
 */
export function exportableSave(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const copy = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  const trainer = copy.trainer as Record<string, unknown> | undefined;
  if (trainer && typeof trainer === 'object') delete trainer.avatarPhoto;
  return copy;
}

export interface StorageFacts { usage?: number; quota?: number; persisted?: boolean }
export async function storageFacts(): Promise<StorageFacts> {
  try {
    const [estimate, persisted] = await Promise.all([navigator.storage?.estimate?.(), navigator.storage?.persisted?.()]);
    return { usage: estimate?.usage, quota: estimate?.quota, persisted };
  } catch { return {}; }
}
const mb = (n?: number) => n === undefined ? '未知' : `${(n / 1048576).toFixed(1)} MB`;
export function describeStorage(f: StorageFacts) {
  return `已用 ${mb(f.usage)} / 可用 ${mb(f.quota)} · ${f.persisted === undefined ? '持久保存状态未知' : f.persisted ? '浏览器已同意持久保存' : '浏览器未承诺持久保存'}`;
}
/** A diagnostic line for feedback: the problem kind and storage facts only, never save contents. */
export function diagnosticText(issue: string, f: StorageFacts, at = new Date()) {
  return `啵啵岛存档诊断 · ${at.toLocaleString('zh-CN')} · 问题：${issue} · ${describeStorage(f)} · ${navigator.onLine ? '联网' : '离线'}`;
}
export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
