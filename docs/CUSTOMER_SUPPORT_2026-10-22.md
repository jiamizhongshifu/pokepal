# 家长在线客服

采用 Chatwoot Cloud Hacker 免费版，账户 193052，独立网站收件箱 149208。
仅在家长反馈页 `/feedback/` 提供按钮，点击后才加载第三方客服；游戏入口不会
自动加载客服，也不会自动传送孩子存档、照片、录音或学习记录。

前端与 Cloud 收件箱都关闭附件入口。家长主动发送的文字和必要的连接信息由
Chatwoot 处理；页面已说明用途、30 天聊天记录保留、同浏览器返回查看回复和
邮件兜底方式。收件箱与其他产品共用管理员账户，不构成独立租户。

本地或网页构建传入 `VITE_CHATWOOT_WEBSITE_TOKEN`（此收件箱的公开 website token）
即可显示入口；不配置时保持隐藏。禁止放入管理员 API token 或 HMAC secret。
免费版不承诺用户离开网站后的邮件继续对话；现有家长邮箱/微信仍保留。

本次未修改 `dist/`、移动端包或生产站点；正式网页发布需另行授权并验证。

本地验收：实际页面接入真实 Cloud 收件箱，访客发送与后台人工回复往返通过；
桌面与手机尺寸通过，SDK 加载失败重试、键盘关闭和焦点返回通过，类型检查通过。
证据保存在 SiSkill 工作区 `private/support/2026-10-22/cloud-products-result.json`
与 `cloud-products-ui-result.json`。未代表完整项目 CI 或生产环境验收。

## 网页生产发布 · 2026-10-22

用户批准发布后，源码 `7948ba6029e13adeb0c54aa5e877ecd67a124f1b` 已推送 main。
Cloudflare Pages 部署 `c20b3e33`，正式入口 https://pokepal-online.pages.dev/feedback/ 。
网页 release id `2026-10-22T13:35:24.146Z`，sourceHash
`30d3aaddbee2db262ee8d319829011e2bd15e3995cf9b552e4c841690c01c8b4`。

- 157 项测试和 TypeScript 检查通过；6,363 个网页文件、56,156 条录音、4,096 个音频包验证通过。
- 发布准备保留当前线上 4,395 个旧版资源，无待执行数据库迁移。
- 生产 release 和 16 个关键资源哈希一致，恢复入口 no-store 检查通过。
- 实际会话 #6：家长页面发送、后台回复、桌面与 390px 手机尺寸收取通过；附件入口关闭。
- 游戏入口不请求 Chatwoot；没有修改 iPad/Android 包或 `dist/`。
- 回滚部署：`870e0dd8-067c-4c2a-95c8-f41eca3b45a9`。

证据保存在 SiSkill 工作区 `private/support/2026-10-22/pokepal-*`。
手机系统推送需单独真机验收，不由网页尺寸测试推断。
