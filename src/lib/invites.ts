import { CREATURES } from '../data/creatures';
import { recordChapterFriend } from './learningPath';
import type { SaveData } from '../types';

/** Keep the legacy slots readable, but consolidate their inventory only once. */
export function mergeInvites(s: SaveData) {
  const total=s.balls.poke+s.balls.great+s.balls.ultra+s.balls.master;
  if(!Number.isSafeInteger(total)) throw new Error('邀请果数量无效');
  s.balls={poke:total,great:0,ultra:0,master:0};
}
/** Called at animation completion; a stale or repeated request cannot spend twice. */
export function invitePartner(s:SaveData,id:number):boolean {
  if(!CREATURES.some(p=>p.id===id)||s.balls.poke<1||s.captures.some(c=>c.id===id))return false;
  s.balls.poke--;
  if(s.catchWish===id)delete s.catchWish;
  s.captures.push({id,caughtAt:Date.now(),ball:'poke',friendship:0});
  s.daily.caught.push(id);
  s.dex=[...new Set([...(s.dex??s.captures.map(c=>c.id)),id])];
  recordChapterFriend(s,id);
  return true;
}
