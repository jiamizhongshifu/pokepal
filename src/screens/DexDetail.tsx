import { FeatureGuide } from '../components/FeatureGuide';
import { useEffect } from "react";
import { useGame, type DexBrowseState } from "../store";
import { TopBar } from "../components/TopBar";
import { COLORS, CREATURE_TYPES, speciesOf, type CreatureType, creatureArt, favoriteFood, getCreature, hobby, kidDescription } from "../data/creatures";
import { INVITE_KINDS } from "../data/invites";
import { say, playCry, stopSpeech, sfx } from "../lib/speech";
import { InviteBerry } from "../components/InviteBerry";
import { Icon, Hearts } from "../icons";
import { homeOf } from "../island/world";
import { togetherHearts, playedTogether } from "../island/plays";
import { CreatureImg } from "../components/CreatureImg";

const KID_HEIGHT = 105;

export function DexDetail({ id, picking = false, browse }: { id: number; picking?: boolean; browse?:DexBrowseState }) {
  const go = useGame((s) => s.go);
  const cap = useGame((s) => s.save.captures.find((c) => c.id === id));
  const p = getCreature(id);
  const setCatchWish = useGame((s) => s.setCatchWish);
  const desc = kidDescription(p);
  const h = hobby(p);
  const f = favoriteFood(p);
  const taller = p.heightCm > KID_HEIGHT;

  useEffect(() => {
    let active=true;
    const p=getCreature(id),desc=kidDescription(p);
    const timer=setTimeout(async()=>{
      await playCry(p.id);
      if(active)void say(["zh", `${p.nameZh}！`], ["en", `${p.nameEn}!`], 300, ["en", desc.en], ["zh", desc.zh]).then(ok=>{if(ok&&active)useGame.getState().noteWord(p.nameEn,"heard");});
    },250);
    return()=>{active=false;clearTimeout(timer);stopSpeech();};
  }, [id]);

  const Speak = ({ en, zh, children }: { en: string; zh?: string; children: React.ReactNode }) => (
    <button className="speakable" onClick={() => (zh ? say(["en", en], ["zh", zh]) : say(["en", en])).then(ok=>{if(ok)useGame.getState().noteWord(en,"heard");})}>{children}</button>
  );

  return (
    <div className="screen dex-detail">
      <TopBar title="小精灵资料" onBack={() => go({ name: "dex", picking, browse })} focused help={<FeatureGuide id={cap?"ownedDetail":"detail"} compact/>}/>
      <div className="detail">
        <div className="detail-art">
          <CreatureImg src={creatureArt(p.id)} alt="" />
          <button className="cry-btn" onClick={() => playCry(p.id)}><Icon name="speaker" size={30} /> 听听叫声</button>
        </div>
        <div className="detail-info">
          <Speak en={p.nameEn} zh={p.nameZh}>
            <div className="detail-name">{p.nameZh}<span>{p.nameEn}</span></div>
          </Speak>
          <div className="detail-wish">
            {cap ? <><strong>已经是你的伙伴啦！</strong><small lang="en">Already your friend!</small><button className="wish-button primary" onClick={()=>{sfx("click");go({name:"home",companion:p.id});}}><Icon name="heart" size={28}/>回家陪它玩<small lang="en">Play at home</small></button></> : <><button className="wish-button primary" onClick={()=>{sfx("click");setCatchWish(p.id);go({name:"catch"});}}><Icon name="waves" size={32}/><span>我想找这只<small lang="en">Find this friend!</small></span></button><p>有邀请果时，它会坐船来做客。<small lang="en">Bring an invite berry.</small></p></>}
          </div>
          <Speak en={p.genusEn} zh={p.genusZh}><div className="detail-genus">{p.genusZh} · {p.genusEn}</div></Speak>
          <div className="type-row">
            {p.types.map((t) => <span key={t} className="type-chip" style={{ background: CREATURE_TYPES[t as CreatureType]?.color }}><Icon name={CREATURE_TYPES[t as CreatureType]?.icon ?? "normal"} size={26} /> {CREATURE_TYPES[t as CreatureType]?.zh}</span>)}
            <span className="type-chip home-chip"><Icon name={homeOf(p.species).icon} size={26} /> 家在{homeOf(p.species).name}</span>
            {COLORS[p.color] && (
              <Speak en={COLORS[p.color].en} zh={COLORS[p.color].zh}>
                <span className="type-chip color" ><i style={{ background: COLORS[p.color].css }} />{COLORS[p.color].zh} {COLORS[p.color].en}</span>
              </Speak>
            )}
          </div>
          <Speak en={desc.en} zh={desc.zh}>
            <div className="detail-desc">
              <p className="en">{desc.en}</p>
              <p className="zh">{desc.zh}</p>
            </div>
          </Speak>
          <div className="fact-row">
            <Speak en={taller ? "Taller than you!" : "Smaller than you!"} zh={taller ? "它比你还高！" : "它比你矮！"}>
              <div className="fact"><Icon name="ruler" size={44} />{p.heightCm} 厘米<small>{taller ? "比你还高！" : "比你矮"}</small></div>
            </Speak>
            <Speak en={h.en} zh={h.zh}><div className="fact"><Icon name={h.icon} size={44} />爱好<small>{h.zh}</small></div></Speak>
            <Speak en={`It likes ${f.en}.`} zh={`它爱吃${f.zh}。`}><div className="fact"><Icon name={f.icon} size={44} />爱吃<small>{f.zh} {f.en}</small></div></Speak>
          </div>
          {cap && (
            <div className="bond">
              <Hearts n={togetherHearts(cap)} /><span className="bond-meta">一起玩了 {playedTogether(cap)} 次</span>
              {cap.caughtAt > Date.UTC(2020, 0, 1) && <span className="bond-meta"><InviteBerry type="poke" size={24} /> {new Date(cap.caughtAt).toLocaleDateString("zh-CN")} 带着{INVITE_KINDS[cap.ball].zh}来到小岛</span>}
            </div>
          )}
          <details className="official">
            <summary>给爸爸妈妈读</summary>
            <p>{p.nameZh}是一只{speciesOf(p).genusZh}，它的家在小岛的{homeOf(p.species).name}。{p.isFinal ? "它已经长大成年。" : "多和它一起玩，它会慢慢长大。"}</p>
            <p className="en">{p.nameEn} is a {speciesOf(p).genusEn.toLowerCase()}.</p>
          </details>
        </div>
      </div>
    </div>
  );
}
