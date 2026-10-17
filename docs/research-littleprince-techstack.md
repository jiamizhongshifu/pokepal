# 调研：《小王子：星辰之旅》(littleprince.dev) 技术栈

来源推文：https://x.com/Saccc_c/status/2109962425512734739（作者 @Saccc_c，2026-10-13）
调研日期：2026-10-14。结论基于线上站点的实际抓包与构建文件分析，不是作者公开的制作流程（作者称后续开源）。

## 一句话结论

这不是 Three.js 网页游戏，而是 **Unity 引擎导出的 Web 构建（WebAssembly + WebGPU）**，由 Cloudflare 托管；
3D 资产用 Tripo 生成、Blender 整理；代码与资源流水线由 Claude Opus 5.5 驱动（作者自述）。

## 证据清单

| 维度 | 证据 | 结论 |
|---|---|---|
| 引擎 | 页面 `#unity-canvas`、`createUnityInstance` 配置（`dataUrl/frameworkUrl/codeUrl/streamingAssetsUrl`）、`Build/*.framework.js.br`、`Build/*.wasm.br`、`Build/*.data.br` | Unity Web 平台（Unity 6 系 Web 模板，带 `.br` Brotli 预压缩） |
| 渲染后端 | 页面注释："WebGPU is required: there is no WebGL2 fallback"；启动前 `navigator.gpu.requestAdapter()` 探测；framework 内 17 处 WebGPU 符号 | Unity WebGPU 后端，无 WebGL2 回退；提示需 Chrome/Edge 113+、Safari 26、Firefox 141+ |
| 资源管理 | `StreamingAssets/aa/Brotli/*.bundle`，按章节拆包：`b612 / king / lamp / bar / geo / counting / earth / theater` + `shared`，另有 `*_hires_*` 高清包 | Unity Addressables，按章节懒加载，解压后总量约 2.2 GB，单章 100–220 MB |
| UI/文本 | `textmeshpro_fonts`、`sourcesans3` 字体包 | TextMeshPro |
| 渲染管线 | 材质命名 `m_b612_foliage_tree.mat`、`sky.mat`、`steam.mat`、HDRI 天空贴图（day/dusk） | 自定义材质体系，疑似 URP（framework 中出现 `urP` 片段，非确证） |
| 多语言 | 内联 `LP_I18N`，8 种语言（en/fr/es/de/pt/zh/ja/ko），由 `tools/shared/web/make_page_i18n.py` 从 `Resources/LPLanguages.json` 生成 | 自研 i18n 流水线，Python 工具链生成页面文案 |
| JS 互操作 | `WebPlatform.jslib` 导出 `LPWebSetLang / LPWebGetLang / LPWebCanvasScale / LPWebDevicePixelRatio / LPWebLoadMilestone / LPWebRecordFrame / LPWebReportFrame / LPWebDownloadPending / LPWebSetTextureDump` | 自写 jslib 桥接：语言、DPR 上限 2x、加载里程碑、帧录制/性能上报、纹理导出 |
| 存档 | `autoSyncPersistentDataPath: true`，注释 "Persist the save (journey.json) to the browser's IndexedDB" | 存档为 `journey.json`，落在浏览器 IndexedDB |
| 缓存策略 | `loading.*.js`：对带 32 位 hash 的 bundle/data 走 `immutable`，其余 `no-store`；`CACHE_VERSION` 锚定 `0.1.0+4a120fa1` 避免老玩家重下 | 自研下载进度计量与缓存版本策略（中文注释，和推文"16 天"时间线一致） |
| 托管 | `server: cloudflare`，`cf-cache-status: DYNAMIC` | Cloudflare（Pages 或 R2+CDN） |
| 分发 | 页面提供 "Download for desktop" 链接 | 另有桌面版（Unity 原生导出） |
| 资产生成 | 推文自述 Tripo + Blender；Tripo 官方转发确认资产由 Tripo 生成 | AI 生成 3D 资产 → Blender 清理/绑定 → Unity 导入 |
| AI 编码 | 推文自述 Opus 5.5；Tripo 转发写的是 "GPT coded the game logic"，两者冲突 | 以作者本人说法为准：Claude Opus 5.5 为主 |

## 对本项目的启示

1. **不要照搬 Unity+WebGPU**：目标用户是 4 岁幼儿、用 iPad 浏览器或家里 Mac，WebGPU 在 iPad Safari 上要 iOS 26+，单章 100 MB 级下载对家庭网络和耐心都不友好。
2. **可借鉴的点**：按场景懒加载资源、hash 命名 + immutable 缓存、存档落本地（IndexedDB）、多语言文案由数据文件生成、所有文案/旁白走配置而非硬编码。
3. **资产来源要分开考虑**：小王子是公版 IP，可以放心 AI 生成；宝可梦是 The Pokémon Company 的版权 IP，本项目只能**家庭自用**，图像/叫声取自 PokéAPI 社区镜像，不得对外发布或商用。

## 参考资料

- 推文：https://x.com/Saccc_c/status/2109962425512734739
- 站点：https://littleprince.dev/
- Tripo 官方 Opus 5.5 工作流博客：https://www.tripo3d.ai/blog/claude-opus-5-5-tripo
- 另一条用 Rust+WASM+WebGPU（无引擎）配合 Opus 5.5 做 3D 游戏的案例：https://daily.dev/posts/i-built-and-shipped-a-3d-game-with-claude-opus-5-5-full-workflow--rj7lpd5tb
- V2EX 讨论：https://www.v2ex.com/t/1248630
