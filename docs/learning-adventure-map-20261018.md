# 学习小路：全屏岛屿冒险地图

## 体验规则

- 地图铺满可视区域，顶部返回、地图/回顾、帮助和阶段牌浮于景色之上；没有额外内容卡片占据地图之外的空间。
- 六个阶段沿用现有课程，每阶段四关。整张地图展示本阶段全部地点，已完成用精灵球点亮，当前关卡由宝可梦陪伴，终点展示阶段徽章。
- 点当前关卡直接开始；点已完成或未来地点打开可收起的介绍，提供已有配音的任务说明和可点读词图。未解锁地点只能预览，不跳过学习顺序。
- “再回顾”独立显示已完成内容。浏览其他阶段不会改写学习进度，提供“找到我”返回当前阶段。
- 每天一关是温和的节奏建议，不增加日期锁、连续签到压力、额外货币或强制任务。徽章仅根据现有完成记录显示，不新增奖励账本。
- 平板横屏展示四个关卡；窄屏保留可点选大小，横向探索世界并自动定位当前地点；旋转或改变窗口宽度也会重新定位。
- 本轮六个阶段共用同一张岛屿底图，关卡内容和状态按阶段变化。尚未制作六张独立地区地图或新增课程。

## 设计参考与素材

参考洪恩英语的渐进学习与游戏探索组织方式：[官方介绍](https://www.ihuman.com/english/)。本次不复制其具体界面或插画。

使用 Codex 内置 imagegen 生成无文字、无角色的岛屿底图，再叠加项目现有宝可梦图片与可交互关卡。没有使用 CLI 生图或第三方生成渠道。

- 运行时素材：`public/art/world/learning-adventure-v1.webp`，1536 × 1024，约 372 KiB。
- 原始生成图：`output/imagegen/learning-adventure-v1/original.png`。
- 完整生成提示词：`output/imagegen/learning-adventure-v1/prompt.txt`。
- 本地资源继续遵循 OPEN_SOURCE.md，不纳入源码提交；网页构建会收录运行时 WebP。

## 验证

- `scripts/tests/learning-map.browser.js`：在隔离开发浏览器验证六阶段/24关、未来地点预览、不修改学习进度、回顾分流、当前关卡单击入口和全部完成状态。入口调用在测试中被观察替身接管，避免写入合成存档；该项不代表完成一次真实课程。
- 视口走查：1024 × 768、390 × 844、844 × 390；深色主题与关卡介绍。仅浏览器模拟尺寸，未声称真实 iPad 验收。
- `npm run check`：132 项测试与类型检查通过。
- `npm run voice:coverage`：配音缺失项为零；新增地图帮助配音已生成。
- `npm run build` 网页构建和发布包验证通过：6,382 个文件，56,153 条配音通过校验，地图 WebP 已进入 `dist-online/`；本地预览资源 HTTP 200。
- 已实际点击当前地图地点，确认进入对应的 `snack-discovery` 练习。
- 本轮未提交、未部署线上。

## 美术迭代 V2（2026-10-18）

按用户要求，参考《宝可梦 风／波》的海岛植被、海水层次和自然光照，以及《宝可梦 剑／盾》旷野的草坡、道路与清楚的形体层次。官方参考图仅用于观察，没有作为运行时素材。

- 风／波官方页面：https://windswaves.pokemon.com/en-us/
- 官方图：https://windswaves.pokemon.com/_images/feb_27_2026/p03_01.png
- 官方图：https://windswaves.pokemon.com/_images/feb_27_2026/p03_02.png
- 剑／盾旷野页面：https://swordshield.pokemon.com/en-us/gameplay/wild-area/
- 官方图：https://swordshield.pokemon.com/assets/img/screenshots/6_05_wildarea_1.jpg

通过内置 imagegen，以 V1 地图为构图参考重绘：降低玩具微缩模型感，增加自然尺度的树木、连续草坡、远景海岸与冷暖明暗层次；保留四个课程地点及连贯路线。浮层改为更轻的冷白色，关卡图钉减少厚重底影，既有黄色当前位置提示保留。关卡坐标按新图空地重新校准。

当前运行时素材为 `public/art/world/learning-adventure-v2.webp`（1536 × 1024，469,326 字节）。原图和完整提示词分别保存在 `output/imagegen/learning-adventure-v2/original.png` 与 `output/imagegen/learning-adventure-v2/prompt.txt`，V1 文件保留。此版本是参考官方环境美术方向的独立地图插画，不是游戏实机截图或官方地图。
