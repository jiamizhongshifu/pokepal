# Pokopia 相关资源检索结果

核查日期：2026-10-15。此清单补充此前的可行性报告。本轮找到可下载的同人场景和角色文件，但未找到经过验证的 Pokopia 原版完整模型、动画或场景资源包。

## 1. 优先评估：Pokopia Town 同人小镇

- 仓库：https://github.com/LerSent001/pokepia-town
- 在线演示：https://lersent001.github.io/pokepia-town/
- 本轮固定提交：`9caddf85107a3b8cd543d0f36de8181bc9b431ce`
- 内容：Three.js 小镇、Blender 场景与主角生成脚本、点击移动与导航实现。原作者自建内容采用 MIT；第三方角色和品牌素材单独声明。
- **性质：Pokopia 风格同人重建，不是 Pokopia 原版游戏提取。** 五只普通宝可梦来自另一个 `Pokemon-3D-api/assets` 仓库，不能标注为 Pokopia 原版模型。

已经下载到 `output/research/pokopia/town-samples/`，检查了真实 GLB 文件头、JSON 结构、依赖和 SHA-256：

| 文件 | 大小 | 本轮实际读取结果 | 用途与限制 |
|---|---:|---|---|
| `public/town.glb` | 1,366,464 字节 | glTF 2；38 个 mesh；无骨骼/动画；无外部 URI；必须支持 `KHR_draco_mesh_compression` | 小镇场景候选。mesh 按材质合并，不能直接视作每棵树/每张椅子独立模型 |
| `public/models/player.glb` | 2,429,712 字节 | glTF 2；1 个 mesh、1 个 skin；`Player_Idle`、`Player_Walk`；1 张内嵌图片；无外部 URI | 同人主角候选。尚未测量移动端渲染性能或做视觉验收 |

同时保存 `LICENSE`、`THIRD_PARTY_NOTICES.md`、`asset-sources.json`、`blender/build_town.py`、`blender/build_player.py` 和仓库文件列表。`inventory.json` 记录下载来源、固定提交和两个模型的结构检查结果。未执行外部脚本。

当前项目模型加载器禁用了 Draco，场景不能未经处理直接套用。后续可以离线解压再导出，或配置本地解码器；仍需重新绑定我们的碰撞、交互点、活动区域。此轮只收集和检查，没有替换项目场景。

## 2. Takko 的 Pokopia 百变怪同人模型

- 作者页面：https://takko26.itch.io/takkos-low-poly-3d-models
- 页面列出 `ditto_pokopia.zip`，约 685 kB，FBX 与 Blender 文件。
- 作者说明这是自己的低多边形模型，允许用于同人游戏或 Mod；还提醒部分贴图导出可能需要调整采样设置。
- **性质：作者手工制作的同人资源。** 本轮核查了作者页面，未取得 ZIP，不能确认骨骼、动画和实际导入质量。
- 价值：适合验证低面数角色方向；不解决批量宝可梦和场景来源。

## 3. Sketchfab：Dragonite pokopia

- 页面：https://sketchfab.com/3d-models/dragonite-pokopia-08f76d8daad74edb82c67a7492d95714
- 作者：rugved shetge；页面索引标注约 7.7k 三角面、手绘、没有绑定骨骼、CC Attribution，并列出下载入口。
- **性质：按作者描述归为同人候选，不认定为游戏提取。** 搜索索引可读，但本轮直接打开详情失败；下载状态与当前条款还需在可访问的详情页复核。
- 价值：外观研究或后续绑定候选，不能直接承担当前家园的走路/待机角色。

## 4. Xzonn 中文数据库：栖息地与玩法关系

- 网站：https://pokopia.xzonn.top/
- 栖息地列表：https://pokopia.xzonn.top/habitat-list
- 仓库：https://github.com/Xzonn/PokemonPokopiaDatabase
- 已打开列表，包含栖息地名称、所需物品与数量、关联宝可梦。例如草丛、花田、野餐桌等组合。
- **性质：社区整理的数据与图片，不是 3D 模型。** 网站声明默认 CC BY-NC-SA；仓库代码标注 GPL-3.0，二者不能混为同一个资源许可。
- 价值：为“布置环境 → 吸引伙伴”的儿童玩法提供中文参考。应按 3–6 岁能力简化步骤，不直接照搬复杂配方；本轮未把这些数据导入游戏。

## 5. Pokopia API：结构化数据接口项目

- 仓库：https://github.com/QuesoCaliente/pokopiapi
- 网站：https://pokopiapi.com/en/
- README 描述提供宝可梦、物品、栖息地、配方等结构化数据，并用 `provenance`、`dataStatus`、`unknownFields` 标记来源、状态与缺失字段。
- **性质：社区数据库/API，不含原版网格的证明。** 本轮核查文档，未运行服务或验证线上接口返回，不把 README 数量当作独立实测。
- 价值：后续可做候选数据导入，保留来源与版本。仓库代码声明 BSD-3-Clause；图片和游戏内容的权利仍需分别记录。

## 6. Awesome Pokopia Builds：场景参考与物品图录

- 仓库：https://github.com/TongShan4869/awesome-pokopia-builds
- 图库：https://tongshan4869.github.io/awesome-pokopia-builds/
- 物品图录：https://tongshan4869.github.io/awesome-pokopia-builds/items/
- README 列出带原作者来源的建造截图、物品 PNG 和 JSON 图录。
- **性质：截图、图标与建造案例，没有确认提供可导入的 3D 场景。** 可用于研究布局、家具尺度与材质风格。

## 7. 官方视觉资料

- 中文官网：https://www.pocoapokemon.jp/sc/
- 用途：角色造型、场景色彩、植被比例、互动表现的视觉核对。
- 页面图片、视频和标志不能当作原始模型、骨骼或贴图通道，也不能依据网页资源存在就推断允许再分发。

## 已排除的线索

- `appleforever11/pokopia-builder`：作者 README 明确表示没有官方网格；3D 视图主要是程序生成形状与图片替代。可看目录/规划逻辑，不把它当作原版素材包。来源：https://github.com/appleforever11/pokopia-builder
- APKPure 的 `com.au.creature.life.simulator.game`：开发者与官方不符，未证实包含真正 Pokopia 素材；前轮已完成页面身份核查。
- 3D 打印 STL/3MF：找到多个同人结果，但文件用途是打印，不能直接获得游戏需要的 UV、骨骼和动画，因此没有购买。
- 泛称“Pokopia PC port”的仓库：没有核实可用的模型/场景来源，不以名称或星标数作为证据。

## 本项目的优先选择

优先评估 **Pokopia Town 的小镇及 Blender 源文件**，它和当前 Three.js 技术栈贴近，而且本轮已经取得可解析的实物文件；角色先保留当前已有资源。栖息地与物品数据作为下一阶段互动设计依据。

若目标必须是“Pokopia 原版资产”，本轮没有解决原始资源来源和提取链路；同人小镇不能替代这一结论。当前交付是资源发现、样本下载和静态结构检查，不是完成接入、视觉验收或 iPad 实机验证。
