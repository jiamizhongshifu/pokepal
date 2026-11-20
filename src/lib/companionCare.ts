import type { Capture, InteractKind } from '../types';

/**
 * The care record kept on each companion since the hunger/company timers were retired (little wishes replaced them).
 * Feeding and petting still note the moment, so older versions reading the same save see a cared-for companion.
 */
export interface CompanionCare { seconds: number; fedAt: number; petAt: number; quietUntil: number }
const MEAL_GAP = 360, COMPANY_GAP = 240;
export function careState(c: Capture): CompanionCare {
  return c.care ?? {seconds:0,fedAt:-MEAL_GAP+60+(c.id%5)*15,petAt:-COMPANY_GAP+90+(c.id%7)*12,quietUntil:0};
}
export function comfortCompanion(c:Capture,kind:InteractKind) {
  const s={...careState(c)};
  if(kind==='feed')s.fedAt=s.seconds;
  if(kind==='pet')s.petAt=s.seconds;
  s.quietUntil=s.seconds+(kind==='night'?120:45);
  c.care=s;
}
