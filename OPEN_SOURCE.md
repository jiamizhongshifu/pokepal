# 开源范围与运行准备

## 发布内容

本仓库开放原创应用代码、构建工具、测试和工程文档，采用根目录的 MIT 许可证。
宝可梦名称、角色资料、商标和第三方材料不因此获得 MIT 授权；依赖及 Gradle Wrapper 按各自上游许可证使用。
`src/data/` 中的角色资料和资源映射保留为应用输入，来源与处理记录见 `docs/handoff-3d-assets.md`、`docs/pogo-assets-upgrade-20261014.md`；第三方资料不适用本项目的 MIT 授权。
这是非官方项目，与宝可梦权利人无隶属关系。

## 不包含的内容

- `public/` 下的角色图片、模型、纹理、插画、图标、音乐、环境音与配音。
- 安卓启动图和安装图标，工程截图，原始模型与资源下载包。
- 私钥、证书、服务凭据、合成回执、诊断、孩子的录音与真实存档。
- `dist/`、`dist-online/`、`.build/` 等构建产物与本机发布历史。

因此克隆源码不等于拿到完整的游戏资源包；不提供从线上站点复制媒体的步骤。开发者应准备自己有权使用的资源，并调整对应映射。
历史文档可能引用本机 `output/`、截图或已清理的发布包，这些是当时的验证记录，并非随仓库提供的下载文件。

## 运行与验证

使用 Node.js 22+：

```sh
npm ci
npm exec tsc -- --noEmit
```

完整开发与构建还需要下列资源目录，结构可从源代码引用和 `scripts/online/prepare.mjs` 核对：

```text
public/art/  public/env/  public/icons/  public/models/
public/pokemon/  public/story-art/  public/textures/
public/music/  public/environment/
public/voice/manifest.json  public/voice/<hash>.mp3
```

`npm run check` 中的教学引导和学习内容测试会读取真实配音清单及文件；纯源码环境不能完成这部分检查。资源准备好后：

```sh
npm run check
npm run dev:http
npm run build
npm run preview
```

网页构建还需要 `cwebp`，产物是 `dist-online/`。构建不会生成收费云端配音。新增配音的收费命令及凭据配置见 README，凭据仅保存在构建机器的用户配置中，不要写入 `VITE_*`。

## 发布策略

目前以网页为主，GitHub 不自动部署 Cloudflare。发布者应使用自己的 Cloudflare 项目及资源授权；不要把源码根目录作为静态站点上传。
iPad / 安卓发布暂停。需要恢复时显式执行 `npm run build:ipad` 或对应移动端命令；这些平台仍须单独真机验收。
