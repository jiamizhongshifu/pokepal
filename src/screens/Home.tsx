import {FarmFeedback,type FarmNotice} from '../components/FarmFeedback';
import {CompanionStrip} from '../components/CompanionStrip';
import {previewLevels,type DecorPreview} from '../lib/decorPreview';
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
import { BERRIES, BERRY_KINDS, newFarm, cropStage, HARVEST_COUNT, BASKET_CAP, type BerryKind } from '../lib/farm';
import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "../store";
import { BottomNav } from '../components/BottomNav';
import { TopBar } from "../components/TopBar";
import { getCreature, favoriteFood, friendshipLevel, creatureArt } from "../data/creatures";
import { ACTIVITY, activityAt, skyFor } from "../lib/routine";
import { BEHAVIORS } from "../data/behaviors";
import { sfx, stopSpeech, type Part } from "../lib/speech";
import { sayOnIsland as say, cryOnIsland as playCry, islandAudioAllowed } from '../lib/islandSpeech';
import { useAmbientEnglish } from "../lib/ambient";
import { MicButton } from "../components/MicButton";
import type { InteractKind, Creature } from "../types";
import { Hearts, Icon } from "../icons";
import type { Effect } from "../scene/zones";
import { IslandMap } from "../island/IslandMap";
import { CreatureImg } from "../components/CreatureImg";
import { Evolution } from "../components/Evolution";
import { facilityLesson } from "../data/learning";
import { visitUnit,learningLevel } from '../data/curriculum';
import { captionParts } from "../lib/captions";
import { useIslandLife } from "../lib/useIslandLife";
import { careRequest, nextCareRequest } from "../lib/companionCare";
import { stationById, compatible, isAquatic } from "../scene/islandLife";
import {AuthorContact} from '../components/AuthorContact';


// 3D 场景单独分包，首页和任务页不用等 Three.js 加载

