import { useGame } from '../store';
import { LEARNING_UNITS } from '../data/curriculum';
import { summarizeOpportunities, summarizeDelayed, EVIDENCE_MIN_SAMPLE, type Opportunity } from '../lib/learningProgress';
import { isIslandSource, islandAnswerKind } from '../lib/islandAsk';
import { BreakdownChart } from './ParentCharts';

const WEEK = 7 * 24 * 3600 * 1000;
const sourceTitle = (source: string) => source === 'review' ? '和老朋友见面（复习）' : LEARNING_UNITS.find(u => `unit:${u.id}` === source)?.title ?? '其他活动';
const day = (at: number) => new Date(at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

/** Recent answers grouped as the app saw them; never a score, never mastery. */
export function ParentEvidence() {
  const all = useGame(s => s.save.learning?.opportunities);
  // Island play is a new situation for words already learned: counted on its own line, never mixed into lessons.
  const list = all?.filter(o => !isIslandSource(o.source));
  const did = summarizeOpportunities(all?.filter(o => islandAnswerKind(o) === 'did'), Date.now() - WEEK), said = summarizeOpportunities(all?.filter(o => islandAnswerKind(o) === 'said'), Date.now() - WEEK);
  const part = (r: typeof did) => r.decidable === 0 ? '还没有' : r.enough ? `${r.independent} / ${r.decidable} 次` : `${r.decidable} 次（样本少）`;
  const since = Date.now() - WEEK;
  const sum = summarizeOpportunities(list, since);
  const lessons = new Map<string, Opportunity[]>();
  for (const o of (list ?? []).filter(o => o.at >= since)) {
    const k = `${day(o.at)}|${o.source}`;
    lessons.set(k, [...(lessons.get(k) ?? []), o]);
  }
  const c = sum.count;
  const later = summarizeDelayed(list, since);
  const items = [
    { key: 'independent', label: '听到后第一次选对', value: c.independent, color: 'var(--brand-primary)' },
    { key: 'after-replay', label: '重听后选对', value: c['after-replay'], color: 'var(--brand-sky)' },
    { key: 'after-hint', label: '试错后再选对', value: c['after-hint'], color: 'var(--brand-streak)' },
    { key: 'after-model', label: '先看示范再完成', value: c['after-model'], color: 'var(--brand-gem)' },
    { key: 'skipped', label: '先跳过', value: c.skipped, color: '#b5c2c8' },
    { key: 'unknown', label: '未确认听到（未知）', value: c.unknown, color: '#d8e0e4' },
  ];
  const barTotal = items.reduce((n, i) => n + i.value, 0);
  const pct = sum.enough && sum.decidable > 0 ? Math.round((sum.independent / sum.decidable) * 100) : null;
  return <section className="parent-evidence" aria-labelledby="parent-evidence-title">
    <div className="pchart-card-head">
      <div>
        <h3 id="parent-evidence-title">最近 7 天作答分布</h3>
        <small className="pchart-sub">观察孩子用了哪些帮助，不作为考试打分</small>
      </div>
      {pct !== null && <span className="pchart-badge-pill">首次选对 {pct}%</span>}
    </div>
    {sum.total === 0 ? <p className="muted">还没有记录。完成课程或复习后，这里会自动生成作答分布图。</p> : <>
      <p className="parent-evidence-lead">{sum.enough ? <>听到后第一次就选对 <b>{sum.independent}</b> / {sum.decidable} 次</> : <>记录不足（可判断作答 {sum.decidable} 次，满 {EVIDENCE_MIN_SAMPLE} 次显示比例）</>}</p>
      <BreakdownChart items={items} total={barTotal} />
      <details className="parent-inner-fold"><summary>按课题查看明细</summary><ul className="parent-evidence-lessons">{[...lessons].reverse().map(([k, os]) => { const [d, src] = k.split('|'); const n = (kind: Opportunity['kind']) => os.filter(o => o.kind === kind).length; return <li key={k}><b>{d} · {sourceTitle(src)}</b><span>参与 {os.filter(o => o.kind !== 'left').length} 题 · 首次对 {n('independent')} · 重听 {n('after-replay')} · 提示 {n('after-hint')} · 示范 {n('after-model')} · 跳过 {n('skipped')}</span></li>; })}</ul></details>
    </>}
    <div className="parent-mini-grid">
      <div className="parent-mini-card">
        <small>隔天再遇见（复习）</small>
        <strong>{later.total === 0 ? '暂无记录' : later.enough ? `${later.independent} / ${later.decidable} 次` : `${later.decidable} 次（样本少）`}</strong>
        <span>{later.total === 0 ? '隔天复习换情境后记录于此' : '首次选对 / 可判断作答'}</span>
      </div>
      <div className="parent-mini-card">
        <small>小岛上听懂去做</small>
        <strong>{part(did)}</strong>
        <span>伙伴提要求，孩子去完成</span>
      </div>
      <div className="parent-mini-card">
        <small>小岛上选对要说的话</small>
        <strong>{part(said)}</strong>
        <span>在情境里选出合适一句</span>
      </div>
    </div>
    <p className="parent-evidence-tip">陪伴小贴士：挑一个「先看示范」或「先跳过」的词，在生活里指一指、说一说，不用考一考。</p>
    <small>注：“第一次选对”仅指未使用应用内提示，无法判断是否由大人协助，也不代表已完全掌握。</small>
  </section>;
}
