import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import {initializeAnalytics,recordTrafficPage} from "./lib/analytics";
import {playLimitSeconds} from "./store";
import "./ui.css";
import "./learning-next.css";
import "./camp-interaction.css";
import "./help-layout.css";
import "./camp-play.css";
import { installViewportSizing } from "./lib/viewport";
import { useGame } from "./store";
import { preloadCreatureImages } from "./lib/imageCache";
import { setupNative } from "./lib/native";
import { installAutoUpdate, quietMoment, restoreEntryAddress } from "./lib/autoUpdate";
import { flushPendingSave } from "./store";

// Only fixed page names enter analytics; no save fields or lesson IDs leave the app.
const stopAnalytics=initializeAnalytics();
const reportPage=()=>{const {loaded,screen,save,saveIssue}=useGame.getState();if(loaded&&!saveIssue)recordTrafficPage(save.trainer&&screen.name!=="parent"&&screen.name!=="welcome"&&save.daily.playSeconds>=playLimitSeconds(save)?"rest":screen.name);};
const stopTraffic=useGame.subscribe(reportPage);
reportPage();
if(import.meta.hot)import.meta.hot.dispose(()=>{stopTraffic();stopAnalytics();});

// 仅开发模式：暴露状态便于调试，生产构建会被移除
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;

// 禁止 iPad 双指缩放和双击放大，避免幼儿误操作
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

// 小精灵图片常驻内存，之后各页面不再依赖网络
const disposeViewportSizing = installViewportSizing();
if (import.meta.hot) import.meta.hot.dispose(disposeViewportSizing);

preloadCreatureImages();
setupNative();
// The web build opens a newer release by itself at a quiet moment, so returning families need no manual update.
restoreEntryAddress();
if (import.meta.env.VITE_ONLINE && !import.meta.env.DEV) installAutoUpdate({
  loadedBuild: import.meta.env.VITE_APP_BUILD_ID,
  isSafe: () => { const g = useGame.getState(); return quietMoment({ loaded: g.loaded, saveBusy: g.saveBusy, saveIssue: g.saveIssue, screen: g.screen, hasTrainer: !!g.save.trainer }); },
  // Back after a long break, any screen will do once the save is safely written (a new family still setting up excepted).
  isSettled: () => { const g = useGame.getState(); return !g.loaded || (!g.saveBusy && !g.saveIssue && !!g.save.trainer); },
  subscribe: listener => useGame.subscribe(listener),
  beforeOpen: flushPendingSave,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);


