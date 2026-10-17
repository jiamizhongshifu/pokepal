import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./ui.css";
import "@fontsource/m-plus-1/latin-500.css";
import "@fontsource/m-plus-1/latin-800.css";
import "@fontsource/m-plus-1/latin-900.css";
import { installViewportSizing } from "./lib/viewport";
import { useGame } from "./store";
import { preloadPokemonImages } from "./lib/imageCache";
import { setupNative } from "./lib/native";

// 仅开发模式：暴露状态便于调试，生产构建会被移除
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;

// 禁止 iPad 双指缩放和双击放大，避免幼儿误操作
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

// 宝可梦图片常驻内存，之后各页面不再依赖网络
const disposeViewportSizing = installViewportSizing();
if (import.meta.hot) import.meta.hot.dispose(disposeViewportSizing);

preloadPokemonImages();
setupNative();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);


