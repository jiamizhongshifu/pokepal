# 啵啵岛 · Bubbly Isle

面向 **3–6 岁儿童与家长**的英语启蒙小游戏。孩子在一座插画小岛上认识 34 种原创小精灵，通过听、看、指认、故事和照顾伙伴自然遇见英语。核心体验是 **听得懂、看得懂、找得到**：允许只听、指认、尝试表达和随时休息，不强制开口或书写。

当前只推进网页发布（Cloudflare Pages）。iPad / 安卓发布暂停，按明确需求再启动。

## 原创角色与美术

- 2026-11 起，角色、场景、图标、绘本插画、叫声与应用图标全部替换为本项目原创内容，不再使用任何第三方游戏的角色、名称、图片、模型或音频。
- 34 种动物小精灵，各有 3 个成长阶段（宝宝 → 长大了 → 成年了），7 种自然属性：水、植物、天空、阳光、夜晚、大地、雪。设定见 [角色设定](docs/rebrand/creatures.md)，品牌与界面规范见 [品牌规范](docs/rebrand/brand-brief.md)。
- 美术是 2D 平涂插画，由 `scripts/art/` 的生图流程批量生成：`style.txt` 画风规范、`src/data/creatures.json` 与 `scripts/art/creature-art.json` 角色描述、`scenes.json` 场景/道具/图标清单；`generate.mjs` 为每张图保留提示词、参考图、模型和时间记录，`package.mjs` 统一裁切并输出到 `public/sprites/` 与 `public/scenes/flat-v1/`。小岛全景改用矢量分层：`scenes.json` 里 `layerOf` 指向原画的条目（空底图与各个物件）由 `generate.mjs scene` 从原画取出，`vectorize.py`（需 `pip install vtracer opencv-python pillow numpy`）转成 `public/scenes/flat-v1/layers/` 下的 SVG，并把每块在原画里的位置写进 `src/data/sceneLayers.generated.json`；风车、篝火、小船因此能单独动。
- 小精灵叫声由 `src/lib/creatureVoice.ts` 按物种实时合成（音高、音色、音节轮廓各不相同，长大后声音更低），不依赖音频文件。
- 旧存档中的角色编号会在读取时迁移到新的小精灵（`src/lib/creatureMigration.ts`），伙伴、好感、相册与回忆都会保留。

## 开源源码与网页开发

这是源码仓库，**不是包含完整游戏资源的可直接部署包**。克隆后的资源准备、检查范围和许可证见 [OPEN_SOURCE.md](OPEN_SOURCE.md)。

```sh
npm ci
npm run typecheck  # 仅源码类型检查，无需媒体资源
# 准备好本地媒体与配音后：
npm run dev:http        # http://localhost:5180/
npm run build           # 网页构建（含测试、类型检查、lint），输出 dist-online/
npm run preview         # http://127.0.0.1:4190/ 预览 dist-online/
```

`npm run check` 包含配音资源完整性测试、类型检查和 ESLint；完整构建同样需要未随源码发布的媒体。

## 陪伴的产品原则

- 每一种心情都可以被表达：不要求孩子保持开心，不用“乖不乖”评价分享。
- 小日记不计分、不发任务奖励；允许跳过、休息和稍后继续，不把表达变成作业。
- 让孩子关注生活的小事、自己的感受，以及人与伙伴的关心；提问保持开放，不预设经历或要求感谢。
- 保留孩子原话，家长可核对转写；不会把系统提问或虚构经历写进孩子的故事。
- 学习与成长融入陪伴和尝试，答错不扣分，不设饥饿、倒计时等照顾负担。

## 当前功能

| 模块 | 当前内容 |
|---|---|
| 小岛主人 | 创建小岛主人并获得一颗见面礼邀请果；可换预设头像、上传图片或调用设备拍照 |
| 学习路线 | 首页。6 章、48 站：每章四课、一本绘本、去小岛用一用、新朋友、说说这一章；到期复习可插入、可跳过；走完整条路线有一次庆祝 |
| 课程 | 每课 3 个图片词 + 情境短句；答错可再试，不扣分；课末带走一句话和一个亲子小游戏；发现手册、收藏、到期复习 |
| 故事屋 | 10 个故事、64 页；逐页中英文文字、重点词和配音；“听故事 / 一起读”两种方式；包含礼貌、轮流、情绪、诚实与约定，以及邀请、拒绝、求助、安静陪伴四篇生活故事 |
| 朋友来做客 | 每个邀请果迎来一位新朋友：选一艘小船，小精灵靠岸打招呼，孩子说 Hello! 就成为朋友 |
| 好朋友相册 | 34 种小精灵 × 3 个成长阶段，每只有自己的家；一起玩满 5 次、15 次可以长大，也可以保持现在的样子 |
| 我的小岛 | 一张插画小岛，五个区域、十四个地点，随学习路线逐步开放；每只伙伴有家和最爱的地方，按时间和天气活动 |
| 小岛玩法 | 每个地点有玩法：伙伴用学过的词句提要求，孩子听懂后点对图片，三轮完成；每位伙伴每天一个小心愿 |
| 菜地与野餐 | 种学过的水果（苹果、香蕉、草莓、葡萄、西瓜），伙伴来浇水；野餐时伙伴说想吃什么，孩子分给它 |
| 装扮 | 每章两件贴纸，摆在小岛插画上，可以收起或摆出 |
| 我的小日记 | 围绕心情、小事、明天的三个语音问题逐步分享，可跳过或由家长代写；回答先本机保存 |
| 星星与邀请果 | 每完成一站点亮一颗星星；每章“新朋友”站给一个邀请果，另外每 7 个玩满三类活动的日子多一个 |
| 家长中心 | 长按右上角齿轮 3 秒或按回车，再答算术题进入；学习概况、陪伴设置、应用维护 |
| 时长管理 | 达到时长进入休息页；白天邀请一起休息，21:00–次日 06:00 道晚安；家长可加时 |

