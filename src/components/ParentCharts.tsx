import { useState } from 'react';
import { Icon } from '../icons';

export interface DayMetric {
  date: string;
  playMinutes: number;
  words: number;
  spoken: number;
  heard: number;
  tasksCompleted: number;
  caught: number;
}

/** Circular ring progress used for daily play time or course completion. */
export function RingMeter({ value, max, color = 'var(--brand-sky)', label, sub }: {
  value: number; max: number; color?: string; label: string; sub: string;
}) {
  const safeMax = Math.max(1, max);
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const r = 27;
  const c = 2 * Math.PI * r;
  return (
    <div className="pchart-ring" aria-label={`${label} ${sub}`}>
      <svg viewBox="0 0 68 68" width="68" height="68" aria-hidden="true">
        <circle className="pchart-ring-track" cx="34" cy="34" r={r} />
        <circle
          className="pchart-ring-fill"
          cx="34"
          cy="34"
          r={r}
          style={{ stroke: color, strokeDasharray: `${c}`, strokeDashoffset: `${c * (1 - ratio)}` }}
        />
      </svg>
      <div className="pchart-ring-center">
        <strong>{label}</strong>
        <small>{sub}</small>
      </div>
    </div>
  );
}

type BarMetric = 'playMinutes' | 'words' | 'spoken';
const BAR_META: Record<BarMetric, { label: string; unit: string; color: string }> = {
  playMinutes: { label: '游玩分钟', unit: '分', color: 'var(--brand-sky)' },
  words: { label: '接触词汇', unit: '词', color: 'var(--brand-primary)' },
  spoken: { label: '开口尝试', unit: '次', color: 'var(--brand-streak)' },
};

/** Interactive 7-day bar chart so parents can scan weekly rhythm at a glance. */
export function WeeklyBarChart({ days, today }: { days: DayMetric[]; today: string }) {
  const [metric, setMetric] = useState<BarMetric>('playMinutes');
  const meta = BAR_META[metric];
  const ordered = [...days].reverse();
  const maxVal = Math.max(1, ...ordered.map(d => d[metric]));
  const total = ordered.reduce((sum, d) => sum + d[metric], 0);
  return (
    <section className="pchart-card" aria-labelledby="pchart-week-title">
      <div className="pchart-card-head">
        <div>
          <h3 id="pchart-week-title">最近 7 天节奏</h3>
          <small className="pchart-sub">7 天合计 <b>{total}</b> {meta.unit}</small>
        </div>
        <div className="pchart-switch" role="group" aria-label="切换图表指标">
          {(Object.keys(BAR_META) as BarMetric[]).map(k => (
            <button
              key={k}
              type="button"
              aria-pressed={metric === k}
              onClick={() => setMetric(k)}
            >
              {BAR_META[k].label}
            </button>
          ))}
        </div>
      </div>
      <div className="pchart-bars" role="img" aria-label={`最近 7 天${meta.label}柱状图，合计 ${total} ${meta.unit}`}>
        {ordered.map(d => {
          const v = d[metric];
          const pct = v > 0 ? Math.max(10, Math.round((v / maxVal) * 100)) : 4;
          const isToday = d.date === today;
          return (
            <div key={d.date} className={`pchart-bar-col${isToday ? ' is-today' : ''}`}>
              <span className={`pchart-bar-val${v === 0 ? ' is-zero' : ''}`}>{v}</span>
              <div className="pchart-bar-track">
                <div
                  className={`pchart-bar-fill${v === 0 ? ' is-zero' : ''}`}
                  style={{ height: `${pct}%`, background: v > 0 ? meta.color : undefined }}
                />
              </div>
              <span className="pchart-bar-day">{isToday ? '今天' : d.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export interface BreakdownItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Stacked distribution bar + horizontal bars for answering breakdown. */
export function BreakdownChart({ items, total }: { items: BreakdownItem[]; total: number }) {
  const safeTotal = Math.max(1, total);
  const maxItem = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="pchart-breakdown">
      <div className="pchart-stacked" role="img" aria-label="作答方式占比条">
        {items.filter(i => i.value > 0).map(i => (
          <span
            key={i.key}
            style={{ width: `${(i.value / safeTotal) * 100}%`, background: i.color }}
            title={`${i.label}：${i.value} 次`}
          />
        ))}
      </div>
      <ul className="pchart-hbars">
        {items.map(i => {
          const pct = Math.round((i.value / maxItem) * 100);
          return (
            <li key={i.key}>
              <span className="pchart-hbar-label"><i style={{ background: i.color }} aria-hidden="true" />{i.label}</span>
              <div className="pchart-hbar-track">
                <span style={{ width: i.value > 0 ? `${Math.max(4, pct)}%` : '0%', background: i.color }} />
              </div>
              <b className="pchart-hbar-val">{i.value} 次</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Visual A–Z letter grid showing which letters the child has traced. */
export function AlphabetGrid({ traced }: { traced: string[] }) {
  const set = new Set(traced.map(l => l.toUpperCase()));
  const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  return (
    <div className="pchart-az" aria-label={`已写过 ${set.size} 个字母，共 26 个`}>
      {letters.map(ch => (
        <span key={ch} className={set.has(ch) ? 'is-done' : undefined} aria-label={`${ch}${set.has(ch) ? '，已写过' : ''}`}>{ch}</span>
      ))}
    </div>
  );
}

/** Mini chapter bar strip showing progress across all 6 chapters. */
export function ChapterProgressStrip({ chapters, currentIndex }: {
  chapters: { index: number; title: string; done: number; total: number }[];
  currentIndex: number;
}) {
  return (
    <div className="pchart-chapters" aria-label="六章学习进度">
      {chapters.map(c => {
        const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
        const done = c.total > 0 && c.done >= c.total;
        return (
          <div key={c.index} className={`pchart-chap${c.index === currentIndex ? ' is-current' : ''}${done ? ' is-done' : ''}`}>
            <div className="pchart-chap-top">
              <span>第{c.index + 1}章</span>
              <small>{done ? <Icon name="check" size={14} /> : `${c.done}/${c.total}`}</small>
            </div>
            <div className="pchart-chap-bar"><span style={{ width: `${pct}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}
