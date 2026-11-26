import { withTransition } from "./lib/viewTransition";
import {useEnvironmentAudio} from './lib/environmentAudio';
import { useSceneMusic } from './lib/music';
import { useEffect, useLayoutEffect, useRef } from "react";
import { playLimitSeconds, flushPendingSave, timeIsUp, useGame, type Screen } from "./store";
import { stopSpeech, onEnglishSpoken } from "./lib/speech";
import { landOnPageSoon } from "./lib/pageFocus";
import { skyFor } from "./lib/routine";
import { Welcome } from "./screens/Welcome";
import { Island } from "./screens/Island";
import { Sleepy } from "./screens/Sleepy";
import { SaveRecovery } from "./components/SaveRecovery";
import { todayStr } from "./lib/date";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NetworkNotice } from "./components/NetworkNotice";
import { lazy, Suspense } from "react";


const Diary=lazy(()=>import("./screens/Diary").then(m=>({default:m.Diary})));

const Practice=lazy(()=>import("./screens/Practice").then(m=>({default:m.Practice})));


const LearningLesson=lazy(()=>import("./screens/LearningLesson").then(m=>({default:m.LearningLesson})));

const LearningNotebook=lazy(()=>import("./screens/LearningNotebook").then(m=>({default:m.LearningNotebook})));
const LearningReview=lazy(()=>import("./screens/LearningNotebook").then(m=>({default:m.LearningReview})));

const PathHome=lazy(()=>import("./screens/PathHome").then(m=>({default:m.PathHome})));
const StoryLibrary=lazy(()=>import("./screens/Stories").then(m=>({default:m.StoryLibrary})));
const StoryReader=lazy(()=>import("./screens/Stories").then(m=>({default:m.StoryReader})));


const TaskScreen=lazy(()=>import("./screens/TaskScreen").then(m=>({default:m.TaskScreen})));


const FriendVisit=lazy(()=>import("./screens/FriendVisit").then(m=>({default:m.FriendVisit})));

const Dex=lazy(()=>import("./screens/Dex").then(m=>({default:m.Dex})));

const DexDetail=lazy(()=>import("./screens/DexDetail").then(m=>({default:m.DexDetail})));

const Parent=lazy(()=>import("./screens/Parent").then(m=>({default:m.Parent})));

// 仅开发模式：图标总览 /#icons
const IconSheet = import.meta.env.DEV ? lazy(() => import("./icons/IconSheet").then((m) => ({ default: m.IconSheet }))) : null;


const TICK = 10;

const ACTIVITIES = new Set<Screen["name"]>(["lesson", "task", "story", "diary", "catch", "review"]);