## 英语学习体系

家长可在「设置 → 宝宝的英语学习阶段」选择听音探索、听词指认、日常表达，或独立调整词汇范围、认词起点、短句参与方式、选项数和复习组量。说明见 [学习阶段](docs/learning-stages-20261016.md)。

| 章节 | 主题 | 目标与例子 |
|---|---|---|
| 1 | 认识我的小岛 | 打招呼、颜色、点心、昼夜；先听见词，再指认图片 |
| 2 | 一起照顾伙伴 | 照顾植物、轮流玩、海边发现、礼貌请求；Help, please! / My turn! |
| 3 | 说说我的小世界 | 心情、感谢、邀请、完成约定；I'm happy! / Thank you! / All done! |
| 4 | 我会照顾自己 | 口渴、要苹果、吃饱拒绝、休息；I'm thirsty. / No, thank you. |
| 5 | 心情都有名字 | 难过、生气、再试一次、陪伴与独处；I feel sad. / I need some space. |
| 6 | 我们是好伙伴 | 加入游戏、道歉与修补、交接轮次、收拾；May I join you? / Let's tidy up! |

- 基础词库有 **44 个图片词、44 个功能句和 A–Z 字母**，另有小精灵名称及动态活动描述（例如 `Look! Bubbo is eating.`）。
- 听辨、认图、跟读、描字共用当前课程与到期复习的选词计划；新内容最早次日复习，独立答对后按 1、3、7、14 天推进。
- 说一说只检测开口和录音回放，不做发音评分；写一写提供笔顺演示、起笔位置和分笔提示。
- 故事奖励按当天完整听读或家长逐页确认结算；仅翻页不结算。绘本跟读的逐词高亮使用火山识别校正后的时间轴。

相关实现：`src/data/curriculum.ts`、`src/data/learning.ts`、`src/data/words.ts`、`src/lib/learningProgress.ts`、`src/lib/participation.ts`。

## 技术栈

- React 18 + TypeScript + Vite 6；Zustand 管理状态；Dexie / IndexedDB 保存本地存档和录音。
- 小岛是 2D 插画加可点区域（`src/island/IslandMap.tsx`），伙伴在站点之间平滑移动，昼夜与天气用色调图层表现。
- vite-plugin-pwa / Service Worker 负责网页缓存和更新。

## 火山配音

台词在构建期通过火山豆包语音合成生成 MP3，完成响度标准化后打包。设备只播放预生成录音，不包含密钥，不调用收费合成，也不回退到系统合成。中文旁白使用小雪，英文旁白使用慢速 Allison；角色音色见 `scripts/voice/cast.ts`。

新增或修改台词后：

```bash
npm run voice:collect
python3 scripts/voice/volc_tts.py build voice/lines.json   # 产生火山费用，已有文件跳过
python3 scripts/voice/align_timings.py                     # 校正绘本跟读逐词时间（新录音少量计费）
npm run voice:coverage
npm run voice:verify
```

凭据默认读取 `~/.config/volcengine/config.json`（可用 `VOLCENGINE_CONFIG` 指定），不要写入源码、日志或安装包。出现 `403 / requested resource not granted` 时检查账号授权或额度，不要改用本地合成掩盖缺失。

## 存档与恢复

- 小岛主人、伙伴、学习记录与跟读录音存于设备浏览器的 IndexedDB，没有跨设备云同步。
- 不同域名、协议和端口拥有独立存档；更换访问地址前，先在家长中心导出存档 JSON。JSON 不包含跟读录音和小日记。
- 读取失败会显示恢复提示，不会把失败当作“没有存档”再写入空白进度；同源多窗口使用写入锁和修订号防止旧快照覆盖。
- 导入前校验字段、伙伴编号和课程进度，合法导入会保留导入前备份。

实现见 `src/lib/db.ts`、`src/lib/saveValidation.ts`、`src/lib/creatureMigration.ts`、`src/lib/saveSession.ts` 与 `src/store.ts`。

## 检查与验收

```bash
npm run check   # 测试 + 类型检查 + lint（lint 警告上限只降不升）
```

**代码检查、浏览器验收和线上发布分开记录。** 推送 GitHub 不会更新网站；网站发布见下文。

## 主要目录

```text
src/data/            小精灵、行为、课程、词库、故事与插画路径（sceneArt.ts）
src/island/          2D 插画小岛
src/screens/         页面、学习工具与练习
src/components/      共用界面、头像、录音组件
src/scene/           小岛站点、作息、天气与伙伴活动逻辑
src/lib/             配音、叫声合成、学习进度、存档迁移与设备适配
src/icons/           图标索引
src/store.ts         状态、奖励、存档和学习操作
scripts/art/         原创美术生成与打包
scripts/voice/       台词收集、火山合成、校验、标准化与时间轴校正
scripts/online/      Cloudflare 在线版构建、资源分片及验证
scripts/tests/       业务与交互回归测试
public/sprites/      小精灵立绘与表情（本地媒体，不入库）
public/scenes/       小岛、绘本、道具与图标插画（本地媒体，不入库）
public/voice/        预生成录音与清单（本地媒体，不入库）
docs/                需求、规范和历史记录
```

## 发布

发布前执行 `npm run build` 与 `npm run release:prepare`（核对真实生产资源，不部署）；明确发布后使用 `npm run release:publish`，再做线上验收。源码仓库：[jiamizhongshifu/pokepal](https://github.com/jiamizhongshifu/pokepal)。
