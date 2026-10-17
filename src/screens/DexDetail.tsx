import { FeatureGuide } from '../components/FeatureGuide';
import { useEffect } from "react";
import { useGame, type DexBrowseState } from "../store";
import { TopBar } from "../components/TopBar";
import { BALLS, COLORS, RARITY, TYPES, artUrl, favoriteFood, friendshipLevel, getPokemon, hobby, kidDescription } from "../data/pokemon";
import { say, playCry, stopSpeech } from "../lib/speech";
import { PokeBall } from "../components/PokeBall";
import { Icon, Stars, Hearts } from "../icons";
import { PokeImg } from "../components/PokeImg";

const KID_HEIGHT = 105;
const KID_WEIGHT = 17;

export function DexDetail({ id, picking = false, browse }: { id: number; picking?: boolean; browse?:DexBrowseState }) {
  const go = useGame((s) => s.go);
  const cap = useGame((s) => s.save.captures.find((c) => c.id === id));
  const p = getPokemon(id);
  const setCatchWish = useGame((s) => s.setCatchWish);
  const desc = kidDescription(p);
  const h = hobby(p);
  const f = favoriteFood(p);
  const taller = p.heightCm > KID_HEIGHT;
  const heavier = p.weightKg > KID_WEIGHT;

  useEffect(() => {
    let active=true;
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
      <TopBar title="宝可梦资料" onBack={() => go({ name: "dex", picking, browse })} focused help={<FeatureGuide id={cap?"ownedDetail":"detail"} compact/>}/>
      <div className="detail">
        <div className="detail-art">
          <PokeImg src={artUrl(p.id)} alt="" />
          <button className="cry-btn" onClick={() => playCry(p.id)}><Icon name="speaker" size={30} /> 听听叫声</button>
        </div>
        <div className="detail-info">
          <div className="detail-no">#{String(p.id).padStart(3, "0")} <Stars n={RARITY[p.rarity].stars} size={20} /> {RARITY[p.rarity].zh}</div>
          <Speak en={p.nameEn} zh={p.nameZh}>
            <div className="detail-name">{p.nameZh}<span>{p.nameEn}</span></div>
          </Speak>
          <div className="detail-wish">
            {cap ? <><strong>已经是你的伙伴啦！</strong><small lang="en">Already your friend!</small><button className="wish-button" onClick={()=>go({name:"home",companion:p.id})}><Icon name="heart" size={28}/>回家陪它玩<small lang="en">Play at home</small></button></> : <><button className="wish-button primary" onClick={()=>{setCatchWish(p.id);go({name:"catch"});}}><Icon name="grass" size={32}/><span>我想找这只<small lang="en">Find this Pokémon!</small></span></button><p>带上精灵球，去草丛邀请它吧！<small lang="en">Bring a Poké Ball.</small></p></>}
          </div>
          <Speak en={p.genusEn} zh={p.genusZh}><div className="detail-genus">{p.genusZh} · {p.genusEn}</div></Speak>
          <div className="type-row">
            {p.types.map((t) => (
              <Speak key={t} en={TYPES[t]?.en ?? t} zh={`${TYPES[t]?.zh ?? t}属性`}>
                <span className="type-chip" style={{ background: TYPES[t]?.color }}><Icon name={TYPES[t]?.icon ?? "normal"} size={26} /> {TYPES[t]?.zh} {TYPES[t]?.en}</span>
              </Speak>
            ))}
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
            <Speak en={heavier ? "Heavier than you!" : "Lighter than you!"} zh={heavier ? "它比你还重！" : "它比你轻！"}>
              <div className="fact"><Icon name="weight" size={44} />{p.weightKg} 公斤<small>{heavier ? "比你还重！" : "比你轻"}</small></div>
            </Speak>
            <Speak en={h.en} zh={h.zh}><div className="fact"><Icon name={h.icon} size={44} />爱好<small>{h.zh}</small></div></Speak>
            <Speak en={`It likes ${f.en}.`} zh={`它爱吃${f.zh}。`}><div className="fact"><Icon name={f.icon} size={44} />爱吃<small>{f.zh} {f.en}</small></div></Speak>
          </div>
          {cap && (
            <div className="bond">
              <Hearts n={friendshipLevel(cap.friendship)} />
              <span className="bond-meta"><PokeBall type="poke" size={24} /> {new Date(cap.caughtAt).toLocaleDateString("zh-CN")} 用{BALLS[cap.ball].zh}抓到</span>
            </div>
          )}
          <details className="official">
            <summary>官方图鉴（给爸爸妈妈读）</summary>
            <p>{p.flavorZh}</p>
            <p className="en">{p.flavorEn}</p>
          </details>
        </div>
      </div>
    </div>
  );
}