export default function App() {
  const loaded = useGame((s) => s.loaded);
  const saveIssue=useGame(s=>s.saveIssue);
  const screen = useGame((s) => s.screen);
  const trainer=useGame(s=>s.save.trainer);
  const settings=useGame(s=>s.save.settings);
  const timeUp=useGame(s=>timeIsUp(s.save));
  const load = useGame((s) => s.load);
  const addPlaySeconds = useGame((s) => s.addPlaySeconds);
  const noteHeard = useGame((s) => s.noteHeard);
  // Asking for a place or a companion on the island is the island, never the learning path.
  const islandView=screen.name==='home'&&(screen.view==='island'||!!screen.station||screen.companion!==undefined);
  useSceneMusic({screen:screen.name,level:settings.backgroundMusic??'soft',blocked:!loaded||!!saveIssue||timeUp||(screen.name==='home'&&!islandView)});
  useEnvironmentAudio({screen:screen.name,level:settings.environmentSound??'soft',mode:settings.islandWeather??'auto',blocked:!loaded||!!saveIssue||timeUp||(screen.name==='home'&&!islandView)});
  const homeSeen = useRef(false);
  const finishing = useRef<Screen | null>(null);
  if (!trainer) homeSeen.current = false;
  if (loaded && islandView) homeSeen.current = true;

  useEffect(() => {
    load();
    onEnglishSpoken(() => noteHeard(1));
  }, [load, noteHeard]);

  // Stop before the next screen's effects can start its own teaching voice.
  useLayoutEffect(() => () => stopSpeech(), [screen,saveIssue]);
  useEffect(() => {
    const flush=()=>{void flushPendingSave().catch(()=>{});};
    const hide = () => { if (document.hidden) {stopSpeech();flush();} };
    window.addEventListener('pagehide',flush);
    document.addEventListener('visibilitychange', hide);
    return () => {document.removeEventListener('visibilitychange', hide);window.removeEventListener('pagehide',flush);};
  }, []);

  // Island stationery follows game time: warm paper by day, forest surroundings at night.
  useEffect(() => {
    const apply = () => {
      const theme = skyFor() === "night" ? "dark" : "light";
      // Dusk and dawn fade the whole page over instead of switching it in one frame.
      if (document.documentElement.dataset.theme && document.documentElement.dataset.theme !== theme) withTransition(() => { document.documentElement.dataset.theme = theme; });
      else document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#14303f" : "#f3f8f8");
    };
    apply();
    const t = setInterval(apply, 60000);
    return () => clearInterval(t);
  }, []);

  // 只在页面可见、且不在欢迎页/家长页时计时
  useEffect(() => {
    const t = setInterval(() => {
      const state=useGame.getState(),sc=state.screen.name;
      const hasTime=state.save.daily.date!==todayStr()||state.save.daily.playSeconds<playLimitSeconds(state.save);
      if(state.loaded&&!state.saveIssue&&!state.saveBusy&&hasTime&&document.visibilityState==="visible"&&sc!=="welcome"&&sc!=="parent")addPlaySeconds(TICK);
    }, TICK * 1000);
    return () => clearInterval(t);
  }, [addPlaySeconds]);

  // A new page: a screen reader lands on its heading and the tab is named after it (not on first load).
  const landed = useRef(false);
  const pageKey = `${JSON.stringify(screen)}|${islandView}|${timeUp}`;
  useEffect(() => { const first = !landed.current; landed.current = true; return landOnPageSoon(!first); }, [pageKey]);

  if (IconSheet && location.hash === "#icons") return <Suspense fallback={null}><IconSheet /></Suspense>;
  if(saveIssue)return <SaveRecovery/>;
  if (!loaded) return <div className="screen loading"><div className="sl-ball" /></div>;

  // Time up never cuts into what the child is doing: the lesson, game, story, diary or visit open at that moment runs
  // to its end, and the rest page comes when the child leaves it. Only that one activity: the next one rests.
  if (!timeUp) finishing.current = null; else if (finishing.current === null) finishing.current = screen;
  const resting = !!timeUp && !(ACTIVITIES.has(screen.name) && screen === finishing.current) && screen.name !== "parent" && screen.name !== "welcome";
  const homeActive = islandView && !resting;

  return (
    <main className="app-main">
      {/* Keep the island's journeys, residents and camera alive across pages.
          Hidden islands stop rendering and narration; other pages stay lightweight. */}
      {homeSeen.current && <div className="home-host" style={{display:homeActive?'contents':'none'}} aria-hidden={!homeActive}>
        <ErrorBoundary key={trainer?.createdAt} onReset={() => useGame.getState().go({name:'home'})}>
          <Island initialCompanion={screen.name==='home'?screen.companion:undefined} active={homeActive} initialStation={screen.name==='home'?screen.station:undefined}/>
        </ErrorBoundary>
      </div>}
      {!homeActive && <ErrorBoundary key={resting?'sleepy':screen.name} onReset={() => useGame.getState().go({ name: "home" })}>
        <Suspense fallback={<div className="screen loading" role="status"><span className="sl-ball"/>正在准备小发现…</div>}>{resting ? <Sleepy/> : renderScreen()}</Suspense>
      </ErrorBoundary>}
      <NetworkNotice/>
    </main>
  );

  function renderScreen() {
  switch (screen.name) {
    case "welcome": return <Welcome />;
    case "home": return <PathHome/>;
    case "lesson": return <LearningLesson key={screen.id} id={screen.id}/>;
    case "notebook": return <LearningNotebook key={screen.mode} mode={screen.mode} returnTo={screen.returnTo}/>;
    case "review": return <LearningReview key={screen.keys.join('|')} keys={screen.keys} returnTo={screen.returnTo}/>;
    case "practice": return <Practice />;
    case "diary": return <Diary key={screen.id??"new"} id={screen.id}/>;
    case "stories": return <StoryLibrary />;
    case "story": return <StoryReader key={screen.id} id={screen.id} />;
    case "task": return <TaskScreen key={`${screen.kind}-${screen.boardIndex}-${screen.session ?? 0}`} kind={screen.kind} boardIndex={screen.boardIndex} practice={screen.practice} />;
    case "catch": return <FriendVisit />;
    case "dex": return <Dex key={String(screen.picking)} picking={screen.picking} browse={screen.browse} />;
    case "dexDetail": return <DexDetail id={screen.id} picking={screen.picking} browse={screen.browse} />;
    case "parent": return <Parent />;
  }
  }
}
