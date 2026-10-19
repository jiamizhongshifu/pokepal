# 访问量与关键交互统计

## 两层统计与发布状态

2026-10-19：原 GA4 页面统计已部署并在实时报表看到验证事件；本轮发布内容包括本站基础计数器和交互事件。构建、数据库准备和网站部署是独立步骤，线上状态以发布后的回执与实测为准。

| 层级 | 默认状态 | 数据与用途 | 查看入口 |
| --- | --- | --- | --- |
| 本站基础访问量 | 正式站默认开启，可关闭；DNT/GPC 优先关闭 | UTC 日期、固定页面名、次数；不含访客/会话标识、Cookie、原始网址或事件明细 | `npm run analytics:report`，通过已登录 Cloudflare 账号只读查询 |
| GA4 页面与关键交互 | 家长独立同意后开启 | 固定页面、来源 origin、基本设备/会话信息、下表固定事件名 | GA4 实时、互动→事件、探索→漏斗 |

默认层只数页面访问，不统计关键交互。关键交互仍遵循家长的 GA4 选择。两套统计均不读取或上传宝宝姓名、照片、录音、日记、题目答案、学习阶段、课程/宝可梦编号或能量余额。

GA4 同意版本升级为 2：旧版仅页面统计的授权不用于新增交互统计，家长重新选择后才运行。选择保留 180 天，可从首次须知、隐私页面、家长中心→应用维护撤回；暂停试用和清空数据会关闭两层统计。统计不会阻止游玩。纯本地、设备版、预览域名和 fork 默认都不采集。

## 基础访问量口径

- 收集固定屏幕名：同一页面的 React 重渲染不重复计数；切换到另一页面再返回、刷新页面各产生一次访问。不是独立用户/家庭数。
- 浏览器在内存中每 5 秒批量发送到本站 `/api/traffic`，隐藏或离开时尝试发送。无 Cookie、无来源地址、无持久离线队列、不重试、不补传关闭期间的访问；短时异常高频计数有上限。没有用户或设备标识，也无法做单人路径追踪。
- 服务端只接收白名单 `pages: [{page,count}]`，拒绝额外字段、非法页面、重复行和超过 2 KB 的请求。来源校验、防缓存、批量原子累加；GET 不提供数据。来源校验不是身份验证，不能保证拦住伪造流量。
- D1 表 `traffic_daily` 仅含 `day/page/views`，主键 `(day,page)`；时间由服务器生成。报表查最近 30 个 UTC 日；每次写入清理过期行。无访问期间清理可能延后。Cloudflare 自身备份、网络与安全日志仍依平台规则处理，应用不记录请求体、IP、UA、错误堆栈。
- 运营者通过 Cloudflare 权限查看，不提供公开报表接口。已经累加的数字无法按个人识别并撤回。
- 离线、拦截器、隐私设置、网络失败、刷新、自动化请求都会影响次数；不得称为精准 UV，也不能从访问量推断学习效果。

## GA4 事件表

只允许 `src/lib/interactionPolicy.ts` 中的固定名称。没有自由参数，不设置 User-ID、用户属性、课程/伙伴/答案维度。不统计每次答题、每个单词或逐帧动作。未同意时事件直接丢弃，同意后不补发历史操作。

| 事件 | 触发边界 |
| --- | --- |
| `trainer_created` | 首次训练师创建并保存成功，不含昵称/头像 |
| `lesson_started` / `lesson_completed` | 有效可进入的主题课显示 / 结算保存成功；完成事件先于能量事件 |
| `practice_started` / `practice_completed` | 小游戏显示 / 结算保存成功 |
| `review_started` / `review_completed` | 有复习项的回顾页显示 / 一组完成并保存成功 |
| `energy_earned` | 课程、小游戏、回顾、绘本或岛上学习确实增加能量且保存成功；不带数量，无奖励不发 |
| `ball_exchange_started` / `ball_exchanged` | 有足够能量开始兑换 / 保存成功，失败不报成功 |
| `capture_started` / `capture_succeeded` | 有精灵球并实际抛球 / 捕捉保存成功；不是打开草丛 |
| `story_started` / `story_completed` | 绘本版本打开 / 当天第一次读完全部页并保存；仅翻到结尾不算读完，重复确认不重复累计 |
| `together_started` / `together_completed` / `together_timeout` | 有效玩法开始 / 整组轮次完成 / 伙伴到场超时；不代表家长实际参与 |
| `companion_interacted` | 抚摸等伙伴交互生效，不包含伙伴和操作类型 |
| `help_opened` | 主动打开帮助，自动引导不计 |
| `family_tip_opened` | 展开绘本陪读提示，不推断实际亲子共读 |
| `rest_shown` | 到时休息页显示，一次挂载仅一次 |
| `learning_settings_saved` | 家长保存学习设置成功，不含所选阶段 |
| `author_contact_opened` / `source_repository_opened` | 打开作者联系框 / 点击开源仓库；不表示已联系或已访问成功 |
| `feedback_copied` | 复制反馈成功，不发送反馈文本；不表示作者已收到反馈 |