export function Home({initialStation,initialCompanion,active=true}:{initialStation?:string;initialCompanion?:number;active?:boolean}) {
  const save = useGame((s) => s.save);
  const [decorPreview,setDecorPreview]=useState<DecorPreview|null>(null);
  const displayedLevels=previewLevels(save.islandProgress?.levels,active?decorPreview:null);
  configureIslandExpansion(displayedLevels.island);
  useEffect(()=>{if(!active)setDecorPreview(null);},[active]);
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
  const [quickCare,setQuickCare]=useState<{id:number;kind:'feed'|'pet';station?:string}|null>(null);
  const selectedRef=useRef(selected);selectedRef.current=selected;
  const activeRef=useRef(active);
  useEffect(()=>{activeRef.current=active;return()=>{activeRef.current=false;};},[active]);
  const [effect, setEffect] = useState<Effect | null>(null);
  const need = nextCareRequest(save.captures);
  const [areaId,setAreaId]=useState<string|null>(null);
  const area=panel==='area'?FACILITY_GROUPS.find(g=>g.id===areaId):undefined;
  const livingOpen=panel==='living';
  const setLivingOpen=(open:boolean)=>open?activatePanel('living'):closePanel('living');
  const [livingUpgrade,setLivingUpgrade]=useState<UpgradeId>();
  const [livingTab,setLivingTab]=useState<"play"|"build">("play");
  const [livingInitialId,setLivingInitialId]=useState<number>();
  const together=useTogether(active,save.captures);
  useEffect(()=>{
    const session=together.session;
    if(!session||session.kind!=='ball'||session.help)return;
    // A visible reply when the partner receives the child's ball; no extra reward.
    if(together.phase==='done'||together.phase==='ready'&&together.turn===2){
      setEffect({id:session.partners[0],kind:'pet',icon:'heart',at:performance.now()});
      sfx('sparkle');
    }
  },[together.session?.id,together.phase,together.turn]);
  const life = useIslandLife(save.captures,now,false,livingOpen?undefined:need?.id,together.visits,save.islandLiving?.furniture??[],[selected],weather.kind);
  useEffect(()=>{together.syncArrivals(life.active);},[life.active.map(v=>v.key).join(','),together.session?.id]);
  const finderOpen=panel==='finder';
  const setFinderOpen=(open:boolean)=>open?activatePanel('finder'):closePanel('finder');
  const [careThanks,setCareThanks]=useState<{id:number;text:string}|null>(null);
  useEffect(()=>{
    if(!active)return;
    const timer=setInterval(()=>{if(!document.hidden)useGame.getState().tickCare(10);},10000);
    return()=>clearInterval(timer);
  },[active]);
  const [farmClock,setFarmClock]=useState(Date.now());
  const [farmNotice,setFarmNotice]=useState<FarmNotice>({text:''});
  const farmMessage=farmNotice.text;
  const setFarmMessage=(text:string,harvest?:FarmNotice['harvest'])=>setFarmNotice({text,harvest});
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
  const openFarm=(_index:number=0)=>{setPanel(null);setAreaId(null);setLivingOpen(false);together.cancel();stopSpeech();setPicnicOpen(false);cancelWater();setSelected(null);setPrompt(null);setStationId(null);setFarmMessage('');};
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
        farmRetryAt.current=0;setFarmClock(Date.now());sfx('pop');
        setFarmMessage('种好啦，伙伴会来浇水。');
      }
    }else if(stage==='ripe'){
      const harvested=await useGame.getState().harvestCrop(index);
      if(!activeRef.current||useGame.getState().saveIssue)return;
      if(harvested){
        setFarmMessage('树果装进果篮啦！',{berry:crop!.berry,count:HARVEST_COUNT,total:useGame.getState().save.farm!.basket[crop!.berry]});sfx('ding');
        void say(['en','Two!'],['en','I did it!']).then(ok=>{if(ok&&activeRef.current){noteWord('count:2','heard');useGame.getState().noteStationLearning('farm','I did it!',true);}});
      }else if(crop&&useGame.getState().save.farm!.basket[crop.berry]+HARVEST_COUNT>BASKET_CAP){setFarmMessage('果篮满啦，先给伙伴吃一点吧。');openPicnic();}
      else setFarmMessage('这块田已经变化啦，看看现在的小芽吧。');
    }else if(stage==='thirsty'){
      farmRetryAt.current=0;
      if(!useGame.getState().save.captures.some(c=>!isAquatic(getCreature(c.id))))go({name:'catch'});
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
  },[roster,selected]);
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
    const helpers=captures.filter(c=>!isAquatic(getCreature(c.id)));
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
  const residents = life.residents.map((c) => getCreature(c.id));
  // 家园环境英语（磨耳朵）：空闲时旁白描述小精灵正在做的事
  const ambient = useAmbientEnglish({
    pokemon: residents,
    enabled: active && !blocked && !immersive && captures.length > 0,
    level: save.settings.ambientEnglish ?? "some",
    mode,
    busy: panel!==null,
    focusId: null,
    focusReady: false,
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
      const t = setTimeout(() => say(["zh", "家园里还空空的，去草丛认识新朋友吧！"], ["en", "Let's meet a new friend!"]), 1800);
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
    stopSpeech(); setSelected(null);setPrompt(null);setStationId(id);activatePanel('facility');
    life.invite(id,cycle);
  };
  useEffect(()=>{if(active&&initialStation)inviteStation(initialStation);},[initialStation,active]); // Deliberate handoff from the lesson to a real island visit.

  useEffect(()=>{
    if(!active||initialCompanion===undefined)return;
    if(save.captures.some(c=>c.id===initialCompanion))tapCreature(getCreature(initialCompanion),false);
    // Consume the handoff. Reopening another panel must not select it again.
    useGame.getState().go({name:'home'});
  },[active,initialCompanion]);
  useEffect(()=>{if(!careThanks)return;const timer=setTimeout(()=>setCareThanks(null),5000);return()=>clearTimeout(timer);},[careThanks]);

  const tapCreature = (p: Creature, greet=true) => {
    setQuickCare(null);setCareThanks(null);setAreaId(null);
    selectedRef.current=p.id;
    stopSpeech();setFinderOpen(false);
    setLivingOpen(false);together.cancel();
    setPicnicOpen(false);
    cancelWater();setFeedPicker(false);setStationId(null);
    ambient.poke();
    sfx("pop");
    setSelected(p.id);
    setPrompt(null);
    if(!greet)return;
    const a = life.active.find(v=>v.pokemonId===p.id)?.station.activity ?? activityAt(p);
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

  const doInteract = async (p: Creature, kind: InteractKind,station='companion') => {
    const run = ++interactionRun.current;
    setFeedPicker(false);ambient.poke();
    if(!interact(p.id, kind))return;
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
    if(heard){useGame.getState().noteStationLearning(station,phrase.en,true);}
  };

  const shareBerry=(p:Creature,berry:BerryKind)=>{
    const run=++interactionRun.current;
    const before=useGame.getState().save.captures.find(c=>c.id===p.id)?.friendship??0;
    if(!useGame.getState().feedBerry(p.id,berry))return;
    const after=useGame.getState().save.captures.find(c=>c.id===p.id)!.friendship;
    setFeedPicker(false);ambient.poke();setEffect({id:p.id,kind:'feed',icon:'heart',at:performance.now()});
    setCareThanks({id:p.id,text:`吃到你种的${BERRIES[berry].name}啦！${after>before?`好感 +${after-before}`:'好感已满'}`});
    sfx('sparkle');void say(['en','Yummy! Thank you!']).then(ok=>{if(ok&&run===interactionRun.current&&activeRef.current){noteWord('Yummy!','heard');useGame.getState().noteStationLearning('farm','Thank you!',true);}});
  };
  const openPicnic=(id?:number)=>{
    setAreaId(null);setLivingOpen(false);together.cancel();
    stopSpeech();cancelWater();setSelected(null);setStationId(null);setPrompt(null);
    setPicnicInitialId(id);setPicnicMessage('');setPicnicOpen(true);
  };
  const invitePicnic=()=>{
    if(!picnic||picnic.servedAt)return;
    const water=isAquatic(getCreature(picnic.pokemonId));
    const request=life.invite(water?'shore':'picnic',false,picnic.pokemonId);
    picnicKey.current=request?`manual-${request.nonce}`:null;
    
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
    stopSpeech();cancelWater();setPicnicOpen(false);setSelected(null);setStationId(null);setPrompt(null);setLivingInitialId(id);setLivingOpen(true);
  };
  const beginTogether=(kind:TogetherKind,ids:number[],coast:boolean)=>{
    stopSpeech();life.cancel();together.begin(kind,ids,coast);
  };
  const sel = selected ? getCreature(selected) : null;
  const evolve = useGame((s) => s.evolve);
  const stayAsIs = useGame((s) => s.stayAsIs);
  const [evolving, setEvolving] = useState<number | null>(null);
  /** 满友好度、还有下一阶段（且那个形态还不在伙伴里）才能长大 */
  const evoOptions = (p: Creature) => p.evolvesTo.filter((id) => !captures.some((c) => c.id === id)).map(getCreature);
  const selNeed = selected ? careRequest(save.captures.find(c=>c.id===selected)!) : null;
  const selCap = selected ? captures.find((c) => c.id === selected) : null;

  const hint=homeHint({active,immersive,blocked:blocked||evolving!==null,panel,farm:!!farmMessage,picnic:!!picnic,care:!!need});
  useEffect(()=>{
    if(hint!=='care'||!need)return;
    const timer=setTimeout(()=>{if(!document.hidden)useGame.getState().deferCare(need.id);},30000);
    return()=>clearTimeout(timer);
  },[hint,need?.id,need?.kind]);
  useEffect(()=>{
    if(!quickCare)return;
    if(!active||selected!==quickCare.id){setQuickCare(null);return;}
    if(blocked)return;
    setQuickCare(null);void doInteract(getCreature(quickCare.id),quickCare.kind,quickCare.station);
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
      {panel!=='companion'&&!together.session&&<TopBar title={`${save.trainer?.name ?? ""}的家园`} help={<FeatureGuide id={captures.length?'home':'firstFriend'} enabled={active&&!immersive&&!blocked&&panel===null} topics={captures.length?['home','farm','camera','music']:undefined}/>} homeActions={active&&!livingOpen&&!sel&&!station&&!picnicOpen?<>
        <button onClick={()=>{stopSpeech();go({name:"home"});}}><Icon name="book" size={30}/><span>今天的故事</span></button>
        <Announcements active={active}/>
        <button onClick={()=>openLiving()}><Icon name="ball" size={30}/><span>一起玩</span></button>
        <details className="home-more" open={panel==='menu'}><summary onClick={e=>{e.preventDefault();if(panel==='menu')closePanel('menu');else activatePanel('menu');}}><Icon name="island" size={30}/><span>小岛生活</span><span aria-hidden="true">⌄</span></summary><div className="home-more-menu" onClick={()=>closePanel('menu')}>
        <button onClick={()=>openLiving(undefined,'build')}><Icon name="island" size={30}/><span>装扮</span></button>
        <AuthorContact active={active&&!immersive}/>
        {evolving===null&&<button ref={immersiveEntry} aria-label="隐藏界面，观赏小岛" onClick={()=>{stopSpeech();ambient.poke();setFinderOpen(false);setAreaId(null);setImmersive(true);}}><Icon name="eye" size={28}/><span>看风景</span></button>}
        </div></details>
      </>:undefined} />}
      {immersive&&<button autoFocus className="immersive-exit" onClick={leaveImmersive} aria-label="退出沉浸模式，显示界面"><Icon name="back" size={24}/><span>显示界面</span></button>}
      {active&&!immersive&&(panel===null||weatherOpen)&&<WeatherBadge weather={weather} open={weatherOpen} onOpen={setWeatherOpen}/>}
      <div className={`sky-backdrop sky-${sky}`} aria-hidden>
      </div>
      <div className="meadow">
        <IslandMap
            captures={life.residents} visits={life.visits} activeVisits={life.active} onArrival={life.arrive} onStation={inviteStation}
            sky={sky} weather={weather} selected={selected} effect={immersive?null:effect} need={hint==='care'?need:null}
            active={active} showInterface={!immersive&&!blocked&&!decorPreview&&panel!=='companion'&&!together.session}
            together={together.session?{partners:together.session.partners}:undefined}
            onSelect={(id)=>{if(immersive)return;if(together.session){if(together.session.partners.includes(id)){if(together.session.kind==='jump')together.act();else if(together.session.kind!=='bubbles')void doInteract(getCreature(id),'pet');}}else tapCreature(getCreature(id));}}
            onDeselect={() => { if(immersive)return; setAreaId(null);closePanel('area');closePanel('weather');closePanel('menu');ambient.poke(); if (selected) { setSelected(null); setPrompt(null); } }}
            farm={{open:panel!==null||blocked,farm:save.farm,clock:farmClock,working:watering?.index??null,onPlot:tapPlot}}
          />
        {active && !blocked && !immersive && captures.length === 0 && panel===null && (
          <div className="empty-home">
            <div className="sign"><Icon name="sign" size={40} /> 家园还空空的</div>
            <button className="btn-big" onClick={() => go({ name: "catch" })}><Icon name="grass" size={44} /> 去草丛认识新朋友</button>
          </div>
        )}
      </div>

      {active&&!livingOpen&&!station&&!picnicOpen&&evolving===null&&captures.length>0&&<>
        {finderOpen&&<CompanionFinder ids={captures.map(c=>c.id)} selected={selected} onSelect={id=>tapCreature(getCreature(id))} onClose={()=>{setFinderOpen(false);ambient.poke();}}/>}
      </>}
      {active&&livingOpen&&<IslandLivingPanel onPreview={setDecorPreview} save={save} together={together} initialId={livingInitialId} initialTab={livingTab} initialUpgrade={livingUpgrade} onBegin={beginTogether}
        onClose={()=>{setLivingOpen(false);together.cancel();life.cancel();stopSpeech();}}
        onPicnic={id=>openPicnic(id)}/>}
      {hint==='care' && need && <aside className="care-request" aria-label="伙伴的小心愿">
        <button className="care-open" onClick={()=>{setCareThanks(null);tapCreature(getCreature(need.id),false);setQuickCare({id:need.id,kind:need.kind});}}><CreatureImg src={creatureArt(need.id)} alt=""/><span><strong>{getCreature(need.id).nameZh}{need.kind==='feed'?'肚子饿啦':'想让你摸摸'}</strong><small>{need.kind==='feed'?'点一下，喂我小点心':'点一下，摸摸我'}</small></span><Icon name={need.kind==='feed'?'apple':'heart'} size={32}/></button>
        <button className="care-later" aria-label="等一会再陪它" onClick={()=>useGame.getState().deferCare(need.id)}>等一会</button>
      </aside>}
      {active&&area&&<section className="area-choices" aria-label={area.label}>
        <header className="panel-toolbar"><Icon name={area.icon} size={28}/><strong>{area.label}</strong><FeatureGuide compact id="area" autoVoice={false}/><button onClick={()=>{setAreaId(null);closePanel('area');}} aria-label="关闭活动选择"><Icon name="close" size={24}/></button></header>
        <div>{area.choices.map(id=>{const s=stationById(id);return <button key={id} onClick={()=>inviteStation(id)}><Icon name={id==='picnic'?'bowl':id==='farm'?'grass':id==='pier'?'eye':id==='sea'?'fish':s.icon} size={48}/><span>{id==='farm'?'种树果':s.name}</span></button>;})}</div>
      </section>}
      {hint==='farm'&&<FarmFeedback notice={farmNotice} canShare={BERRY_KINDS.some(k=>farm.basket[k]>0)} onShare={()=>openPicnic()} onClose={()=>setFarmMessage('')}/>}
      {active&&picnicOpen&&<PicnicPanel captures={captures} farm={farm} session={picnic} initialId={picnicInitialId} ready={picnicReady} unreachable={life.timedOut} message={picnicMessage}
        onBegin={(id,berry)=>{if(!useGame.getState().beginPicnic(id,berry))setPicnicMessage('请重新选一颗还有的树果。');}}
        onSnack={id=>{closePicnic();tapCreature(getCreature(id),false);setQuickCare({id,kind:'feed',station:'picnic'});}} onFind={()=>{closePicnic();go({name:'catch'});}}
        onServe={servePicnic} onClose={closePicnic} onFarm={()=>openFarm()} onRetry={invitePicnic} onHear={hearPicnic}
        onStory={()=>{closePicnic();go({name:'story',id:'magic-words'});}}
        onNotebook={()=>{closePicnic();go({name:'notebook'});}}/>}
      {hint==='picnic'&&picnic&&<button className="picnic-resume" onClick={()=>openPicnic()}>{picnic.servedAt?'看看野餐回忆':'继续伙伴野餐'}</button>}
      {!sel && station && <section className="facility-panel" aria-label={station.name}>
        <button className="facility-close" aria-label="结束设施互动" onClick={()=>{setStationId(null);closePanel('facility');life.cancel();}}><Icon name="close" size={26}/></button>
        <Icon name={station.icon} size={40}/>
        <div role="status" aria-live="polite"><strong>{life.manual ? `${getCreature(life.manual.pokemonId).nameZh}${life.active.some(v=>v.manual)?(station.action.startsWith('在')?station.action:'在'+station.action):'来啦…'}` : '一起找个小伙伴吧'}</strong>
          <span>{life.timedOut?'这条路有点挤，可以换个伙伴，或先回小岛。':life.manual ? life.active.some(v=>v.manual)?'你也来看看它的发现吧！':'伙伴正在走过来，等一等哦' : captures.length ? station.water ? '需要喜欢水的小伙伴来这里玩' : '这里适合在陆地活动的小伙伴':'先去草丛认识新朋友'}</span></div>
        {lesson && life.active.some(v=>v.manual) && <button className="facility-lesson" onClick={readLesson}><Icon name="speaker" size={28}/><span><b lang="en">{lesson.en}</b><small>{lesson.zh}</small></span></button>}
        {courseVisit&&<button className="facility-learning-link" onClick={()=>go({name:'home'})}>{save.learning?.units[learningUnit.id]?.encounteredAt?'到过对应场景啦':'回冒险路线'}</button>}
        {captures.filter(c=>compatible(getCreature(c.id),station)).length>1 ? <button className="facility-next" onClick={()=>inviteStation(station.id,true)}><Icon name="refresh" size={28}/>换个伙伴</button> : !life.manual ? <button className="facility-next" onClick={()=>go({name:'catch'})}><Icon name="grass" size={28}/>去找伙伴</button> : null}
      </section>}
      {active && evolving !== null && (
        <Evolution
          from={getCreature(evolving)}
          options={evoOptions(getCreature(evolving))}
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
        <CompanionStrip ids={captures.map(c=>c.id)} selected={sel.id} onSelect={id=>tapCreature(getCreature(id))} onClose={()=>{setSelected(null);setPrompt(null);stopSpeech();}}/>
        <section className={`sheet companion-card camp-summary ${feedPicker||prompt?'camp-detail':''}`} aria-label={`${sel.nameZh}的互动卡片`}>
          {(feedPicker||prompt)&&<nav className="companion-toolbar" aria-label="伙伴互动导航">
            {<button className="companion-back" aria-label="返回伙伴互动" onClick={()=>{setFeedPicker(false);setPrompt(null);stopSpeech();}}><Icon name="back" size={24}/>返回</button>}
            <FeatureGuide compact id={feedPicker?"feed":"care"} enabled={!prompt} autoVoice={false}/>

          </nav>}
          <div className="sheet-body">
            <header className="companion-heading help-heading">
              <CreatureImg className="sheet-art" src={creatureArt(sel.id)} alt="" />
              <div><h2 className="sheet-name">{sel.nameZh}</h2><div className="companion-friendship" aria-label={`友好度 ${friendshipLevel(selCap.friendship)} 颗心`}><Hearts n={friendshipLevel(selCap.friendship)} /></div></div>
              {!feedPicker&&!prompt&&<FeatureGuide id="care" autoVoice={false}/>}

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
        {!feedPicker&&!prompt&&<section className="camp-controls" aria-label="和伙伴互动">              <div className="actions camp-primary-actions"><button className="act" onClick={()=>{stopSpeech();go({name:"careStory",companion:sel.id});}}><Icon name="book" size={32}/>一起过个小下午</button>
                {lastPhrase?.id===sel.id&&<button className="act" onClick={()=>{setPrompt(lastPhrase);void say(["en",lastPhrase.en]);}}><Icon name="speak" size={32}/>我想说一句</button>}
                <button className={`act pet-action ${selNeed?.kind==='pet'?'requested':''}`} onClick={() => doInteract(sel, "pet")}><Icon name="hand" size={32} />摸摸</button>
                <button className={`act ${selNeed?.kind==='feed'?'requested':''}`} onClick={() => doInteract(sel,'feed')}><Icon name={favoriteFood(sel).icon} size={32} />喂点心</button>
                <button className="act" onClick={()=>{setFeedPicker(true);setCareThanks(null);stopSpeech();}}><Icon name="bowl" size={32}/>分享树果</button>
                <button className="act" onClick={()=>openLiving(sel.id)}><Icon name="balloon" size={32}/>一起玩</button>
                {friendshipLevel(selCap.friendship) >= 5 && evoOptions(sel).length > 0 && (
                  <button className={`act evolve ${selCap.stay ? "" : "pulse"}`} onClick={() => { stopSpeech(); setEvolving(sel.id); }}>
                    <Icon name="sparkle" size={28} />可以长大啦
                  </button>
                )}
              </div>            {!feedPicker&&!prompt&&<details className="companion-more"><summary><Icon name="heart" size={22}/>更多陪伴<span aria-hidden="true">⌄</span></summary><div className="actions">
                <button className="act" onClick={() => doInteract(sel, "night")}><Icon name="moon" size={32} />晚安</button>
                <button className="act" onClick={() => playCry(sel.id)}><Icon name="speaker" size={32} />叫声</button>
                <button className="act" onClick={() => go({ name: "dexDetail", id: sel.id })}><Icon name="dex" size={32} />好朋友相册</button>
              </div>

            </details>}</section>}
        </>
      )}
      {active && !blocked && panel===null && (
        <>
          {captures.length>0&&<button className="island-finder-launch" onClick={()=>{ambient.poke();stopSpeech();setFinderOpen(true);}} aria-label="找伙伴"><span className="ico friend-portrait"><CreatureImg src={creatureArt(residents[0].id)} alt=""/><Icon name="search" size={20}/></span>找伙伴</button>}
          <BottomNav active="island" />
        </>
      )}
    </div>
  );
}
