import type { IslandTask } from '../lib/islandPlan';
import { placeById } from '../island/world';
import { visitStation } from '../lib/islandPlan';
import { Icon } from '../icons';

/** One thing to do on the island, taken from the learning path or from what is due to be met again: a single primary action, the words to hear first. */
export function IslandTaskCard({ task, onGo, onRoute, onHear }: { task: IslandTask; onGo: (station: string) => void; onRoute: () => void; onHear: () => void }) {
  if (task.kind === 'route') return <aside className="island-task is-route" aria-label="今天的小岛任务">
    <button className="island-task-main" onClick={onRoute}><Icon name="sign" size={36} /><span><strong>下一站：{task.title}</strong><small>回学习路线，学完再来小岛用一用</small></span><span aria-hidden="true">›</span></button>
  </aside>;
  const place = placeById(task.station);
  return <aside className="island-task" aria-label="今天的小岛任务">
    <button className="island-task-hear" aria-label={`听一听 ${task.phrase.en}`} onClick={onHear}><Icon name="speaker" size={28} /></button>
    <button className="island-task-main" onClick={() => onGo(visitStation(task.station))}>
      <Icon name={place?.icon ?? 'island'} size={36} />
      {task.kind === 'due'
        ? <span><strong>带伙伴去{place?.name ?? '小岛'}：{task.title}</strong><small><b lang="en">{task.phrase.en}</b> {task.phrase.zh} 想再见见你</small></span>
        : <span><strong>{task.kind === 'path' ? '路线任务：' : ''}带伙伴去{place?.name ?? '小岛'}</strong><small>用上 <b lang="en">{task.phrase.en}</b> {task.phrase.zh}</small></span>}
      <span aria-hidden="true">›</span>
    </button>
  </aside>;
}
