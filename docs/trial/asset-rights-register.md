# 对外资源来源与许可登记

核对日期：2026-10-18。针对当日正式版 `2026-10-18T02:15:11.045Z` 的发布目录，按目录逐文件统计大小与 SHA-256；不等同于逐件完成法律审查。清单只记录当前发布包含的文件，不复制媒体进源码仓库。

| 资源组 | 发布文件数 | 已有来源证据 | 公开使用状态 / 下一步 |
|---|---:|---|---|
| models | 406 | `docs/pogo-assets-upgrade-20261014.md`；本地各批次 `source-provenance.json`；`docs/pokopia-asset-evaluation-20261015.md` | 混合宝可梦角色和场景物件，不能统一授予 MIT。运营者确认暂无相关公开分发授权材料；同人场景需保留原作者许可并排除第三方角色 |
| pokemon | 1,164 | 同上 APK 叫声提取记录；`scripts/fetch-pokemon.mjs` 与数据映射 | 图片、角色素材及叫声的第三方权利待确认；下载地址、哈希不是授权 |
| art | 5 | `output/imagegen/` 的世界画面生成记录 | 原创生成过程不自动解决画面内角色/标识权利；逐图确认来源和是否含第三方角色 |
| icons | 298 | `docs/swsh-icons-20261015.md`、`docs/island-announcements-decoration-20261017.md`、切图脚本与生成清单 | 普通操作符号与角色/品牌图标分开审查；生成图也不能整组宣称可自由分发 |
| story-art | 26 | `public/story-art/painted-v1/` 背景/道具；本地绘制记录 | 背景/道具和运行时叠加的宝可梦角色分开登记；补齐每张背景的生成凭据 |
| env | 1 | `sky_1k.hdr`，当前查到的工程资料不足以确认原下载来源 | 待补来源/许可或替换有明确许可的天空资源 |
| textures | 3 | sand_Diffuse.jpg、sand_nor_gl.jpg、cloud.png | 待补来源/许可或替换；文件名不能证明 CC0 |
| music | 8（7 音轨 + 清单） | `scripts/music/render.py` 与音乐 manifest | 清单声明原创谱曲/加法合成、无外部采样；7 个音轨 SHA-256 与清单一致。仅证明制作溯源，不扩展到其他素材 |
| environment | 7（6 音轨 + 清单） | `scripts/environment/render.py` 与环境音 manifest | 清单声明原创程序化声音、无第三方录音；6 个音轨 SHA-256 一致 |
| voice-online/packs | 4,096 | 火山录音清单、`scripts/voice/` 制作链 | 56,150 条教学录音有技术完整性记录；需核实所用服务/音色输出的对外分发条款，不把已付费等同于无限权利 |

环境音与音乐共 13 个文件本轮重新核验哈希。其余目录即使包含许可明确的个别文件，也未将整组标成通过。

## 运营者确认

2026-10-18，运营者明确回复：相关公开分发授权或许可文件“暂无”。这是已确认的材料缺口，不能继续标成等待查找已有文件。R1 保持未关闭；后续需取得对应授权或确定有明确使用依据的替换方案。本轮不替换资产、不扩大发送体验链接，也不擅自停站。

## 本地证据

- `output/qa/release-execution-20261018/media-inventory.csv`：逐文件路径、大小、SHA-256、分组和审查状态。
- `output/qa/release-execution-20261018/media-summary.json`：与上表一致的计数与字节数。
- PokeMiners 模型、游戏 APK 提取叫声：`models-src/_research/pogo-*/` 的 provenance / delivery 清单。
- 同人小镇：`output/research/pokopia/town-samples/LICENSE`、`THIRD_PARTY_NOTICES.md`。原仓库自己的 MIT 范围不能替代宝可梦角色的权利证明。

上述本地媒体/研究证据不纳入开源提交；源码仓库只保留登记表和定位信息。

## 关闭每项的标准

记录资源路径/哈希、作者或权利人、原始出处、许可文本及日期、许可覆盖的复制/改编/公开分发/地域和署名条件。运营者已有授权时据文件核实；无依据时保持待确认，或另行确定替换方案。不要把“非官方”“免费”“只有五个家庭”写成许可。

当前未取得授权、未联系权利人或替换整套宝可梦资产，R1 仍未关闭。
