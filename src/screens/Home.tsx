import {CompanionStrip} from '../components/CompanionStrip';
import {previewLevels,type DecorPreview} from '../lib/decorPreview';
import {DECOR_LAYOUT} from '../scene/decorationLayout';
import {TENT,PICNIC,PLAYGROUND,FARM_ENTRY} from '../scene/layout';
import {homeHint,type HomePanel} from '../lib/homeOverlay';
import {useModalBlocked} from '../lib/modalLayer';
import {UPGRADES,type UpgradeId} from '../lib/islandProgress';
import { Announcements } from '../components/Announcements';
import {weatherAt} from '../lib/weather';
import {WeatherBadge} from '../components/WeatherBadge';
import { FeatureGuide } from '../components/FeatureGuide';
import { FACILITY_GROUPS } from '../scene/facilityControls';
import { CompanionFinder } from '../components/CompanionFinder';
import { configureIslandExpansion, configureIslandDecorations } from '../scene/layout';
import { IslandLivingPanel } from '../components/IslandLivingPanel';
import { useTogether } from '../lib/useTogether';
import { preference, PREFERENCE_LABEL, type TogetherKind } from '../lib/islandLiving';
import { markInteresting } from '../scene/observationInterest';
import { BerryBadge } from '../components/FarmPanel';
import { PicnicPanel } from '../components/PicnicPanel';
import { BERRIES, BERRY_KINDS, newFarm, cropStage, type BerryKind } from '../lib/farm';
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "../store";
import { TopBar } from "../components/TopBar";
import { getPokemon, favoriteFood, friendshipLevel, artUrl } from "../data/pokemon";
import { ACTIVITY, activityAt, skyFor } from "../lib/routine";
import { BEHAVIORS } from "../data/behaviors";
import { sfx, stopSpeech, type Part } from "../lib/speech";
import { sayOnIsland as say, cryOnIsland as playCry, islandAudioAllowed } from '../lib/islandSpeech';
import { useAmbientEnglish } from "../lib/ambient";
import { MicButton } from "../components/MicButton";
import type { InteractKind, Pokemon } from "../types";
import { Hearts, Icon } from "../icons";
import type { Effect } from "../scene/zones";
import type { CameraView } from "../scene/CameraRig";
import { PokeImg } from "../components/PokeImg";
import { Evolution } from "../components/Evolution";
import { facilityLesson } from "../data/learning";
import { visitUnit,learningLevel } from '../data/curriculum';
import { captionParts } from "../lib/captions";
import { useIslandLife } from "../lib/useIslandLife";
import { careRequest, nextCareRequest } from "../lib/companionCare";
import { residentPoses } from "../scene/residentRuntime";
import { stationById, compatible, isAquatic } from "../scene/islandLife";


// 3D 场景单独分包，首页和任务页不用等 Three.js 加载
const HomeScene = lazy(() => import("../scene/HomeScene").then((m) => ({ default: m.HomeScene })));

