# Pokémon GO 全名单批量接入

2026-10-14。承接首批 1、6、25 的样本，按用户“继续推进剩余的批量接入”完成其余 64 只。仅用于现有家庭本地版本，未上传、推送或公开部署。

## 交付

- `src/data/pokemon.json` 中全部 **67 / 67** 已登记到 `src/data/pokemonModels.json`，家园自动使用 3D 模型。
- 每只均有蒙皮骨骼、内嵌贴图、`idle` 和 `walk` 两个循环动作。清单不设置会冻结动作的 `pose`。
- 最终模型合计 **31.40 MiB**；最大九尾 **830.4 KiB**。每只 ≤ 8,000 三角面，单图 ≤ 1,024 像素。
- 模型交付于 `models-src/<id>/pokemon-go.glb` 和 `public/models/pokemon/<id>.glb`。
- **61** 只使用 APK 提取的叫声（AAC、单声道、64 kbps、响度标准化）；本轮新增替换 **58** 只。
- **182、186、196、197、199、230** 不在该 APK 第一世代叫声范围内，保留现有 PokéAPI 音频。
- [全 67 只交互预览](http://localhost:5181/docs/pogo-batch-review.html)：可搜索、旋转、切换动作、播放叫声。共用一个 WebGL 渲染器，避免同时创建 67 个上下文。
- [首批来源报告](pogo-assets-upgrade-20261014.md) 保留 APK 下载、提取与首批验收证据。

## 来源与处理

模型来源是 PokeMiners 的 Pokémon GO 资源存档，**不是从本次 APK 中提取的模型**。APK 实际提供了叫声；此前审计没有在包内找到目标宝可梦模型。

- 固定仓库：[PokeMiners/pogo_assets](https://github.com/PokeMiners/pogo_assets/tree/c7ea15aa8bee189efba23fa5306a3e7aa71c09b5/3D%20Assets/Pokemon)，2020-11-27 revision `c7ea15aa8bee189efba23fa5306a3e7aa71c09b5`。
- 共下载并校验 **466 个原始文件、382,825,221 字节**。每个文件都比对固定 Git tree 的 blob SHA-1，另记录 SHA-256。
- 原始 FBX、贴图位于 `models-src/_research/pogo-20261014/pokeminers-20201127/`，未改写。
- 根据现有官方立绘逐只选择普通配色；文件名中的 `#数字` 不等于普通或异色，选择显式保存在 `scripts/pogo-textures.json`。
- 清除 Unity 顶点颜色遮罩，按 UV tile 恢复眼睛／面部材质；保留 `_00` 性别网格，去除重复 `_01` 网格和调试几何体。
- 臭臭花 8,468 → 7,897 面，海刺龙 10,014 → 7,900 面；仅这两只减面，保留骨骼权重。
- 蚊香蛙皇移除两个攻击专用舌头辅助网格，避免闲置动画中的异常尺寸影响归一化。
- 默认节点姿态设为待机首帧。移动动作通过独立根节点对齐首帧高度原点，原始关节动作不变，避免切换动作时因不同原点跳高或下沉。
- 未修改 `src/scene/`、行为配置、捕获、进化或存档逻辑。测试使用独立浏览器会话。

## 验证

- 浏览器逐只加载 **67 / 67**，检查 **134** 个动作的骨骼变化、有限坐标、网格、贴图与首帧归一化；无加载或动画结构错误。
- 已查看全部模型总览，修正错误配色、重复性别网格、默认姿态和蚊香蛙皇尺寸异常。待机及移动首帧的地面原点误差均小于 0.01（预览归一化单位）；动画过程中保留原始扑翼、起伏动作，并由家园的既有行为控制飞行／游动。
- 家园 **20 只 3D 同屏**：1440×1000，本机 Chromium 的 180 帧 RAF 测量约 **60.0 FPS**、P95 帧间隔 **16.8 ms**、DPR 1。该结果为本机浏览器测试，不是 iPad GPU 基准。
- 实际点击超梦、蚊香蛙皇、臭臭花、水箭龟，均打开对应互动面板。其余模型共享相同点击组件；未逐只人工点击全部 67 只。
- 1024×768：家园正常显示，无横向溢出。
- `npm run build` 通过；PWA precache **6,374** 条、约 **133.1 MiB**。保留既有主包较大的构建提示。
- 67 个模型与 67 个叫声在 `dist/` 中的 SHA-256 均与交付源文件一致。
- 真实切换浏览器到离线模式并刷新生产页面：**134 / 134** 资源返回 200 且 SHA-256 匹配；**67 / 67** 叫声通过 `AudioContext.decodeAudioData` 解码，Service Worker 正常接管。详见 `offline-validation.json`。

## 复现与证据

在项目根目录运行（依赖已安装 Blender 3.1、Python、ffmpeg）：

```bash
python3 scripts/fetch-pogo-assets.py
/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/prepare-pogo-batch.py
python3 scripts/normalize-pogo-pose.py
python3 scripts/align-pogo-motion.py
python3 scripts/prepare-pogo-cries.py
npm run build
```

`prepare-pogo-batch.py` 处理本轮 64 只；前三只由 `prepare-pogo-samples.py` 生成。若从零复现，在归一化步骤前先运行样本脚本。`pogo-motion-offsets.json` 是针对当前固定来源、纹理选择和网格处理测得的参数；改变来源或网格后应重新测量。

研究目录：`models-src/_research/pogo-batch-20261014/`

- `source-provenance.json`：下载地址、Git blob、SHA-256。
- `source-audit.json`：源网格、材质及动画清单。
- `conversion-<id>.json`：逐只纹理选择、去除网格与面数。
- `delivery-manifest.json`：最终 GLB 大小、SHA-256、骨骼与纹理数量。
- `cry-report.json`：音频来源、SHA-256、ffprobe 结果。
- `browser-model-audit.json`：67 只模型的动作与包围盒检查。
- `home-20-validation.json`、`home-click-validation.json`：家园帧率及点击证据。
- `offline-validation.json`：断网读取、哈希和 AAC 解码结果。
- `before/`：本轮修改前的清单与 58 个叫声备份；前三只备份仍在首批研究目录。
- `build.log`：构建结果。

截图：`output/playwright/pogo-assets/batch-67-overview.png`、`batch-home-20.png`、`batch-home-ipad.png`、`batch-politoed.png`、`batch-click-mewtwo.png`。

## 尚未覆盖

未在真实 iPad / Safari 上验证安装、缓存容量和长期运行性能。眼睛／表情使用固定贴图；火焰采用简化发光材质，未复刻 Unity 的表情、MatCap 和特效着色器。游戏动作保留原有起伏；这不是逐帧足部接地重定向。
