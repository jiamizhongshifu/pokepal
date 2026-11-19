import {useGame} from '../store';
import {learningHome} from '../lib/learningTrail';
import {learningProfile} from '../lib/learningStage';
import {lessonWords} from '../data/learning';
import {learningEntry} from '../data/curriculum';
import {creatureArt, FIRST_FRIEND } from '../data/creatures';
import {CreatureImg} from './CreatureImg';
import {LearningArt} from './LearningItem';
import {Icon} from '../icons';
import './learning-trail.css';
export function LearningTrail(){
 const save=useGame(s=>s.save),start=useGame(s=>s.startUnit);
 const {unit,resuming,completed}=learningHome(save);
 return <section className="learning-trail learning-home-hero" aria-labelledby="learning-home-title">
  <header className="learning-home-heading"><div><span className="learning-home-eyebrow">今天学一点</span><h1 id="learning-home-title">{unit.title}</h1><p>{completed?'熟悉的小发现，可以再玩一次。':resuming?'接着上次的小发现，慢慢来。':'和伙伴听一听，找一找。'}</p></div><CreatureImg src={creatureArt(save.captures[0]?.id??FIRST_FRIEND)} alt=""/></header>
  <div className="learning-home-preview" aria-label="这次会认识">{lessonWords(unit,learningProfile(save.settings).vocabulary).map(key=>{const entry=learningEntry(key)!;return <div key={key}><LearningArt entry={entry}/><span lang="en">{entry.en}</span></div>;})}</div>
  <button className="learning-trail-primary" onClick={()=>start(unit.id)}><Icon name="play" size={34}/>{completed?'再学一遍':resuming?'接着学':'开始学'}<span aria-hidden="true">›</span></button>
  <p className="course-reward-preview"><Icon name="star" size={24}/>完成这一站，路线上会点亮一颗星</p>
  <p className="learning-home-reassurance">玩一小会儿就好，随时可以休息。</p>
 </section>;
}
