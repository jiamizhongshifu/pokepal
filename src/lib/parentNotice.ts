// A local record of reading the notice, not verified parental identity or cloud-upload consent.
export const PARENT_NOTICE_VERSION = '2026-10-19.1';
export const PARENT_NOTICE_KEY = 'pokepal-parent-notice';
type NoticeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function hasReadParentNotice(storage: NoticeStorage): boolean {
  try { return JSON.parse(storage.getItem(PARENT_NOTICE_KEY) || 'null')?.version === PARENT_NOTICE_VERSION; }
  catch { return false; }
}
export function recordParentNotice(storage: NoticeStorage): boolean {
  try { storage.setItem(PARENT_NOTICE_KEY, JSON.stringify({version:PARENT_NOTICE_VERSION})); return true; }
  catch { return false; }
}
export function clearParentNotice(storage: NoticeStorage) {
  try { storage.removeItem(PARENT_NOTICE_KEY); } catch { /* Browser storage may be unavailable. */ }
}
