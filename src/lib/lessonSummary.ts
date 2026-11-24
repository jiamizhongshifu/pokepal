/** What a grown-up sees after a stop on the path: counts only, never a percentage, a grade or a comparison. */
export interface SummaryItem { tone: 'sun' | 'green' | 'sky'; icon: string; label: string; value: string }

export const sittingMinutes = (startedAt: number, endedAt: number) => Math.max(1, Math.round((endedAt - startedAt) / 60000));

export function lessonSummary({ words, fresh, right, total, startedAt, endedAt }: { words: number; fresh: boolean; right: number; total: number; startedAt: number; endedAt: number }): SummaryItem[] {
  const items: SummaryItem[] = [{ tone: 'sun', icon: 'star', label: fresh ? '新认识' : '又练了', value: `${words} 个词` }];
  // A sitting made only of listening has no first answers to count.
  if (total > 0) items.push({ tone: 'green', icon: 'target', label: '一次找对', value: `${Math.min(right, total)} / ${total}` });
  items.push({ tone: 'sky', icon: 'rest', label: '玩了', value: `${sittingMinutes(startedAt, endedAt)} 分钟` });
  return items;
}
