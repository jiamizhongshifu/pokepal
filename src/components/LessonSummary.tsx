import { Icon } from '../icons';
import type { SummaryItem } from '../lib/lessonSummary';
import './lesson-summary.css';

export function LessonSummary({ items }: { items: SummaryItem[] }) {
  return <ul className="lesson-summary" aria-label="这一次的小结">{items.map(item => <li key={item.label} className={`is-${item.tone}`}><small>{item.label}</small><b><Icon name={item.icon} size={28} />{item.value}</b></li>)}</ul>;
}
