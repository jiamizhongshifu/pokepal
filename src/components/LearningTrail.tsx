import {courseRewardAvailable,DAILY_CAP} from '../lib/participation';
import {todayStr} from '../lib/date';
import {useGame} from '../store';
import {learningHome} from '../lib/learningTrail';
import {learningProfile} from '../lib/learningStage';
import {lessonWords} from '../data/learning';
import {learningEntry} from '../data/curriculum';
import {artUrl} from '../data/pokemon';
import {PokeImg} from './PokeImg';
import {LearningArt} from './LearningItem';
import {Icon} from '../icons';
import './learning-trail.css';
export function LearningTrail(){
 const save=useGame(s=>s.save),start=useGame(s=>s.startUnit);
 const {unit,resuming,completed}=learningHome(save);
 const reward=courseRewardAvailable(save,unit.id)?Math.min(2,DAILY_CAP-(save.daily.date===todayStr()?save.daily.energyEarned:0)):0;
 return <section className="learning-trail learning-home-hero" aria-labelledby="learning-home-title">
  <header className="learning-home-heading"><div><span className="learning-home-eyebrow">今天学一点</span><h1 id="learning-home-title">{unit.title}</h1><p>{completed?'熟悉的小发现，可以再玩一次。':resuming?'接着上次的小发现，慢慢来。':'和伙伴听一听，找一找。'}</p></div><PokeImg src={artUrl(save.captures[0]?.id??25)} alt=""/></header>
  <div className="learning-home-preview" aria-label="这次会认识">{lessonWords(unit,learningProfile(save.settings).vocabulary).map(key=>{const entry=learningEntry(key)!;return <div key={key}><LearningArt entry={entry}/><span lang="en">{entry.en}</span></div>;})}</div>
  <button className="learning-trail-primary" onClick={()=>start(unit.id)}><Icon name="play" size={34}/>{completed?'再学一遍':resuming?'接着学':'开始学'}<span aria-hidden="true">›</span></button>
  <p className="course-reward-preview"><Icon name={reward?"bolt":"heart"} size={24}/>{reward?`完成这次学习 +${reward} 能量`:save.daily.energyEarned>=DAILY_CAP?"今天能量收集好啦，还可以自在学":"这个主题今天领过能量啦，可以再听一遍"}</p>
  <p className="learning-home-reassurance">玩一小会儿就好，随时可以休息。</p>
 </section>;
}
