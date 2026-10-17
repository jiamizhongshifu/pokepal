import type { Capture, InteractKind } from '../types';

/** Needs advance only while playing on the island, never while away or offline. */
export interface CompanionCare { seconds: number; fedAt: number; petAt: number; quietUntil: number }
export type CareKind = 'feed' | 'pet';
export interface CareRequest { id: number; kind: CareKind; overdue: number }
const MEAL_GAP = 360, COMPANY_GAP = 240;
export function careState(c: Capture): CompanionCare {
  return c.care ?? {seconds:0,fedAt:-MEAL_GAP+60+(c.id%5)*15,petAt:-COMPANY_GAP+90+(c.id%7)*12,quietUntil:0};
}
export function careRequest(c: Capture | undefined): CareRequest | null {
  if(!c)return null;
  const s=careState(c);
  if(s.seconds<s.quietUntil)return null;
  const hunger=s.seconds-s.fedAt-MEAL_GAP, company=s.seconds-s.petAt-COMPANY_GAP;
  if(Math.max(hunger,company)<0)return null;
  return {id:c.id,kind:hunger>=company?'feed':'pet',overdue:Math.max(hunger,company)};
}
export function nextCareRequest(captures:Capture[]): CareRequest|null {
  return captures.map(careRequest).filter((r):r is CareRequest=>!!r).sort((a,b)=>b.overdue-a.overdue||a.id-b.id)[0]??null;
}
export function advanceCare(c:Capture,seconds:number) {
  c.care={...careState(c),seconds:careState(c).seconds+Math.max(0,Math.min(10,seconds))};
}
export function comfortCompanion(c:Capture,kind:InteractKind) {
  const s={...careState(c)};
  if(kind==='feed')s.fedAt=s.seconds;
  if(kind==='pet')s.petAt=s.seconds;
  s.quietUntil=s.seconds+(kind==='night'?120:45);
  c.care=s;
}
export function deferCare(c:Capture){const s=careState(c);c.care={...s,quietUntil:s.seconds+90};}
