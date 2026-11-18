# 开源范围与运行准备

## 发布内容

本仓库开放原创应用代码、构建工具、测试和工程文档，采用根目录的 MIT 许可证；依赖及 Gradle Wrapper 按各自上游许可证使用。
小精灵、场景、图标与叫声均为本项目原创：角色设定（`src/data/creatures.json`）和生图规范（`scripts/art/`）随源码开放，生成的图片与配音属于本地媒体，不随仓库发布。
早期版本曾以第三方游戏角色为主题；这些名称、图片、模型与音频已从当前源码和线上版本移除，旧存档编号仅在 `src/data/legacyCreatureMap.ts` 中保留为数字对应表，用于迁移。

## 不包含的内容

- `public/` 下的角色图片、插画、图标、音乐、环境音与配音。
- 安卓启动图和安装图标，工程截图，生图原稿（`output/`）。
- 私钥、证书、服务凭据、合成回执、诊断、孩子的录音与真实存档。
- `dist/`、`dist-online/`、`.build/` 等构建产物与本机发布历史。

因此克隆源码不等于拿到完整的游戏资源包；不提供从线上站点复制媒体的步骤。开发者应准备自己有权使用的资源，并调整对应映射。
历史文档可能引用本机 `output/`、截图或已清理的发布包，这些是当时的验证记录，并非随仓库提供的下载文件。

## 运行与验证

使用 Node.js 22+：

```sh
npm ci
npm run typecheck
```

完整开发与构建还需要下列资源目录，结构可从源代码引用和 `scripts/online/prepare.mjs` 核对：

```text
public/art/contact/  public/icons/  public/sprites/  public/scenes/flat-v1/
public/music/  public/environment/
public/voice/manifest.json  public/voice/timings.json  public/voice/<hash>.mp3
```

`npm run check` 中的教学引导和学习内容测试会读取真实配音清单及文件；纯源码环境不能完成这部分检查。资源准备好后：

```sh
npm run check
npm run dev:http
npm run build
npm run preview
```

网页构建产物是 `dist-online/`；重新生成美术需要 Codex CLI 与 ImageMagick（见 `scripts/art/generate.mjs`）。构建不会生成收费云端配音。新增配音的收费命令及凭据配置见 README，凭据仅保存在构建机器的用户配置中，不要写入 `VITE_*`。

## 发布策略

目前以网页为主，GitHub 不自动部署 Cloudflare。发布者应使用自己的 Cloudflare 项目及资源授权；不要把源码根目录作为静态站点上传。
iPad / 安卓发布暂停。需要恢复时显式执行 `npm run build:ipad` 或对应移动端命令；这些平台仍须单独真机验收。

基础访问量后端位于 `functions/api/traffic.ts`，数据表迁移位于 `migrations/`。Fork 部署应使用自己的 Cloudflare D1，并替换 `wrangler.jsonc` 中项目名和数据库标识；原项目的标识不授予数据库访问权限。访问量与 GA4 的正式域名白名单也需自行配置。源码预览不会向原项目采集统计。
