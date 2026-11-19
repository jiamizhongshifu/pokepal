import { useGame } from '../store';
import { stopSpeech, sfx } from '../lib/speech';
import { Icon } from '../icons';
import './bottom-nav.css';

export type NavTab = 'path' | 'island' | 'friends';
const TABS: { id: NavTab; icon: string; label: string }[] = [
 { id: 'path', icon: 'sign', label: '学习路线' },
 { id: 'island', icon: 'island', label: '我的小岛' },
 { id: 'friends', icon: 'dex', label: '好朋友' },
];

/** The three places a child moves between; the learning path is always first. */
export function BottomNav({ active }: { active: NavTab }) {
 const go = useGame(s => s.go);
 const open = (tab: NavTab) => {
  if (tab === active) return;
  sfx('click'); stopSpeech();
  go(tab === 'path' ? { name: 'home' } : tab === 'island' ? { name: 'home', view: 'island' } : { name: 'dex' });
 };
 return <nav className="bottom-nav" aria-label="主要页面">
  {TABS.map(t => <button key={t.id} type="button" className="bottom-nav-tab" aria-current={t.id === active ? 'page' : undefined} onClick={() => open(t.id)}>
   <Icon name={t.icon} size={40} /><span>{t.label}</span>
  </button>)}
 </nav>;
}
