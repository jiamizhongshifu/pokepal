import { FeatureGuide } from '../components/FeatureGuide';
import { useLayoutEffect, useRef, useState } from "react";
import { dexOwned, useGame, type DexBrowseState } from "../store";
import { TopBar } from "../components/TopBar";
import { POKEMON, spriteUrl } from "../data/pokemon";
import { say } from "../lib/speech";
import { useIntro } from "../lib/hooks";
import { PokeImg } from "../components/PokeImg";
import { Icon } from "../icons";

const PAGE_SIZE = 8;
const REGIONS = [
  { name: '所有地区', min: 1, max: Infinity },
  { name: '关都', min: 1, max: 151 },
  { name: '城都', min: 152, max: 251 },
  { name: '丰缘', min: 252, max: 386 },
  { name: '帕底亚', min: 906, max: 1025 },
];

export function Dex({ picking = false, browse }: { picking?: boolean; browse?:DexBrowseState }) {
  const save = useGame((s) => s.save);
  const go = useGame((s) => s.go);
  // 现在的伙伴 + 进化前的形态都算“已拥有”
  const caught = dexOwned(save);
  // 先看到熟悉的伙伴；空图鉴仍可浏览全部宝可梦。
  const [onlyOwned, setOnlyOwned] = useState(browse?.onlyOwned??(!picking && caught.size > 0));
  const [query, setQuery] = useState(browse?.query??"");
  const [page, setPage] = useState(browse?.page??0);
  const [generation, setGeneration] = useState(browse?.generation??0);
  const screenRef = useRef<HTMLDivElement>(null);
  const filtersKey=JSON.stringify([page,onlyOwned,generation,query]);
  const previousFilters=useRef(filtersKey);
  useLayoutEffect(() => {
    if(!browse)return;
    screenRef.current?.scrollTo({top:browse.scrollTop});
    screenRef.current?.querySelector<HTMLButtonElement>(`[data-pokemon-id="${browse.focusId}"]`)?.focus({preventScroll:true});
  }, []);
  useLayoutEffect(() => {
    if(previousFilters.current!==filtersKey)screenRef.current?.scrollTo({top:0});
    previousFilters.current=filtersKey;
  }, [filtersKey]);
  const region = REGIONS[generation];
  const list = POKEMON.filter((p) => (!onlyOwned || caught.has(p.id)) && p.id >= region.min && p.id <= region.max && `${p.nameZh} ${p.nameEn} ${p.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  useIntro(() => picking ? say(["zh", "挑一只你喜欢的宝可梦吧！"], ["en", "Pick a Pokémon you love!", {en:"Pick a Pokémon you love!",zh:"挑一只你喜欢的宝可梦吧！"}]) : say(["zh", `训练师图鉴。你已经有${caught.size}只宝可梦啦！`], ["en", `You have ${caught.size} Pokémon!`]));

  return (
    <div className="screen dex" ref={screenRef}>
      <TopBar icon="dex" title={picking ? "挑选想找的伙伴" : "我的图鉴"} onBack={() => go({ name: picking ? "catch" : "home" })} focused help={<FeatureGuide id={picking?"wish":"dex"} compact/>}/>
      <div className="dex-toolbar">
        <div className="collection-tabs" aria-label="图鉴范围">
          <button aria-pressed={!onlyOwned} onClick={() => { setOnlyOwned(false); setPage(0); }}><Icon name="dex" size={28} />全部宝可梦</button>
          <button aria-pressed={onlyOwned} onClick={() => { setOnlyOwned(true); setPage(0); }}><Icon name="heart" size={28} />我的伙伴 <small>{caught.size}</small></button>
        </div>
      </div>
      <div className="dex-discovery-tools">
        {!picking && <button className="wish-button" onClick={() => go({name:"dex", picking:true})}><Icon name="grass" size={32}/><span>找新伙伴</span><span aria-hidden="true">›</span></button>}
        <details className="dex-filters" open={browse?.filtersOpen||undefined}>
          <summary>按名字或地区找 <span>{[generation ? region.name : "", query].filter(Boolean).join(" · ")}</span></summary>
          <label className="wish-search">找找它<input type="search" value={query} onChange={(e)=>{setQuery(e.target.value);setPage(0);}} placeholder="名字 / English / 编号" aria-label="搜索宝可梦" /></label>
          <div className="collection-tabs dex-generations" aria-label="宝可梦地区">
            {REGIONS.map(({name},i)=><button key={name} aria-pressed={generation===i} onClick={()=>{setGeneration(i);setPage(0);}}>{name}</button>)}
          </div>
          <p className="dex-filter-count" role="status">找到 {list.length} 位伙伴 · 图鉴共 {POKEMON.length} 位</p>
        </details>
      </div>
      
      {list.length === 0 ? <div className="center-msg dex-empty"><Icon name={onlyOwned && !caught.size ? "grass" : "dex"} size={72}/><p>{onlyOwned && !caught.size ? "去认识第一位伙伴吧" : "这里还没找到它，换个地方看看吧"}</p><button className="wish-button" onClick={()=>{setQuery("");setGeneration(0);setOnlyOwned(false);setPage(0);}}><Icon name="dex" size={28}/>看看全部伙伴</button>{onlyOwned && !caught.size && <button className="wish-button" onClick={()=>go({name:"catch"})}><Icon name="grass" size={28}/>去草丛</button>}</div> : <>
      <div className="dex-grid">
        {list.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((p) => {
          const has = caught.has(p.id);
          return (
            <button
              key={p.id}
              data-pokemon-id={p.id}
              className={`dex-cell ${has ? "has" : "discover"}`}
              aria-label={`${p.nameZh} ${p.nameEn}`}
              onClick={() => go({ name: "dexDetail", id: p.id, picking, browse:{onlyOwned,query,page:currentPage,generation,scrollTop:screenRef.current?.scrollTop??0,filtersOpen:!!screenRef.current?.querySelector('details')?.open,focusId:p.id} })}
            >
              <span className="dex-no">#{String(p.id).padStart(3, "0")}</span>
              <PokeImg src={spriteUrl(p.id)} alt="" draggable={false} />
              <span className="dex-name">{p.nameZh}</span><small lang="en">{p.nameEn}</small>
              <span className="dex-meet-status">{save.captures.some(c=>c.id===p.id) ? "已经是伙伴" : "可以去找它"}</span>
            </button>
          );
        })}
      </div>
      <nav className="dex-pagination" aria-label="翻阅图鉴">
        <button className="replay" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><Icon name="back" size={28} />上一页</button>
        <span aria-live="polite">{currentPage + 1} / {pages}</span>
        <button className="replay" disabled={currentPage + 1 === pages} onClick={() => setPage(currentPage + 1)}>下一页<Icon name="back" size={28} className="next-icon" /></button>
      </nav>
      </>}
    </div>
  );
}
