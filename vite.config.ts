import { ANNOUNCEMENTS } from './src/data/announcements';
// @ts-ignore Local Node middleware, never bundled into the client.
import { diaryApi } from './scripts/mobile/diary-api.mjs';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const buildId = new Date().toISOString();
let buildOutput = resolve('dist');

// 优先使用 mkcert 生成的本地可信证书（certs/cert.pem + certs/key.pem），iPad 信任根证书后离线缓存和麦克风才稳定可用
const hasCert = existsSync("certs/cert.pem") && existsSync("certs/key.pem");
const https = hasCert ? { cert: readFileSync("certs/cert.pem"), key: readFileSync("certs/key.pem") } : undefined;

// HTTPS 是必需的：iPad Safari 只在安全上下文里开放麦克风（getUserMedia）。
// 移动设备需信任证书；跳过浏览器证书警告不能替代受信任 HTTPS。
export default defineConfig(({ mode }) => {
const online = mode === "online";
const onlineStage = process.env.ONLINE_STAGE;
const voiceShards = online && onlineStage ? JSON.parse(readFileSync(resolve(onlineStage, "voice-online/build-index.json"), "utf8")) : [];
return {
  build: { ...(online ? { outDir: onlineStage || "dist-online", emptyOutDir: false, copyPublicDir: false } : {}), rollupOptions:{input:{main:resolve('index.html'),privacy:resolve('privacy/index.html'),terms:resolve('terms/index.html'),feedback:resolve('feedback/index.html')}} },
  define: { 'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId), 'import.meta.env.VITE_ONLINE': JSON.stringify(online), 'import.meta.env.VITE_VOICE_SHARDS': JSON.stringify(voiceShards) },
  plugins: [
    { name: 'announcements', configureServer(server) { server.middlewares.use('/announcements.json', (_req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({build:buildId,notes:ANNOUNCEMENTS}));}); }, closeBundle() { writeFileSync(resolve(buildOutput,'announcements.json'), JSON.stringify({build:buildId,notes:ANNOUNCEMENTS})); } },
    { name: 'online-release', closeBundle() { if(online) writeFileSync(resolve(buildOutput,'release.json'), JSON.stringify({id:buildId,mode:'online',sourceHash:process.env.SOURCE_HASH})); } },
    { name: 'offline-release-location', configResolved(config) { buildOutput = resolve(config.root, config.build.outDir); } },
    {name:'local-diary-api',configureServer(server){server.middlewares.use((req,res,next)=>{void diaryApi(req,res).then((handled:boolean)=>{if(!handled)next();});});},configurePreviewServer(server){server.middlewares.use((req,res,next)=>{void diaryApi(req,res).then((handled:boolean)=>{if(!handled)next();});});}},
    react(),
    // NO_SSL=1 时用 HTTP，仅供电脑上调试
    ...(process.env.NO_SSL || hasCert ? [] : [basicSsl()]),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: online ? ["icons/icon-192.png", "icons/icon-512.png"] : ["pokemon/**/*", "icons/*"],
      manifest: {
        id: "/",
        lang: "zh-CN",
        name: "宝可梦小小训练师",
        short_name: "PokéPal",
        description: "和宝可梦一起学英语的家庭小游戏",
        theme_color: "#ecf8f8",
        background_color: "#ecf8f8",
        display: "fullscreen",
        orientation: "any",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: online ? {
        cacheId: "pokepal-online-v1",
        globPatterns: ["index.html", "privacy/index.html", "terms/index.html", "feedback/index.html", "assets/*.{js,css,woff2}"],
        globIgnores: ["**/HomeScene-*.js"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/(voice|models|pokemon|art|story-art|env|icons|textures|music|__ipad|release|privacy|terms|feedback)/],
        runtimeCaching: [{urlPattern:/\/environment\/[a-z-]+-v\d+\.m4a$/,handler:'CacheFirst',options:{cacheName:'pokepal-nature-v1',cacheableResponse:{statuses:[200]},expiration:{maxEntries:6,maxAgeSeconds:365*24*60*60}}},{urlPattern:/\/music\/[a-z]+-v\d+\.m4a$/,handler:'CacheFirst',options:{cacheName:'pokepal-music-v1',cacheableResponse:{statuses:[200]},expiration:{maxEntries:8,maxAgeSeconds:365*24*60*60}}}],
        cleanupOutdatedCaches: true
      } : {
        cacheId: "pokepal-core-v2",
        importScripts: ["offline-release.js", "voice-cache-sw.js"],
        globIgnores: ["**/offline-release.*", "**/announcements.json"],
        manifestTransforms: [async entries => {
          // The plugin appends the web manifest after Workbox transforms. Include it in progress too.
          const webManifest = readFileSync(resolve(buildOutput, 'manifest.webmanifest'));
          const tracked = [...entries, {url:'manifest.webmanifest', revision:createHash('md5').update(webManifest).digest('hex')}];
          const release = { id: buildId, sourceHash:process.env.SOURCE_HASH, assets: tracked.map(entry => ({
            url: entry.url, revision: entry.revision,
            bytes: statSync(resolve(buildOutput, entry.url)).size,
          })) };
          writeFileSync(resolve(buildOutput, 'offline-release.json'), JSON.stringify(release));
          writeFileSync(resolve(buildOutput, 'offline-release.js'), `self.POKE_RELEASE=${JSON.stringify(release)};`);
          return { manifest: entries, warnings: [] };
        }],
        globPatterns: ["**/*.{js,css,html,png,jpg,hdr,m4a,ogg,svg,json,woff2,glb}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024
      }
    }),
    // Reading a parent notice must not start downloading/installing the game shell.
    {name:'parent-pages-no-install',enforce:'post',transformIndexHtml:{order:'post',handler(html,ctx){
      return /^\/(privacy|terms|feedback)\//.test(ctx.path)
        ? html.replace(/<script\b[^>]*id="vite-plugin-pwa:register-sw"[^>]*><\/script>/g,'').replace(/<link\b[^>]*rel="manifest"[^>]*>/g,'')
        : html;
    }}}
  ],
  server: { host: true, port: 5173, https: process.env.NO_SSL ? undefined : https },
  preview: { host: true, port: 4173, https: process.env.NO_SSL ? undefined : https }
};
});
