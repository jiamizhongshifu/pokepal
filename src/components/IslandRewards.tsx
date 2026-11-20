import { useState } from 'react';
import { useGame } from '../store';
import { STICKERS, stickerEarned, stickerShown, stickersEarnedCount } from '../island/stickers';
import { storyProp } from '../data/sceneArt';
import { Icon } from '../icons';
import { sfx } from '../lib/speech';

/** Island decorations: stickers earned on the learning path's island stops; each can be put out or away. */
export function IslandRewards({ onSeeIsland }: { onSeeIsland: () => void }) {
 const save = useGame(s => s.save), toggle = useGame(s => s.toggleSticker);
 const [message, setMessage] = useState('');
 const earned = Math.min(STICKERS.length, stickersEarnedCount(save));
 return <div className="island-rewards">
  <div className="dress-feedback" role="status"><Icon name={message ? 'check' : 'hand'} size={28} /><span>{message || `已经得到 ${earned} / ${STICKERS.length} 件。每章走完“去小岛用一用”和“说说这一章”，各得一件。`}</span></div>
  <div className="dress-catalog">{STICKERS.map(k => {
   const has = stickerEarned(save, k, earned), on = stickerShown(save, k, earned);
   return <button key={k.id} className={`dress-item${has ? '' : ' is-locked'}`} aria-pressed={on} disabled={!has} aria-label={has ? `${k.name}，${on ? '摆在岛上，点一下收起来' : '收起来了，点一下摆出来'}` : `${k.name}，还没得到`} onClick={() => { if (toggle(k.id)) { sfx(on ? 'click' : 'sparkle'); setMessage(on ? `${k.name}收起来啦` : `${k.name}摆好啦`); } }}>
    {has ? <img src={storyProp(k.id)} alt="" draggable={false} /> : <Icon name="lock" size={40} />}<span>{k.name}</span><small>{has ? (on ? '在岛上' : '收起来了') : '路线小岛站'}</small>
   </button>;
  })}</div>
  <button className="dress-see" onClick={onSeeIsland}><Icon name="eye" size={30} />看看我们的小岛</button>
 </div>;
}
