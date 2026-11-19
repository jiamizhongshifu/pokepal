import {LearningTrail} from '../components/LearningTrail';
import {FeatureGuide} from '../components/FeatureGuide';
import {participationCount,PARTICIPATION_LABELS} from '../lib/participation';
import {learningHome} from '../lib/learningTrail';
import {learningStageTitle} from '../lib/learningStage';
import '../learning-journey.css';
import {useGame} from '../store';
import {TopBar} from '../components/TopBar';
import {Icon} from '../icons';

export function TaskBoard(){
 const save=useGame(s=>s.save),go=useGame(s=>s.go);
 const {extension}=learningHome(save),d=save.daily;
 const participated=participationCount(save);
 return <div className="screen tasks learning-home">
  <TopBar title="小岛学英语" onBack={()=>go({name:'home'})} focused help={<FeatureGuide compact id="tasks"/>}/>
  <main className="learning-home-content">
   <button className="story-resume" onClick={()=>go({name:'adventure'})}><Icon name="book" size={36}/><span><b>一起听故事，去认识新伙伴</b><small>苹果野餐 · 自动播放</small></span><span aria-hidden="true">›</span></button>
   <LearningTrail/>
   <nav className="learning-home-tools" aria-label="其他学习方式">
    <h2>也可以自己选</h2>
    <div>
     <button onClick={()=>go({name:'practice'})}><Icon name="picture" size={42}/><strong>选个小游戏</strong><small>听 · 说 · 认 · 写</small></button>
     <button onClick={()=>go({name:'notebook',mode:'all',returnTo:'tasks'})}><Icon name="book" size={42}/><strong>发现手册</strong><small>复习和收藏</small></button>
     <button onClick={()=>go({name:'journey'})}><Icon name="sign" size={42}/><strong>学习小路</strong><small>看看学到哪儿</small></button>
    </div>
   </nav>
   <details className="learning-home-extension"><summary><Icon name="island" size={26}/><span>把英语带到小岛上</span><span className="disclosure-arrow" aria-hidden="true">⌄</span></summary>
    <p>和「{extension.title}」里的小发现再见面，不用全部完成。</p>
    <div><button onClick={()=>go({name:'home',station:extension.station})}><Icon name="island" size={30}/>岛上用一用</button><button onClick={()=>go({name:'story',id:extension.story})}><Icon name="book" size={30}/>读配套故事</button></div>
   </details>
   <details className="task-parent-note"><summary>给陪伴的大人 · 学习记录</summary>
    <p>当前阶段：{learningStageTitle(save.settings)}。按学习小路逐站前进，听说认写可以自由选择；不用把每种活动都做完。</p>
    <p>今天参与 {participated} 类活动{d.participated?.length?`：${d.participated.map(k=>PARTICIPATION_LABELS[k]).join(' · ')}`:'，愿意听和一起玩也很好'}。</p>
   </details>
  </main>
 </div>;
}
