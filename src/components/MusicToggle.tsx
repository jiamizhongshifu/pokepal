import {useGame} from '../store';
import {Icon} from '../icons';
import './music.css';

/** The welcome page and island share the same persisted music preference. */
export function MusicToggle(){
  const muted=useGame(s=>s.save.settings.backgroundMusic==='off');
  return <button type="button" className={`music-toggle ${muted?'is-muted':''}`} aria-label={muted?'打开背景音乐':'关闭背景音乐'} aria-pressed={!muted} title={muted?'打开背景音乐':'关闭背景音乐'} onClick={()=>useGame.getState().updateSettings({backgroundMusic:muted?'soft':'off'})}>
    <Icon name="music" size={26}/><span className="music-toggle-state" aria-hidden="true">{muted?'关':'开'}</span>
  </button>;
}
