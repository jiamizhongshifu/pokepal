import { POKEMON, artUrl, spriteUrl } from "../data/pokemon";

/**
 * 只预热首页伙伴图片。完整图鉴由 Service Worker 缓存，显示时按需解码。
 * 386 只的两套大图不能全部常驻解码内存，否则 iPad 会承受数百 MiB 压力。
 * 浏览器对同一文档里已加载过的图片地址会直接复用内存里的解码结果，之后任何页面再用同一张图都不再走网络——
 * 即使开发服务器重启、Wi-Fi 抖动，或 Service Worker 还没装好，也不会图裂。
 */
const held = new Map<string, HTMLImageElement>();
const loaded = new Set<string>();

function hold(url: string, attempt = 0) {
  const img = new Image();
  img.decoding = "async";
  img.onload = () => loaded.add(url);
  // 失败就退避重试（1s、2s、4s… 最长 30s），直到加载成功
  img.onerror = () => { if(attempt>=3)return; setTimeout(() => hold(url, attempt + 1), Math.min(30000, 1000 * 2 ** attempt)); };
  img.src = attempt ? `${url}?retry=${attempt}` : url;
  held.set(url, img);
}

export function preloadPokemonImages() {
  for (const p of POKEMON.filter(p => [1,4,7,25,133].includes(p.id))) {
    for (const url of (import.meta.env.VITE_ONLINE ? [spriteUrl(p.id)] : [spriteUrl(p.id), artUrl(p.id)])) if (!held.has(url)) hold(url);
  }
}

export const isImageLoaded = (url: string) => loaded.has(url);
