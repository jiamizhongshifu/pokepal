# Pokémon GO 资源升级：首批样本交付

日期：2026-10-14。用途：PokéPal 家庭本地版本。未上传仓库、未部署公网。

## 已交付

已将皮卡丘（25）、妙蛙种子（1）、喷火龙（6）的立绘替身升级为原游戏骨骼模型；保留并接通 `idle` 与 `walk` 动作，替换对应三只的叫声。其余 64 只的模型清单未改动。

- [交互对比预览](http://localhost:5181/docs/pogo-review.html)：旋转模型、切换动作、试听叫声。
- [样本截图](../output/playwright/pogo-assets/samples-idle.png)
- [家园截图](../output/playwright/pogo-assets/home-three-models.png)
- [20 伙伴同屏截图](../output/playwright/pogo-assets/home-20-residents.png)
- [1024×768 视口截图](../output/playwright/pogo-assets/home-ipad-viewport.png)

| 宝可梦 | 三角面 | GLB 大小 | 动作 |
|---|---:|---:|---|
| 1 | 5228 | 502.1 KiB | idle / walk |
| 6 | 7230 | 571.2 KiB | idle / walk |
| 25 | 5724 | 480.9 KiB | idle / walk |

## 来源与实际提取范围

### APK：本次亲自下载和提取

下载版本 `0.29.0`，包名 `com.nianticlabs.pokemongo`，60,876,068 字节。

- [Internet Archive 下载源](https://archive.org/details/PokemonGOCom.nianticlabs.pokemongo2016070500)
- [APKMirror 对照页](https://www.apkmirror.com/apk/niantic-inc/pokemon-go/pokemon-go-0-29-0-release/pokemon-go-0-29-apk-android-apk-download/)
- MD5：`2580d2687af1ffaaec16ff3b48380f76`，与 APKMirror 页面及 Archive 元数据一致。
- SHA-256：`8bf2b0865bef06906cd854492dece202482c04ce9c5e881e02d2b6235661ab67`。
- 保存位置：`models-src/_research/pogo-20261014/pokemon-go-0.29.0.apk`。
- 仅解析文件，未安装或运行 APK；校验哈希不等于重新验证全部 APK 签名链。

使用 UnityPy 1.25.4 解析出 112 个 Mesh、566 个 Texture2D、348 个 AudioClip、175 个 AnimationClip。逐一列出的网格中没有所需宝可梦角色模型；主要是训练师、场景、道具和特效。

实际导出了 **151 个初代宝可梦原始 WAV 叫声**，其中覆盖本项目 61/67 只。未覆盖的编号为 `[182, 186, 196, 197, 199, 230]`。已转换并接入 1、6、25 三只：AAC、单声道、64 kbps，使用 `loudnorm=I=-16:TP=-1.5:LRA=11`；时长约 0.93、1.05、1.31 秒。其他提取音频保存在研究目录，没有批量覆盖现有叫声。

### 3D 模型：补充的 Pokémon GO 资源存档

3D 模型**不是从上述 APK 中提取**。来自 [PokeMiners/pogo_assets](https://github.com/PokeMiners/pogo_assets)，固定提交 `c7ea15aa8bee189efba23fa5306a3e7aa71c09b5`（2020-11-27）。这是第三方保存的游戏资源，并非官方直接发布的模型库。

当前版本的皮卡丘 FBX 没有动画，因此选用上述保留待机、走路动作的历史版本。24 个来源文件均按 Git blob SHA-1 校验，另存 SHA-256；见 `sample-provenance.json`。原始 FBX 和贴图未修改。

## 转换修正与保留差异

- 使用原网格、骨骼和动作，不生成替代角色；三只均低于 8000 三角面，无须减面。
- 同名 NLA 轨道合并 FBX 的骨骼 / 辅助对象动画，导出为两个完整 glTF 动作，避免每根骨骼被导成独立动作。
- 移除 Unity 用作着色器遮罩的顶点色，解决模型发黑。
- 根据原始 UV 图块重建眼睛、嘴和脸颊的材质分配；选用常规配色，避免误用异色贴图。
- 皮卡丘只保留一条普通尾巴，移除同文件内的另一性别尾巴网格。
- 眼睛固定使用睁眼贴图，未移植 Unity 的眨眼 / 表情切换着色器。
- 喷火龙尾焰使用原火焰网格和简化的橙黄自发光材质，未复刻原游戏火焰特效。
- 清单不使用 `pose`，因为本项目的 `pose` 会冻结动作；默认模型姿态已能正常归一化。
- 通用转换脚本保留清单里的已有调向和动作设置，避免重新转换时覆盖已审阅配置。

## 验证结果及边界

- `npm run build` 通过；现有大分包警告仍在，未扩展修改游戏代码。
- 三个 GLB 结构校验通过：均有蒙皮骨骼、`idle` / `walk`，贴图和 buffer 全部内嵌；总计约 1.52 MiB。
- 浏览器对比页和实际家园已检查；三只均显示为 3D，骨骼四元数跨帧发生变化，确认没有被冻结。
- 实际点击三只模型均打开对应互动面板（摸摸、喂食、晚安、叫声、资料）。
- 桌面 Chromium、1366×1024，20 伙伴混合场景（3 个 GLB + 17 个立牌），180 个 requestAnimationFrame 样本约 **60.18 FPS**，95 分位帧间隔 16.7 ms。此为桌面浏览器帧回调测量，不能推断 20 个 GLB 或 iPad 真机性能。
- 1024×768 视口无横向溢出，Canvas 正常；此为桌面模拟视口，不是 iPad Safari 验收。
- 生产构建预缓存包含三个模型和叫声。浏览器离线重载后，六个资源均返回 HTTP 200 且字节数与交付物相同。
- 音频格式、时长和浏览器加载经过检查；未做主观听感验收。
- 仍待家长审阅样本效果，以及 iPad 真机性能、离线安装和触控验收。

## 文件与复现

- 原始安装包、解包目录、151 个 WAV、来源哈希、日志与备份：`models-src/_research/pogo-20261014/`。
- 整理后的 GLB 输入：`models-src/1/pokemon-go.glb`、`models-src/6/pokemon-go.glb`、`models-src/25/pokemon-go.glb`。
- 游戏交付：`public/models/pokemon/{1,6,25}.glb`、`public/pokemon/cry/{1,6,25}.m4a`。
- 清单：`src/data/pokemonModels.json`。
- APK 提取脚本：`scripts/extract-pogo-apk.py`。
- 样本转换脚本：`scripts/prepare-pogo-samples.py`，只处理这三只；依赖上述固定来源目录。
- 未改动 `src/scene/`、`src/data/behaviors.ts` 或存档逻辑；浏览器测试使用独立会话和测试存档。

```bash
# 从已下载 APK 重新提取（输出目录自选，避免覆盖既有审计记录）
models-src/_research/pogo-20261014/venv/bin/python scripts/extract-pogo-apk.py \
  models-src/_research/pogo-20261014/pokemon-go-0.29.0.apk \
  models-src/_research/pogo-20261014/reextract

# 重建三只样本输入
/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/prepare-pogo-samples.py

# 通用接入入口（会重新编码 GLB）
npm run models
npm run build
```

备份目录 `models-src/_research/pogo-20261014/before/` 含原模型清单和三只原叫声。回退时恢复这些文件；新增 GLB 可以保留，空清单不会加载它们。

## 批量接入前的审阅

交接文档第 6 节写明：“先做 3 只做对比截图……交给家长确认效果满意后，再批量处理其余的。”本次已准备好具体样本供审阅，尚未开展其余 64 只的批量接入。尾焰简化和固定眼睛是本次需要一起确认的视觉差异。
