import type { DexBrowseState } from '../lib/navigation';
import { FeatureGuide } from '../components/FeatureGuide';
import { useLayoutEffect, useRef, useState } from "react";
import { dexOwned, useGame } from "../store";
import { TopBar } from "../components/TopBar";
import { BottomNav } from "../components/BottomNav";
import { CREATURES, creatureAvatar, CREATURE_TYPES, type CreatureType } from "../data/creatures";
import { say, sfx } from "../lib/speech";
import { useIntro } from "../lib/hooks";
import { CreatureImg } from "../components/CreatureImg";
import { Icon } from "../icons";

const REGIONS: { name: string; type?: CreatureType }[] = [
  { name: '全部属性' },
  ...(Object.entries(CREATURE_TYPES) as [CreatureType, { zh: string }][]).map(([type, t]) => ({ name: t.zh, type })),
];

export function Dex({ picking = false, browse }: { picking?: boolean; browse?:DexBrowseState }) {
  const save = useGame((s) => s.save);
  const go = useGame((s) => s.go), back = useGame((s) => s.back);
  // 现在的伙伴 + 长大前的形态都算“已拥有”
  const caught = dexOwned(save);
  // 先看到熟悉的伙伴；空好朋友相册仍可浏览全部小精灵。
  const [onlyOwned, setOnlyOwned] = useState(browse?.onlyOwned??(!picking && caught.size > 0));
  const [query, setQuery] = useState(browse?.query??"");
  const [generation, setGeneration] = useState(browse?.generation??0);
  const screenRef = useRef<HTMLDivElement>(null);
  const filtersKey=JSON.stringify([onlyOwned,generation,query]);
  const previousFilters=useRef(filtersKey);
  // Return to where the child left the album, once, on arrival.
  const [arrival]=useState(browse);
  useLayoutEffect(() => {
    if(!arrival)return;
    screenRef.current?.scrollTo({top:arrival.scrollTop});
    screenRef.current?.querySelector<HTMLButtonElement>(`[data-pokemon-id="${arrival.focusId}"]`)?.focus({preventScroll:true});
  }, [arrival]);
  useLayoutEffect(() => {
    if(previousFilters.current!==filtersKey)screenRef.current?.scrollTo({top:0});
    previousFilters.current=filtersKey;
  }, [filtersKey]);
  const region = REGIONS[generation];
  const list = CREATURES.filter((p) => (picking ? !caught.has(p.id) : !onlyOwned || caught.has(p.id)) && (!region.type || p.types.includes(region.type)) && `${p.nameZh} ${p.nameEn} ${p.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  useIntro(() => picking ? say(["zh", "挑一只你喜欢的小精灵吧！"], ["en", "Pick a friend you love!", {en:"Pick a friend you love!",zh:"挑一只你喜欢的小精灵吧！"}]) : say(["zh", `好朋友相册。你已经有${caught.size}只小精灵啦！`], ["en", `You have ${caught.size} friends!`]));

  return (
    <div className={`screen dex${picking ? " is-picking" : ""}`} ref={screenRef}>
      <TopBar icon="dex" title={picking ? "挑选想找的伙伴" : "好朋友相册"} onBack={back} focused help={<FeatureGuide id={picking?"wish":"dex"} compact/>}/>
      <div className="dex-toolbar">
        {!picking && <div className="collection-tabs" aria-label="相册范围">
          <button aria-pressed={!onlyOwned} onClick={() => { sfx("click"); setOnlyOwned(false);  }}><Icon name="dex" size={28} />全部小精灵</button>
          <button aria-pressed={onlyOwned} onClick={() => { sfx("click"); setOnlyOwned(true);  }}><Icon name="heart" size={28} />我的伙伴 <small>{caught.size}</small></button>
        </div>}
      </div>
      <div className="dex-discovery-tools">
        {!picking && <button className="wish-button" onClick={() => go({name:"dex", picking:true})}><Icon name="grass" size={32}/><span>找新伙伴</span><span aria-hidden="true">›</span></button>}
        <details className="dex-filters" open={browse?.filtersOpen||undefined}>
          <summary>按名字或属性找 <span>{[generation ? region.name : "", query].filter(Boolean).join(" · ")}</span></summary>
          <label className="wish-search">找找它<input type="search" value={query} onChange={(e)=>{setQuery(e.target.value);}} placeholder="名字 / English / 编号" aria-label="搜索小精灵" /></label>
          <div className="collection-tabs dex-generations" aria-label="小精灵属性">
            {REGIONS.map(({name},i)=><button key={name} aria-pressed={generation===i} onClick={()=>{setGeneration(i);}}>{name}</button>)}
          </div>
          <p className="dex-filter-count" role="status">找到 {list.length} 位伙伴 · 相册共 {CREATURES.length} 位</p>
        </details>
      </div>
      
      {list.length === 0 ? <div className="center-msg dex-empty"><Icon name={onlyOwned && !caught.size ? "waves" : "dex"} size={72}/><p>{onlyOwned && !caught.size ? "去认识第一位伙伴吧" : "这里还没找到它，换个地方看看吧"}</p><button className="wish-button" onClick={()=>{setQuery("");setGeneration(0);setOnlyOwned(false);}}><Icon name="dex" size={28}/>看看全部伙伴</button>{onlyOwned && !caught.size && <button className="wish-button" onClick={()=>go({name:"catch"})}><Icon name="waves" size={28}/>去码头等小船</button>}</div> : <>
      <div className="dex-grid">
        {list.map((p, i) => {
          const has = caught.has(p.id);
          return (
            <button
              key={p.id}
              data-pokemon-id={p.id}
              className={`dex-cell ${has ? "has" : "discover"}`}
              aria-label={`${p.nameZh} ${p.nameEn}`}
              onClick={() => { sfx("click"); go({ name: "dexDetail", id: p.id, picking, browse:{onlyOwned,query,generation,scrollTop:screenRef.current?.scrollTop??0,filtersOpen:!!screenRef.current?.querySelector('details')?.open,focusId:p.id} }); }}
            >
              <span className="dex-no">#{String(p.id).padStart(3, "0")}</span>
              <CreatureImg src={creatureAvatar(p.id)} alt="" draggable={false} loading={i < 12 ? "eager" : "lazy"} />
              <span className="dex-name">{p.nameZh}</span><small lang="en">{p.nameEn}</small>
              {/* In "my friends" every card is a friend: only one that has grown up says so. */}
              {!(onlyOwned && save.captures.some(c=>c.id===p.id)) && <span className="dex-meet-status">{save.captures.some(c=>c.id===p.id) ? "已经是伙伴" : has ? "已经长大啦" : "可以去找它"}</span>}
            </button>
          );
        })}
      </div>
      </>}
      {!picking && <BottomNav active="friends" />}
    </div>
  );
}