export function Home({initialStation,initialCompanion,active=true}:{initialStation?:string;initialCompanion?:number;active?:boolean}) {
  const save = useGame((s) => s.save);
  const [decorPreview,setDecorPreview]=useState<DecorPreview|null>(null);
  const [decorFocus,setDecorFocus]=useState<{x:number;z:number;wide?:boolean}|undefined>();
  const displayedLevels=previewLevels(save.islandProgress?.levels,active?decorPreview:null);
  configureIslandExpansion(displayedLevels.island);
  useEffect(()=>{if(!active)setDecorPreview(null);},[active]);
  useEffect(()=>{
    if(!decorPreview){setDecorFocus(undefined);return;}
    const point=decorPreview.kind==='decoration'?DECOR_LAYOUT[decorPreview.id]:({camp:TENT,picnic:PICNIC,garden:FARM_ENTRY,play:PLAYGROUND.music,island:{x:-2,z:-4}})[decorPreview.id];
    setFollowId(null);setView('free');setViewNonce(n=>n+1);setDecorFocus({...point,wide:decorPreview.kind==='upgrade'&&decorPreview.id==='island'});
  },[decorPreview?.kind,decorPreview?.id]);
  configureIslandDecorations(save.islandLiving?.furniture??[]);
  const go = useGame((s) => s.go);
  const interact = useGame((s) => s.interact);
  const noteWord = useGame((s) => s.noteWord);
  const [now, setNow] = useState(new Date());
  const weather=weatherAt(now,save.settings.islandWeather??'auto');
  const blocked=useModalBlocked();
  const [panel,setPanel]=useState<HomePanel|null>(null);
  // Opening one foreground panel replaces the previous one, including camera selection.
  const activatePanel=(next:HomePanel)=>{setPanel(next);if(next!=='companion'){setSelectedState(null);setPrompt(null);}if(next!=='facility')setStationId(null);setFarmMessage('');};
  const closePanel=(target:HomePanel)=>setPanel(current=>current===target?null:current);
  const weatherOpen=panel==='weather';
  const setWeatherOpen=(open:boolean)=>open?activatePanel('weather'):closePanel('weather');
  useEffect(()=>{if(!active)setWeatherOpen(false);},[active]);
  const [immersive,setImmersive] = useState(false);
  const immersiveEntry = useRef<HTMLButtonElement>(null);
  const leaveImmersive = useCallback(()=>{
    setImmersive(false);
    requestAnimationFrame(()=>immersiveEntry.current?.focus());
  },[]);
  useEffect(()=>{if(!active)setImmersive(false);},[active]);
  useEffect(()=>{
    if(!immersive)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();leaveImmersive();}};
    window.addEventListener('keydown',escape);
    return()=>window.removeEventListener('keydown',escape);
  },[immersive,leaveImmersive]);
  const [selected, setSelectedState] = useState<number | null>(null);
  const setSelected=(id:number|null)=>{setSelectedState(id);if(id!==null)activatePanel('companion');else closePanel('companion');};
  const [quickCare,setQuickCare]=useState<{id:number;kind:'feed'|'pet'}|null>(null);
  const selectedRef=useRef(selected);selectedRef.current=selected;
  const activeRef=useRef(active);
  useEffect(()=>{activeRef.current=active;return()=>{activeRef.current=false;};},[active]);
  const [effect, setEffect] = useState<Effect | null>(null);
  const [view, setView] = useState<CameraView>("overview");
  const [viewNonce, setViewNonce] = useState(0);
  const need = nextCareRequest(save.captures);
  const [areaId,setAreaId]=useState<string|null>(null);
  const area=panel==='area'?FACILITY_GROUPS.find(g=>g.id===areaId):undefined;
  const livingOpen=panel==='living';
  const setLivingOpen=(open:boolean)=>open?activatePanel('living'):closePanel('living');
  const [livingUpgrade,setLivingUpgrade]=useState<UpgradeId>();
  const [livingTab,setLivingTab]=useState<"play"|"build">("play");
  const [livingInitialId,setLivingInitialId]=useState<number>();
  const [followId,setFollowId]=useState<number|null>(null);
  const together=useTogether(active,save.captures);
  const life = useIslandLife(save.captures,now,false,livingOpen?undefined:need?.id,together.visits,save.islandLiving?.furniture??[],[selected,followId],weather.kind);
  useEffect(()=>{together.syncArrivals(life.active);},[life.active.map(v=>v.key).join(','),together.session?.id]);
  const [observation,setObservation]=useState<{id:number|null;ready:boolean}>({id:null,ready:false});
  const observing=observation.id;
  const onObserve=useCallback((id:number|null,ready=false)=>setObservation({id,ready}),[]);
  const finderOpen=panel==='finder';
  const setFinderOpen=(open:boolean)=>open?activatePanel('finder'):closePanel('finder');
  const [followStatus,setFollowStatus]=useState('');
  const [careThanks,setCareThanks]=useState<{id:number;text:string}|null>(null);
  useEffect(()=>{
    if(!active)return;
    const timer=setInterval(()=>{if(!document.hidden)useGame.getState().tickCare(10);},10000);
    return()=>clearInterval(timer);
  },[active]);
  useEffect(()=>{
    if(!active||followId===null)return;
    const update=()=>{const pose=residentPoses.get(followId);setFollowStatus(pose?(pose.moving?'正在散步':pose.weather??ACTIVITY[pose.activity].zh):'陪你看看小岛');};
    update();const timer=setInterval(update,700);return()=>clearInterval(timer);
  },[active,followId]);
  const [showGestureHint,setShowGestureHint]=useState(navigator.maxTouchPoints>0);
  const [farmClock,setFarmClock]=useState(Date.now());
  const [farmMessage,setFarmMessage]=useState('');
  const picnicOpen=panel==='picnic';
  const setPicnicOpen=(open:boolean)=>open?activatePanel('picnic'):closePanel('picnic');
  const [picnicInitialId,setPicnicInitialId]=useState<number>();
  const [picnicMessage,setPicnicMessage]=useState('');
  const picnic=save.picnic?.session;
  const picnicKey=useRef<string|null>(null);
  const picnicReady=!!picnic&&life.active.some(v=>v.pokemonId===picnic.pokemonId&&v.manual&&v.key===picnicKey.current);
  const [feedPicker,setFeedPicker]=useState(false);
  const [watering,setWatering]=useState<{index:number;plantedAt:number;key:string;id:number}|null>(null);
  const farm=save.farm??newFarm();
  const trackFarm=farm.plots.some(c=>c && cropStage(c,farmClock)!=='ripe');
  useEffect(()=>{if(!active||!trackFarm)return;setFarmClock(Date.now());const timer=setInterval(()=>setFarmClock(Date.now()),1000);return()=>clearInterval(timer);},[active,trackFarm]);
  useEffect(()=>{if(active&&!document.hidden&&weather.rain>.65)useGame.getState().rainWaterCrops();},[active,farmClock,weather.rain]);
  const waterVisit=watering?life.active.find(v=>v.key===watering.key&&v.pokemonId===watering.id):undefined;
  useEffect(()=>{
    if(!active||!watering||!waterVisit)return;
    let timer:ReturnType<typeof setTimeout>;
    const prepare=()=>{clearTimeout(timer);if(!document.hidden)timer=setTimeout(()=>{
      const completed=useGame.getState().waterCrop(watering.index,watering.plantedAt,watering.id);
      if(completed){
        setFarmMessage('喝饱水啦，小芽开始长大了！');
        sfx('sparkle');void say(['en','Water!']).then(ok=>{if(ok){useGame.getState().noteStationLearning('farm','Water!',true);}});
      }
      setWatering(null);life.cancel();
    },2200);};
    prepare();document.addEventListener('visibilitychange',prepare);
    return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',prepare);};
  },[active,watering,waterVisit?.key]);
  const cancelWater=()=>{setWatering(null);life.cancel();};
  const openFarm=(_index:number=0)=>{setPanel(null);setAreaId(null);setLivingOpen(false);together.cancel();stopSpeech();setPicnicOpen(false);cancelWater();setSelected(null);setPrompt(null);setStationId(null);setFarmMessage('');pickView('farm');};
  const farmRetryAt=useRef(0);
  const lastPlotTap=useRef([0,0,0]);
  const tapPlot=async(index:number)=>{
    if(useGame.getState().saveBusy||useGame.getState().saveIssue)return;
    if(Date.now()-lastPlotTap.current[index]<600)return;
    lastPlotTap.current[index]=Date.now();
    ambient.poke();
    const crop=useGame.getState().save.farm?.plots[index]??null;
    const stage=cropStage(crop);
    if(stage==='empty'){
      if(useGame.getState().plantCrop(index,BERRY_KINDS[index])){
        if(view!=='farm')pickView('farm');
        farmRetryAt.current=0;setFarmClock(Date.now());sfx('pop');
        setFarmMessage('种好啦，伙伴会来浇水。');
      }
    }else if(stage==='ripe'){
      const harvested=await useGame.getState().harvestCrop(index);
      if(!activeRef.current||useGame.getState().saveIssue)return;
      if(harvested){
        setFarmMessage('收获 2 颗树果，装进果篮啦！');sfx('ding');
        void say(['en','Two!'],['en','I did it!']).then(ok=>{if(ok&&activeRef.current){noteWord('count:2','heard');useGame.getState().noteStationLearning('farm','I did it!',true);}});
      }else {setFarmMessage('果篮满啦，先给伙伴吃一点吧。');openPicnic();}
    }else if(stage==='thirsty'){
      farmRetryAt.current=0;
      if(!useGame.getState().save.captures.some(c=>!isAquatic(getPokemon(c.id))))go({name:'catch'});
      else {setFarmClock(Date.now());setFarmMessage('伙伴会按顺序照顾小芽，不用再点啦。');}
    }
  };
  const [stationId,setStationId] = useState<string|null>(null);
  const station = panel==='facility' && stationId ? stationById(stationId) : null;
  const learningUnit=visitUnit(save);
  const courseVisit=station&&learningUnit.station===station.id&&!!save.learning?.units[learningUnit.id]?.completedAt;
  // Describe the real facility activity; a course sentence may refer to a different situation.
  const lesson = station ? facilityLesson(station,learningLevel(save)) : null;
  const facilityRun = useRef(0);
  const learnedFacilityVisit = useRef<string|null>(null);
  useEffect(() => { facilityRun.current++; return () => { facilityRun.current++; }; }, [stationId, selected,active]);
  const readLesson = async () => {
    if (!lesson) return;
    const ticket = ++facilityRun.current;
    ambient.poke();
    const ok = await say(...bi(["en",lesson.en,lesson],["zh",lesson.zh,lesson]));
    if (ok && ticket === facilityRun.current) {
      const visit=station&&life.active.find(v=>v.manual&&v.station.id===station.id);
      if(visit){
        const action=learnedFacilityVisit.current!==visit.key;
        learnedFacilityVisit.current=visit.key;
        useGame.getState().noteStationLearning(station!.id,lesson.en,action);
      }else noteWord(lesson.en,'heard');
    }
  };
  const pickView = (v: CameraView) => {
    ambient.poke();
    sfx("click");
    setView(v);
    if(v!=="follow")setFollowId(null);
    setViewNonce((n) => n + 1);
  };
  const [lastPhrase,setLastPhrase]=useState<{id:number;en:string;zh:string}|null>(null);
  const [prompt, setPrompt] = useState<{ en: string; zh: string } | null>(null);
  const interactionRun = useRef(0);
  useEffect(() => {
    interactionRun.current++;
    return () => { interactionRun.current++; };
  }, [selected,active]);

  const captures = save.captures;
  const roster=captures.map(c=>c.id).join(',');
  useEffect(()=>{
    if(selected!==null&&!captures.some(c=>c.id===selected)){setSelected(null);setPrompt(null);}
    if(followId!==null&&!captures.some(c=>c.id===followId)){setFollowId(null);setView('free');}
  },[roster,selected,followId]);
  useEffect(()=>{if(!active){setPrompt(null);setFinderOpen(false);setAreaId(null);}},[active]);
  useEffect(()=>{
    if(watering&&(!active||!captures.some(c=>c.id===watering.id))){cancelWater();setFarmMessage('回来后，伙伴会继续照顾小芽。');}
  },[active,roster,watering?.id]);
  // The persisted thirsty crop is the queue. A visit interrupted by another
  // activity resumes on return, without losing seeds or claiming fake watering.
  useEffect(()=>{
    if(weather.rain>.65||!active||document.hidden||watering||selected!==null||stationId!==null||livingOpen||picnicOpen||together.session||Date.now()<farmRetryAt.current)return;
    const index=farm.plots.findIndex(c=>c&&cropStage(c)==='thirsty');
    if(index<0)return;
    const helpers=captures.filter(c=>!isAquatic(getPokemon(c.id)));
    if(!helpers.length)return;
    const helper=helpers[Math.floor(Math.random()*helpers.length)];
    const request=life.invite(`farm-${index}`,false,helper.id);
    if(request){setWatering({index,plantedAt:farm.plots[index]!.plantedAt,key:`manual-${request.nonce}`,id:helper.id});}
  },[weather.rain,active,farmClock,roster,watering,selected,stationId,livingOpen,picnicOpen,together.session,farm.plots.map(c=>`${c?.plantedAt}:${c?.wateredAt}`).join(',')]);
  useEffect(()=>{
    if(!farmMessage)return;
    const timer=setTimeout(()=>setFarmMessage(''),6500);return()=>clearTimeout(timer);
  },[farmMessage]);
  const mode = save.settings.englishMode ?? "bilingual";
  /** 纯英文模式下去掉中文提示 */
  const bi = (...parts: Part[]) => captionParts(parts).filter((p) => mode === "bilingual" || typeof p === "number" || p[0] === "en");
  const residents = life.residents.map((c) => getPokemon(c.id));
  // 家园环境英语（磨耳朵）：空闲时旁白描述宝可梦正在做的事
  const ambient = useAmbientEnglish({
    pokemon: residents,
    enabled: active && !blocked && !immersive && captures.length > 0,
    level: save.settings.ambientEnglish ?? "some",
    mode,
    busy: panel!==null,
    focusId: observing ?? followId,
    focusReady: observing!==null ? observation.ready : followId!==null,
    activityFor: id => { const pose=residentPoses.get(id); return pose ? pose.moving ? 'explore' : pose.activity : undefined; },
    facilityActivities: Object.fromEntries(life.visits.map(v=>[v.pokemonId,life.active.some(a=>a.key===v.key&&a.pokemonId===v.pokemonId)?v.station.activity:"explore"])),
    onFocus: (id) => setEffect({ id, kind: "pet", icon: "sparkle", at: performance.now() })
  });
  const announcedLesson = useRef<string|null>(null);
  const manualReady = life.active.find(v=>v.manual)?.key;
  useEffect(()=>{
    if(active && manualReady && lesson && !selected && announcedLesson.current!==manualReady){
      announcedLesson.current=manualReady;readLesson();
    }
    // A facility speaks once after arrival; replay remains a deliberate child action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[manualReady, selected, active]);
  const sky = skyFor(now);
  const ballsTotal = Object.values(save.balls).reduce((a, b) => a + b, 0);

  // 每 2 秒刷新天气目标；帧内平滑过渡，作息和天色随之变化
  useEffect(() => {
    if(!active)return;
    const update=()=>{if(!document.hidden)setNow(new Date());};update();
    const t = setInterval(update, 2000);
    document.addEventListener('visibilitychange',update);
    return () => {clearInterval(t);document.removeEventListener('visibilitychange',update);};
  }, [active]);

  useEffect(() => {
    if(!active)return;
    if (captures.length === 0) {
      const t = setTimeout(() => say(["zh", "家园里还空空的，去草丛抓宝可梦吧！"], ["en", "Let's catch a Pokémon!"]), 1800);
      return () => { clearTimeout(t); stopSpeech(); };
    }
    return () => stopSpeech();
  }, [captures.length,active]);

  const inviteStation = (id:string,cycle=false) => {
    if(id.startsWith('area-')){ambient.poke();stopSpeech();activatePanel('area');setAreaId(id.slice(5));return;}
    setAreaId(null);
    if(id==='upgrades'||id.startsWith('upgrades:')){openLiving(undefined,'build',UPGRADES.find(u=>u.id===id.split(':')[1])?.id);return;}
    if(id==='ball'||id==='together-ball'||id==='together-rest'){
      openLiving();
      // A story's invitation already chose the activity; do not ask the child again.
      if(id!=='ball'&&captures.length)beginTogether(id==='together-rest'?'rest':'ball',[captures[0].id],false);
      return;
    }
    setLivingOpen(false);together.cancel();
    if(id==='picnic'){openPicnic();return;}
    setPicnicOpen(false);
    if(id==='farm'||id==='flowers'||/^farm-[0-2]$/.test(id)){openFarm(id==='flowers'||id==='farm'?0:Number(id.slice(-1)));return;}
    cancelWater();
    const s=stationById(id);
    stopSpeech(); setSelected(null);setPrompt(null);setStationId(id);activatePanel('facility');
    life.invite(id,cycle);pickView(s.district);
  };
  useEffect(()=>{if(active&&initialStation)inviteStation(initialStation);},[initialStation,active]); // Deliberate handoff from the lesson to a real island visit.

  useEffect(()=>{
    if(!active||initialCompanion===undefined)return;
    if(save.captures.some(c=>c.id===initialCompanion))tapPokemon(getPokemon(initialCompanion),false);
    // Consume the handoff. Reopening another panel must not select it again.
    useGame.getState().go({name:'home'});
  },[active,initialCompanion]);
  useEffect(()=>{if(!careThanks)return;const timer=setTimeout(()=>setCareThanks(null),5000);return()=>clearTimeout(timer);},[careThanks]);

  const tapPokemon = (p: Pokemon, greet=true) => {
    setQuickCare(null);setCareThanks(null);setAreaId(null);
    selectedRef.current=p.id;
    stopSpeech();setFinderOpen(false);
    setLivingOpen(false);together.cancel();
    setPicnicOpen(false);
    cancelWater();setFeedPicker(false);setStationId(null);
    if(followId!==null && followId!==p.id)setFollowId(p.id);
    ambient.poke();
    sfx("pop");
    setSelected(p.id);
    setPrompt(null);
    if(!greet)return;
    const pose=residentPoses.get(p.id);
    const a = pose ? pose.moving ? 'explore' : pose.activity : life.active.find(v=>v.pokemonId===p.id)?.station.activity ?? activityAt(p);
    const trait = BEHAVIORS[p.id]?.trait;
    const A = ACTIVITY[a];
    // 幼儿英语：短句 + 拟声词，英文在前、中文提示在后
    if (a === "sleep" || a === "nap") {
      say(...bi(["en", `Shh… ${p.nameEn} ${A.en}.`], 300, ["en", A.sound], 400, ["zh", `嘘，${p.nameZh}${A.zh}。`]));
    } else {
      playCry(p.id).then(() => { if(!activeRef.current||useGame.getState().screen.name!=="home"||selectedRef.current!==p.id)return; return say(
          ...bi(
            ["en", `Hi! I'm ${p.nameEn}!`],
            350,
            ["en", `${p.nameEn} ${A.en}.`],
            ["en", A.sound],
            400,
            ["zh", `${p.nameZh}${A.zh}。`],
            ...(trait ? ([400, ["en", trait.en], ["zh", trait.zh]] as Part[]) : [])
          )
        );}
      );
    }
  };

  const doInteract = async (p: Pokemon, kind: InteractKind) => {
    const run = ++interactionRun.current;
    setFeedPicker(false);ambient.poke();
    interact(p.id, kind);
    setCareThanks({id:p.id,text:kind==='feed'?'吃饱啦，谢谢你！':kind==='pet'?'有你陪我，真开心！':'晚安，陪我安静休息吧。'});
    const icon = kind === "feed" ? favoriteFood(p).icon : kind === "pet" ? "heart" : "moon";
    setEffect({ id: p.id, kind, icon, at: performance.now() });
    sfx(kind === "feed" ? "pop" : "sparkle");
    let phrase: { en: string; zh: string };
    let heard=false;
    if (kind === "pet") {
      phrase = { en: "I'm happy!", zh: "我很开心！" };
      heard=await say(...bi(["en", `${p.nameEn} is happy!`], ["en", "Hee hee! I'm happy!"], 300, ["zh", `${p.nameZh}好开心！`]));
    } else if (kind === "feed") {
      const f = favoriteFood(p);
      phrase = { en: "Yummy!", zh: "好吃！" };
      heard=await say(...bi(["en", `Here is ${f.one} for you!`], ["zh", `给你吃${f.zh}！`], ["en", "Yummy! Thank you!"]));
    } else {
      phrase = { en: "Good night!", zh: "晚安！" };
      heard=await say(...bi(["en", `Good night, ${p.nameEn}!`], ["zh", `${p.nameZh}，晚安！`]));
    }
    if (run !== interactionRun.current) return;
    setLastPhrase({id:p.id,...phrase});
    if(heard){useGame.getState().noteStationLearning('companion',phrase.en,true);}
  };

  const shareBerry=(p:Pokemon,berry:BerryKind)=>{
    const before=useGame.getState().save.captures.find(c=>c.id===p.id)?.friendship??0;
    if(!useGame.getState().feedBerry(p.id,berry))return;
    const after=useGame.getState().save.captures.find(c=>c.id===p.id)!.friendship;
    setFeedPicker(false);ambient.poke();setEffect({id:p.id,kind:'feed',icon:'heart',at:performance.now()});
    setCareThanks({id:p.id,text:`吃到你种的${BERRIES[berry].name}啦！${after>before?`好感 +${after-before}`:'好感已满'}`});
    sfx('sparkle');void say(['en','Yummy! Thank you!']).then(ok=>{if(ok){noteWord('Yummy!','heard');useGame.getState().noteStationLearning('farm','Thank you!',true);}});
  };
  const openPicnic=(id?:number)=>{
    setAreaId(null);setLivingOpen(false);together.cancel();
    stopSpeech();cancelWater();setSelected(null);setStationId(null);setPrompt(null);
    setPicnicInitialId(id);setPicnicMessage('');setPicnicOpen(true);pickView('leisure');
  };
  const invitePicnic=()=>{
    if(!picnic||picnic.servedAt)return;
    const water=isAquatic(getPokemon(picnic.pokemonId));
    const request=life.invite(water?'shore':'picnic',false,picnic.pokemonId);
    picnicKey.current=request?`manual-${request.nonce}`:null;
    pickView(water?'beach':'leisure');
  };
  useEffect(()=>{
    if(active&&picnicOpen&&picnic&&!picnic.servedAt)invitePicnic();
    return()=>{picnicKey.current=null;};
  },[active,picnicOpen,picnic?.id]);
  useEffect(()=>{
    if(!active){setPanel(null);setSelected(null);setLivingOpen(false);setPicnicOpen(false);setStationId(null);cancelWater();stopSpeech();}
  },[active]);
  useEffect(()=>{
    if(life.timedOut&&watering){farmRetryAt.current=Date.now()+15000;setWatering(null);setFarmMessage('伙伴绕路休息一下，稍后会再来。');}
  },[life.timedOut,watering]);
  useEffect(()=>{
    if(picnic&&!captures.some(c=>c.id===picnic.pokemonId)){useGame.getState().endPicnic(picnic.id);setPicnicOpen(false);life.cancel();}
  },[roster,picnic?.id]);
  const closePicnic=()=>{
    if(picnic)useGame.getState().endPicnic(picnic.id);
    setPicnicOpen(false);life.cancel();stopSpeech();
  };
  const hearPicnic=()=>{void say(['en','Thank you!']).then(ok=>{if(ok&&activeRef.current)noteWord('Thank you!','heard');});};
  const servePicnic=()=>{
    if(!picnicReady||!picnic||!activeRef.current||document.hidden)return;
    if(!useGame.getState().servePicnic(picnic.id)){setPicnicMessage('树果已经用完啦，可以去果园再准备一些。');return;}
    markInteresting([picnic.pokemonId]);
    setEffect({id:picnic.pokemonId,kind:'feed',icon:'heart',at:performance.now()});sfx('sparkle');
    void say(['en','Yummy! Thank you!']).then(ok=>{if(ok&&activeRef.current){useGame.getState().noteStationLearning('picnic','Thank you!',true);}});
  };
  const openLiving=(id?:number,tab:"play"|"build"="play",upgrade?:UpgradeId)=>{
    setAreaId(null);setLivingTab(tab);setLivingUpgrade(upgrade);
    stopSpeech();cancelWater();setPicnicOpen(false);setSelected(null);setStationId(null);setPrompt(null);setLivingInitialId(id);setLivingOpen(true);pickView('free');
  };
  const beginTogether=(kind:TogetherKind,ids:number[],coast:boolean)=>{
    stopSpeech();life.cancel();together.begin(kind,ids,coast);pickView('together');
  };
  const hearLiving=(word:string)=>{void say(['en',word]).then(ok=>{if(ok&&activeRef.current)noteWord(word,'heard');});};
  const sel = selected ? getPokemon(selected) : null;
  const evolve = useGame((s) => s.evolve);
  const stayAsIs = useGame((s) => s.stayAsIs);
  const [evolving, setEvolving] = useState<number | null>(null);
  /** 满友好度、还有下一阶段（且那个形态还不在伙伴里）才能进化 */
  const evoOptions = (p: Pokemon) => p.evolvesTo.filter((id) => !captures.some((c) => c.id === id)).map(getPokemon);
  const selNeed = selected ? careRequest(save.captures.find(c=>c.id===selected)!) : null;
  const following = followId ? getPokemon(followId) : null;
  const selCap = selected ? captures.find((c) => c.id === selected) : null;

  const hint=homeHint({active,immersive,blocked:blocked||evolving!==null,panel,farm:!!farmMessage,follow:!!following,picnic:!!picnic,care:!!need,observe:observing!==null,gesture:showGestureHint});
  useEffect(()=>{
    if(hint!=='care'||!need)return;
    const timer=setTimeout(()=>{if(!document.hidden)useGame.getState().deferCare(need.id);},30000);
    return()=>clearTimeout(timer);
  },[hint,need?.id,need?.kind]);
  useEffect(()=>{
    if(!quickCare)return;
    if(!active||selected!==quickCare.id){setQuickCare(null);return;}
    if(blocked)return;
    setQuickCare(null);void doInteract(getPokemon(quickCare.id),quickCare.kind);
  },[quickCare,active,blocked,selected]);
  useEffect(()=>{
    const escape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||event.defaultPrevented||blocked||!active||!panel)return;
      event.preventDefault();stopSpeech();
      if(panel==='companion'&&(feedPicker||prompt)){setFeedPicker(false);setPrompt(null);return;}
      if(panel==='picnic'){closePicnic();return;}
      if(panel==='living')together.cancel();
      if(panel==='living'||panel==='facility')life.cancel();
      setSelected(null);setStationId(null);setAreaId(null);setPanel(null);
    };
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[active,blocked,panel,feedPicker,prompt,picnic?.id]);
  // Fruit was deliberately selected once. Sharing proceeds after the real arrival.
  const servingPicnic=useRef<string|null>(null);
  useEffect(()=>{
    if(!active||document.hidden||blocked||!picnicOpen||!picnicReady||!picnic||picnic.servedAt||servingPicnic.current===picnic.id)return;
    servingPicnic.current=picnic.id;servePicnic();
  },[active,blocked,picnicOpen,picnicReady,picnic?.id,picnic?.servedAt,now]);

  return (
    <div className={`screen home sky-${sky}${immersive?" is-immersive":""}`} data-home-panel={panel??undefined} data-hint={hint??undefined} data-modal-blocked={blocked||undefined}>
      {panel!=='companion'&&<TopBar title={`${save.trainer?.name ?? ""}的家园`} homeActions={active&&!livingOpen&&!sel&&!station&&!picnicOpen?<>
        <Announcements active={active}/>
        <button onClick={()=>openLiving()}><Icon name="ball" size={30}/><span>一起玩</span></button>
        <details className="home-more" open={panel==='menu'}><summary onClick={e=>{e.preventDefault();if(panel==='menu')closePanel('menu');else activatePanel('menu');}}><Icon name="island" size={30}/><span>小岛生活</span><span aria-hidden="true">⌄</span></summary><div className="home-more-menu" onClick={()=>closePanel('menu')}>
        <button onClick={()=>openLiving(undefined,'build')}><Icon name="island" size={30}/><span>装扮</span></button>
        <button onClick={()=>{stopSpeech();go({name:'diary'});}}><Icon name="diary" size={30}/><span>小日记</span></button>
        {evolving===null&&<button ref={immersiveEntry} aria-label="隐藏界面，观赏小岛" onClick={()=>{stopSpeech();ambient.poke();setFinderOpen(false);setAreaId(null);setShowGestureHint(false);setImmersive(true);}}><Icon name="eye" size={28}/><span>看风景</span></button>}
        </div></details>
      </>:undefined} />}
      {immersive&&<button autoFocus className="immersive-exit" onClick={leaveImmersive} aria-label="退出沉浸模式，显示界面"><Icon name="back" size={24}/><span>显示界面</span></button>}
      {active&&!immersive&&(panel===null||weatherOpen)&&<WeatherBadge weather={weather} open={weatherOpen} onOpen={setWeatherOpen}/>}
      <FeatureGuide id={captures.length?(view==='farm'?'farm':'home'):'firstFriend'} floating enabled={hint==='guide'} topics={captures.length?['home','farm','camera','music']:undefined}/>
      <div className={`sky-backdrop sky-${sky}`} aria-hidden>
      </div>
      <div className="meadow">
        <Suspense fallback={<div className="scene-loading"><div className="sl-ball" /><div>正在布置家园…</div></div>}>
          <HomeScene interactionId={panel==='facility'?life.manual?.pokemonId:picnicOpen?picnic?.pokemonId:undefined} spotlight={decorFocus} upgrades={displayedLevels} livingItems={save.islandLiving?.furniture??[]} together={together.session?{session:together.session,turn:together.turn,progress:together.progress,acting:together.phase==='acting',ready:together.arrived}:undefined} active={active} previewing={!!decorPreview} showInterface={!immersive&&!blocked&&!decorPreview&&panel!=='companion'&&!together.session} need={hint==='care'?need:null} followId={followId}
            idleBlockReason={blocked?"全局弹窗打开":area?"选择小岛活动":finderOpen?"伙伴册打开":livingOpen?"小岛生活互动":save.settings.idleCamera===false?"家长已关闭闲置观察":selected!==null?"宝可梦卡片打开":stationId!==null?"场景互动打开":evolving!==null?"进化中":picnicOpen?"野餐面板打开":""}
            idleAllowed={!blocked&&panel===null&&save.settings.idleCamera!==false&&evolving===null} onObserve={onObserve}
            picnic={picnicOpen?picnic:undefined}
            visits={life.visits} activeVisits={life.active} onArrival={life.arrive} onStation={inviteStation}
            captures={life.residents}
            now={now}
            sky={sky} weather={weather}
            selected={selected}
            effect={immersive?null:effect}
            onSelect={(id) => {if(!immersive)tapPokemon(getPokemon(id));}}
            onDeselect={() => { if(immersive)return; setAreaId(null);closePanel('area');closePanel('weather');closePanel('menu');ambient.poke(); if (selected) { setSelected(null); setPrompt(null); } }}
            view={view}
            viewNonce={viewNonce}
            onManualPan={() => {setDecorFocus(undefined);if(view!=="follow")setView("free");setShowGestureHint(false);}}
            hqLighting={!!save.settings.hqLighting}
            farm={{open:panel!==null||blocked,farm:save.farm,clock:farmClock,watering:waterVisit&&typeof watering?.index==='number'?watering.index:null,gardenerId:watering?.id,onPlot:tapPlot,working:watering?.index??null,helperId:watering?.id,canWater:captures.some(c=>!isAquatic(getPokemon(c.id)))}}
          />
        </Suspense>
        {active && !blocked && !immersive && captures.length === 0 && panel===null && (
          <div className="empty-home">
            <div className="sign"><Icon name="sign" size={40} /> 家园还空空的</div>
            <button className="btn-big" onClick={() => go({ name: "catch" })}><Icon name="grass" size={44} /> 去草丛抓宝可梦</button>
          </div>
        )}
      </div>

      {active&&!livingOpen&&!station&&!picnicOpen&&evolving===null&&captures.length>0&&<>
        {panel===null&&!blocked&&<button className="companions-launch" onClick={()=>{ambient.poke();stopSpeech();setFinderOpen(true);}} aria-label="找伙伴" aria-expanded={false}>
          <PokeImg src={artUrl((following??residents[0]).id)} alt=""/><span>找伙伴</span><Icon name="search" size={20}/>
        </button>}
        {finderOpen&&<CompanionFinder ids={captures.map(c=>c.id)} selected={selected} onSelect={id=>tapPokemon(getPokemon(id))} onClose={()=>{setFinderOpen(false);ambient.poke();}}/>}
      </>}
      {active&&livingOpen&&<IslandLivingPanel onPreview={setDecorPreview} save={save} together={together} initialId={livingInitialId} initialTab={livingTab} initialUpgrade={livingUpgrade} onBegin={beginTogether}
        onClose={()=>{setLivingOpen(false);together.cancel();life.cancel();stopSpeech();pickView('overview');}}
        onPicnic={id=>openPicnic(id)}
        onStory={id=>{together.cancel();go({name:'story',id});}} onNotebook={()=>{together.cancel();go({name:'notebook'});}} onHear={hearLiving}/>}
      {hint==='observe'&&observing!==null&&<div className="idle-observe-status" role="status">正在看{getPokemon(observing).nameZh}<small>轻触屏幕，自己逛逛</small></div>}
      {hint==='care' && need && <aside className="care-request" aria-label="伙伴的小心愿">
        <button className="care-open" onClick={()=>{setCareThanks(null);tapPokemon(getPokemon(need.id),false);setQuickCare({id:need.id,kind:need.kind});}}><PokeImg src={artUrl(need.id)} alt=""/><span><strong>{getPokemon(need.id).nameZh}{need.kind==='feed'?'肚子饿啦':'想让你摸摸'}</strong><small>{need.kind==='feed'?'点一下，喂我小点心':'点一下，摸摸我'}</small></span><Icon name={need.kind==='feed'?'apple':'heart'} size={32}/></button>
        <button className="care-later" aria-label="等一会再陪它" onClick={()=>useGame.getState().deferCare(need.id)}>等一会</button>
      </aside>}
      {hint==='follow' && following && <aside className="follow-status" aria-label="跟随状态"><button onClick={()=>tapPokemon(following)}><Icon name="target" size={25}/><span><strong>跟着{following.nameZh}</strong><small>{need?.id===followId?(need.kind==='feed'?'想吃点心':'想让你摸摸'):followStatus}</small></span></button><button onClick={()=>pickView('free')} aria-label="停止跟随">结束</button></aside>}
      {active&&area&&<section className="area-choices" aria-label={area.label}>
        <header className="panel-toolbar"><Icon name={area.icon} size={28}/><strong>{area.label}</strong><FeatureGuide compact id="area" autoVoice={false}/><button onClick={()=>{setAreaId(null);closePanel('area');}} aria-label="关闭活动选择"><Icon name="close" size={24}/></button></header>
        <div>{area.choices.map(id=>{const s=stationById(id);return <button key={id} onClick={()=>inviteStation(id)}><Icon name={id==='picnic'?'bowl':id==='farm'?'grass':id==='pier'?'eye':id==='sea'?'fish':s.icon} size={48}/><span>{id==='farm'?'种树果':s.name}</span></button>;})}</div>
      </section>}
      {hint==='farm'&&<aside className="farm-feedback" role="status">
        <Icon name={farmMessage.includes('收获')?'apple':'grass'} size={30}/><span>{farmMessage}</span>
        {BERRY_KINDS.some(k=>farm.basket[k]>0)&&<button onClick={()=>openPicnic()}><Icon name="bowl" size={28}/>喂伙伴</button>}
        <button onClick={()=>setFarmMessage('')} aria-label="收起种植提示"><Icon name="close" size={22}/></button>
      </aside>}
      {active&&picnicOpen&&<PicnicPanel captures={captures} farm={farm} session={picnic} initialId={picnicInitialId} ready={picnicReady} unreachable={life.timedOut} message={picnicMessage}
        onBegin={(id,berry)=>{if(!useGame.getState().beginPicnic(id,berry))setPicnicMessage('请重新选一颗还有的树果。');}}
        onSnack={id=>{closePicnic();tapPokemon(getPokemon(id),false);setQuickCare({id,kind:'feed'});}} onFind={()=>{closePicnic();go({name:'catch'});}}
        onServe={servePicnic} onClose={closePicnic} onFarm={()=>openFarm()} onRetry={invitePicnic} onHear={hearPicnic}
        onStory={()=>{closePicnic();go({name:'story',id:'magic-words'});}}
        onNotebook={()=>{closePicnic();go({name:'notebook'});}}/>}
      {hint==='picnic'&&picnic&&<button className="picnic-resume" onClick={()=>openPicnic()}>{picnic.servedAt?'看看野餐回忆':'继续伙伴野餐'}</button>}
      {!sel && station && <section className="facility-panel" aria-label={station.name}>
        <button className="facility-close" aria-label="结束设施互动" onClick={()=>{setStationId(null);closePanel('facility');life.cancel();pickView('overview');}}><Icon name="close" size={26}/></button>
        <Icon name={station.icon} size={40}/>
        <div role="status" aria-live="polite"><strong>{life.manual ? `${getPokemon(life.manual.pokemonId).nameZh}${life.active.some(v=>v.manual)?(station.action.startsWith('在')?station.action:'在'+station.action):'来啦…'}` : '一起找个小伙伴吧'}</strong>
          <span>{life.timedOut?'这条路有点挤，可以换个伙伴，或先回小岛。':life.manual ? life.active.some(v=>v.manual)?'你也来看看它的发现吧！':'伙伴正在走过来，等一等哦' : captures.length ? station.water ? '需要喜欢水的小伙伴来这里玩' : '这里适合在陆地活动的小伙伴':'先去草丛认识宝可梦'}</span></div>
        {lesson && life.active.some(v=>v.manual) && <button className="facility-lesson" onClick={readLesson}><Icon name="speaker" size={28}/><span><b lang="en">{lesson.en}</b><small>{lesson.zh}</small></span></button>}
        {courseVisit&&<button className="facility-learning-link" onClick={()=>go({name:'journey'})}>{save.learning?.units[learningUnit.id]?.encounteredAt?'到过对应场景啦':'回冒险路线'}</button>}
        {captures.filter(c=>compatible(getPokemon(c.id),station)).length>1 ? <button className="facility-next" onClick={()=>inviteStation(station.id,true)}><Icon name="refresh" size={28}/>换个伙伴</button> : !life.manual ? <button className="facility-next" onClick={()=>go({name:'catch'})}><Icon name="grass" size={28}/>去找伙伴</button> : null}
      </section>}
      {active && evolving !== null && (
        <Evolution
          from={getPokemon(evolving)}
          options={evoOptions(getPokemon(evolving))}
          onDone={(to) => {
            const from = evolving;
            setEvolving(null);
            if (to) {
              evolve(from, to);
              setSelected(to);
            } else stayAsIs(from);
          }}
        />
      )}

      {active && panel==='companion' && sel && selCap && (
        <>
        <CompanionStrip ids={captures.map(c=>c.id)} selected={sel.id} onSelect={id=>tapPokemon(getPokemon(id))} onClose={()=>{setSelected(null);setPrompt(null);stopSpeech();}}/>
        <section className={`sheet companion-card camp-summary ${feedPicker||prompt?'camp-detail':''}`} aria-label={`${sel.nameZh}的互动卡片`}>
          <nav className="companion-toolbar" aria-label="伙伴互动导航">
            {(feedPicker||prompt)?<button className="companion-back" aria-label="返回伙伴互动" onClick={()=>{setFeedPicker(false);setPrompt(null);stopSpeech();}}><Icon name="back" size={24}/>返回</button>:<span>和伙伴一起</span>}
            <FeatureGuide compact id={feedPicker?"feed":"care"} enabled={!prompt} autoVoice={false}/>

          </nav>
          <div className="sheet-body">
            <header className="companion-heading">
              <PokeImg className="sheet-art" src={artUrl(sel.id)} alt="" />
              <div><h2 className="sheet-name">{sel.nameZh}</h2><div className="companion-friendship" aria-label={`友好度 ${friendshipLevel(selCap.friendship)} 颗心`}><Hearts n={friendshipLevel(selCap.friendship)} /></div></div>

            </header>

            {!feedPicker&&!prompt&&<p className="living-preference">{PREFERENCE_LABEL[preference(selCap)]}{save.islandLiving?.memories.find(m=>m.partners.includes(sel.id))?.kind==='ball'?' · 上次我们一起玩了球':save.islandLiving?.memories.find(m=>m.partners.includes(sel.id))?.kind==='rest'?' · 记得我们一起休息过':''}</p>}
            {(selNeed || careThanks?.id===sel.id) && <div className="companion-wish" role="status"><Icon name={selNeed?.kind==='feed'?'apple':'heart'} size={24}/>{careThanks?.id===sel.id?careThanks.text:selNeed?.kind==='feed'?'我肚子饿啦，喂我一点点心吧！':'可以摸摸我吗？我想和你一起玩。'}</div>}
            {feedPicker ? <div className="berry-menu">
              <h3>选一份小点心</h3><p>{BERRY_KINDS.some(k=>farm.basket[k]>0)?'点一下，就能分享给伙伴。':'果篮还空着，可以先分享普通点心。'}</p>
              {BERRY_KINDS.filter(k=>farm.basket[k]>0).map(k=><button key={k} onClick={()=>shareBerry(sel,k)}><BerryBadge kind={k}/><span>{BERRIES[k].name}<small>我的果篮 ×{farm.basket[k]}</small></span><Icon name="heart" size={23}/></button>)}
              <div className="berry-menu-footer"><button onClick={()=>doInteract(sel,'feed')}><Icon name="apple" size={26}/>普通点心</button><button onClick={()=>{setFeedPicker(false);openFarm();}}><Icon name="grass" size={26}/>去种树果</button></div>
            </div> : prompt ? (
              <div className="say-back">
                <button className="companion-listen" onClick={() => say(["en", prompt.en])}><Icon name="speaker" size={30} />再听一句</button>
                <MicButton size={80} onResult={(r) => {
                  if (!islandAudioAllowed() || selectedRef.current !== sel.id) return;
                  setPrompt(null);
                  if (r.voiced||r.confirmed) {
                    noteWord(prompt.en, "spoken");
                    sfx("ding");
                    say(["en", "Great job!"], ["zh", `${sel.nameZh}听到啦！`]);
                    playCry(sel.id);
                  } else {
                    say(["zh", "没关系，下次再说吧！"]);
                  }
                }} />

              </div>
            ) : (
              null
            )}

          </div>
        </section>
        {!feedPicker&&!prompt&&<section className="camp-controls" aria-label="和伙伴互动">              <div className="actions camp-primary-actions">
                {lastPhrase?.id===sel.id&&<button className="act" onClick={()=>{setPrompt(lastPhrase);void say(["en",lastPhrase.en]);}}><Icon name="speak" size={32}/>我想说一句</button>}
                <button className={`act follow-action ${followId === sel.id ? "following" : ""}`} aria-pressed={followId === sel.id} onClick={() => { const starting=followId!==sel.id; pickView(starting ? "follow" : "free"); if(starting){setFollowId(sel.id);setSelected(null);setPrompt(null);} if(starting) say(...bi(["en","Follow me!",{en:"Follow me!",zh:"跟着我走吧！"}],["zh","跟着我走吧！"])); }}><Icon name="target" size={32} />{followId === sel.id ? "停止跟随" : "跟着走"}</button>
                <button className={`act pet-action ${selNeed?.kind==='pet'?'requested':''}`} onClick={() => doInteract(sel, "pet")}><Icon name="hand" size={32} />摸摸</button>
                <button className={`act ${selNeed?.kind==='feed'?'requested':''}`} onClick={() => doInteract(sel,'feed')}><Icon name={favoriteFood(sel).icon} size={32} />喂点心</button>
                <button className="act" onClick={()=>{setFeedPicker(true);setCareThanks(null);stopSpeech();}}><Icon name="bowl" size={32}/>分享树果</button>
                <button className="act" onClick={()=>openLiving(sel.id)}><Icon name="balloon" size={32}/>一起玩</button>
                {friendshipLevel(selCap.friendship) >= 5 && evoOptions(sel).length > 0 && (
                  <button className={`act evolve ${selCap.stay ? "" : "pulse"}`} onClick={() => { stopSpeech(); setEvolving(sel.id); }}>
                    <Icon name="sparkle" size={28} />可以进化啦
                  </button>
                )}
              </div>            {!feedPicker&&!prompt&&<details className="companion-more"><summary><Icon name="heart" size={22}/>更多陪伴<span aria-hidden="true">⌄</span></summary><div className="actions">
                <button className="act" onClick={() => doInteract(sel, "night")}><Icon name="moon" size={32} />晚安</button>
                <button className="act" onClick={() => playCry(sel.id)}><Icon name="speaker" size={32} />叫声</button>
                <button className="act" onClick={() => go({ name: "dexDetail", id: sel.id })}><Icon name="dex" size={32} />图鉴</button>
              </div>

            </details>}</section>}
        </>
      )}

      {hint==='gesture' && <div className="camera-gesture-hint">单指转一转 · 双指拖动 · 捏合缩放<button aria-label="关闭镜头操作提示" onClick={()=>setShowGestureHint(false)}>×</button></div>}
      {active && !blocked && panel===null && (
        <nav className="dock" aria-label="家园主菜单">
          <button className="dock-btn tasks" onClick={() => go({ name: "tasks" })}>
            <Icon name="tasks" size={62} className="ico" />学英语
          </button>
          <button className="dock-btn catch" onClick={() => go({ name: "catch" })}>
            <Icon name="grass" size={62} className="ico" />草丛{ballsTotal > 0 && <span className="badge">{ballsTotal}</span>}
          </button>
          <button className="dock-btn stories" onClick={() => go({ name: "stories" })}><Icon name="book" size={62} className="ico" />故事屋</button>
          <button className="dock-btn dex" onClick={() => go({ name: "dex" })}>
            <Icon name="dex" size={62} className="ico" />图鉴
          </button>
        </nav>
      )}
    </div>
  );
}