React StrictMode 重放不会重复上报活动开始。成功事件在业务成功边界触发，不靠 DOM 点击委托猜测。使用短时页面 Cookie 的 GA 用户数不是家庭数，事件也不能证明宝宝独立完成。跨日、重玩、撤回、未同意及各种起点会令开始与完成次数不一一对应。

## Google 配置

- 账号 samzhong（384203641），媒体资源 PokéPal · 宝可梦小小训练师（559547140）。
- 网站流 16156330470；衡量 ID `G-GZ972XGCKC`；[实时报表](https://analytics.google.com/analytics/web/#/a384203641p559547140/realtime/overview)。
- 增强型衡量、Google signals、用户提供的数据、广告个性化、精细位置与设备采集保持关闭。
- 事件/用户保留 2 个月，不因新活动重置；汇总报表不受此期限限制。
- 使用 `pokepal` 前缀会话 Cookie；固定虚拟地址不带参数和片段，来源仅 origin，不采集 UTM。
- 关闭立即停止新增事件并清除可访问的统计 Cookie；已发送/进入 Google 内部队列的事件不能撤回。国内网络和内容拦截器可能阻断 Google。
- 主漏斗可配置 `lesson_started → lesson_completed → energy_earned → ball_exchanged → capture_succeeded`；小游戏另用 `practice_started/practice_completed`。不要将此漏斗解释为全部用户转化率。

## 本地验收与发布

数据库 `pokepal-traffic` 已建立，绑定 `TRAFFIC_DB`；数据库 ID 是公开配置标识而非访问凭据。迁移仅新增汇总表，不改游戏存档。

```sh
# 本地隔离数据库；不会写正式数据
wrangler d1 migrations apply TRAFFIC_DB --local
npm run check
npm run build
wrangler pages dev dist-online --port 4198
npm run analytics:report -- --local
```

客户端正式域名保护使 localhost 不自动发送统计；端点可用 localhost Origin 验证，浏览器测试在隔离上下文中将正式域名映射到本地，禁止把合成事件送往真实 Google。Pages Function 仅在 `/api/traffic` 执行，其他页面和媒体仍是静态资源。

用户明确要求发布后：提交审核过的改动、推送源码，执行 `npm run release:publish`。该入口先校验网页产物，再应用正式 D1 迁移，最后部署 Pages。若直接使用 Wrangler 发布，也必须先执行 `wrangler d1 migrations apply TRAFFIC_DB --remote`，否则计数接口返回 503。不要把数据库创建或迁移成功称为网站已更新。

发布验收：核对 release.json；默认只有本站计数且无 Google 请求；同意后 GA 固定事件；关闭两层后无新增请求；核对基础报表与 GA 实时。用测试流量验证会增加少量汇总数字，应在验收记录注明。

### 本轮本地验收记录

- `npm run build` 完成：151 项测试、TypeScript、56,156 条本地配音资源校验通过；网页 release 为 `2026-10-19T05:25:31.313Z`，源码与产物哈希一致。
- 隔离浏览器与本地 D1 验证默认计数、页面去重、无 Cookie/来源、关闭后持久生效、旧版授权不复用、授权前事件不补传、保存失败与重复捕捉不报成功、完成先于能量事件。
- 实际 React 页面验证绘本开始、帮助、主题课、小游戏、兑换及休息触发；StrictMode 不重复上报开始。390 / 1024 宽度的统计设置无横向溢出。
- 最终构建包验证默认不请求 Google，授权后加载，撤回后刷新不再加载；Google 脚本使用隔离桩，事件未发往正式 GA。此记录不代表新版线上采集已验收。
