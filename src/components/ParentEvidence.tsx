import { useGame } from '../store';
import { LEARNING_UNITS } from '../data/curriculum';
import { summarizeOpportunities, EVIDENCE_MIN_SAMPLE, type Opportunity } from '../lib/learningProgress';

const WEEK = 7 * 24 * 3600 * 1000;
const sourceTitle = (source: string) => source === 'review' ? '和老朋友见面（复习）' : LEARNING_UNITS.find(u => `unit:${u.id}` === source)?.title ?? '其他活动';
const day = (at: number) => new Date(at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

/** Recent answers grouped as the app saw them; never a score, never mastery. */
export function ParentEvidence() {
  const list = useGame(s => s.save.learning?.opportunities);
  const since = Date.now() - WEEK;
  const sum = summarizeOpportunities(list, since);
  const lessons = new Map<string, Opportunity[]>();
  for (const o of (list ?? []).filter(o => o.at >= since)) {
    const k = `${day(o.at)}|${o.source}`;
    lessons.set(k, [...(lessons.get(k) ?? []), o]);
  }
  const c = sum.count;
  return <section className="parent-evidence" aria-labelledby="parent-evidence-title">
    <h3 id="parent-evidence-title">最近 7 天，孩子怎样作答</h3>
    {sum.total === 0 ? <p className="muted">还没有记录。新版本开始记录每次作答前用了哪些帮助；更早的学习没有这些信息，不计入这里。</p> : <>
      <p className="parent-evidence-lead">{sum.enough ? <>听到后第一次就选对 <b>{sum.independent}</b> / {sum.decidable} 次</> : <>记录不足（可判断的作答 {sum.decidable} 次，至少 {EVIDENCE_MIN_SAMPLE} 次才显示比例）</>}</p>
      <dl className="parent-record-definitions">
        <div><dt>听到后第一次就选对</dt><dd>{c.independent} 次</dd></div>
        <div><dt>重听后选对</dt><dd>{c['after-replay']} 次</dd></div>
        <div><dt>试错后再选对</dt><dd>{c['after-hint']} 次</dd></div>
        <div><dt>先看示范再完成</dt><dd>{c['after-model']} 次</dd></div>
        <div><dt>先跳过</dt><dd>{c.skipped} 次</dd></div>
        <div><dt>没确认听到声音（未知）</dt><dd>{c.unknown} 次</dd></div>
      </dl>
      <details className="parent-inner-fold"><summary>按课题查看</summary><ul className="parent-evidence-lessons">{[...lessons].reverse().map(([k, os]) => { const [d, src] = k.split('|'); const n = (kind: Opportunity['kind']) => os.filter(o => o.kind === kind).length; return <li key={k}><b>{d} · {sourceTitle(src)}</b><span>参与 {os.filter(o => o.kind !== 'left').length} 题 · 第一次选对 {n('independent')} · 重听后 {n('after-replay')} · 提示后 {n('after-hint')} · 看示范 {n('after-model')} · 跳过 {n('skipped')}</span></li>; })}</ul></details>
      <small>“第一次就选对”只表示没有用到应用里的重听、提示或示范，看不出是否有大人在旁边帮忙；也不代表已经掌握。中途离开的题不计入以上数字。</small>
    </>}
    <p className="parent-evidence-tip">陪伴建议：挑一个“先看示范”或“先跳过”的词，在生活里指一指、说一说，不用考一考。</p>
  </section>;
}
