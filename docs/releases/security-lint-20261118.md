# 网页生产发布 · 2026-11-18

用户在对话中确认部署完整 main，包括 11 月 12 日回退的故事首页。

- 源码 `58cdfa5`（已推送 main），Cloudflare Pages 部署 `2cda5640`，正式入口 https://pokepal-online.pages.dev/ 。
- 网页 release id `2026-11-18T02:54:28.211Z`，sourceHash `dc83ba2f35fd9601d723e6c3097ec3c47f3dd95a99493aafb76fc5ae20454310`。
- 回退目标仍为上一版本 `c20b3e33`（release `2026-10-22T13:35:24.146Z`）。

## 本次内容

- 故事首页与伙伴照顾（`4e0bb34`，此前回退的版本）。
- 全站 Content-Security-Policy 与 Permissions-Policy（麦克风仅限本站，摄像头、定位关闭）；3D 模型关闭 Draco / Meshopt 解码器，不再编译 WebAssembly。
- `scripts/` 纳入类型检查，ESLint 进入 `npm run check`。
- 两种日记共用 `ClipRecorder` 录音生命周期。

## 已完成校验

- 188 项测试、两套类型检查、ESLint（0 error / 94 warning 上限）、网页构建与资源校验通过；发布准备保留线上 4,395 个旧版资源，无待执行数据库迁移。
- 构建传入与线上相同的 Chatwoot 公开 website token，家长在线客服保留。
- 线上 `release.json` 与本地产物一致，首页 HTML 字节相同，主脚本 `main-2wXzTO50.js`，配音索引与环境贴图 200。
- 线上响应头包含新的 CSP 与 Permissions-Policy。
- 线上反馈页打开 Chatwoot 客服面板正常显示，无 CSP 拦截；未发送消息。线上首页无 CSP 报错。
- 本地 `wrangler pages dev`（同一 `_headers`）中故事、捕捉、3D 小岛、配音包与家长页面均无 CSP 拦截；本地开发服务器用模拟麦克风验证两种日记录音保存与离开时保存。

## 未验证

- Google Analytics 需家长同意才加载，未在线上开启验证；CSP 按 Google 标签文档放行 `*.googletagmanager.com`、`*.google-analytics.com`、`*.analytics.google.com`。
- 线上未走完整新手流程和 3D 小岛；真实手机、iPad 与大陆网络体验仍需用户验收。
