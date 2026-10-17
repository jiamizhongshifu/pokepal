# 图标升级验收报告 · 2026-10-15

**结论：本轮图标升级的本地验收通过。发现并修复 2 处问题，最终构建及浏览器复验通过。**

## 验收范围与结果

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 120 个图标、360 张切图 | 通过 | 尺寸、RGBA、透明留白、PNG 解码、SHA-256 均符合清单 |
| 下载 ZIP | 通过 | ZIP 完整性正常；360 张 PNG 与项目对应文件逐字节一致 |
| 32 px 小尺寸，浅/深背景 | 通过 | 120 个图标全部加载；人工检查总览，无错位、残缺或串图 |
| 换球与捕捉 | 通过 | 真实点击购买超级球，能量从 50 到 40，超级球增加 1；捕捉皮卡丘后进入资料页 |
| 四类教学入口 | 通过 | 听、说、认、写均打开；复读、擦除按钮点击正常；图标加载和关键尺寸正常 |
| 家长验证 | 修复后通过 | 长按打开，取消、退格清空、正确答案进入家长页均通过真实点击验证 |
| 当前题目进度标记 | 修复后通过 | 已从旧 CSS 精灵球改成新 PNG，尺寸维持 34×34 |
| 正式构建 | 通过 | `npm run build` 成功，最终 CSS 为 `index-x8zMzyZg.css` |
| 冷启动 | 通过 | 独立浏览器加载正式构建，页面异常 0、失败请求 0 |
| 断网刷新 | 通过 | 最新构建断网刷新后正常显示；120 个图标全部响应成功且解码为 256×256 |

## 修复 1：家长弹窗被导航遮挡

- 复现：1024×768 家园页长按家长入口，底部导航与右侧机位按钮显示在弹窗前；取消按钮被导航截获点击。
- 原因：弹窗嵌套在 `topbar` 内，受顶部栏层叠上下文限制。
- 修改：`src/components/ParentGate.tsx` 使用 `createPortal(..., document.body)` 将弹窗移到页面顶层。
- 复验：不使用强制点击，成功取消；再次长按打开后输入、退格、输入正确答案、进入家长页均通过。正式构建也复验了取消路径。
- 截图：[修复前](../output/playwright/swsh-acceptance/parent-gate.png)、[修复后](../output/playwright/swsh-acceptance/parent-gate-fixed.png)。

## 修复 2：教学进度标记遗漏

- 复现：教学页面顶部当前题目标记仍由 CSS 渐变绘制旧精灵球。
- 修改：`src/styles.css` 的 `.round-dots span.cur` 使用 `/icons/swsh/ball-poke.png`，保留原 34×34 尺寸。
- 复验：开发与最新正式构建均检查了计算样式，确认指向新 PNG；最新构建断网刷新与图标解码通过。
- 截图：[正式构建最终进度标记](../output/playwright/swsh-acceptance/production-round-final.png)。

## 主要证据

- [机器可读验收结果](../output/playwright/swsh-acceptance/acceptance-results.json)
- [32 px 浅色总览](../output/playwright/swsh-acceptance/icons-32-light.png)
- [32 px 深色总览](../output/playwright/swsh-acceptance/icons-32-dark.png)
- [教学页深色总览](../output/playwright/swsh-acceptance/teaching-dark-contact.png)
- [捕捉成功](../output/playwright/swsh-acceptance/caught.png)
- [最终构建日志](../output/playwright/swsh-acceptance/build-final.log)
- [最终版本离线验证](../output/playwright/swsh-acceptance/final-release.txt)

## 验证边界

在独立 Chromium 会话中执行，使用测试存档及测试能量，未修改用户现有存档。主要交互视口为 1024×768，总览为 1440×1200；冷启动与离线使用本地静态服务器加载 `dist`，通过 Service Worker 实际缓存和断网验证。

本报告验收的是图标资源、接入、相关显示与点击交互，不代表全游戏逻辑、语音识别准确率或所有教学回合均已完成验证。未进行实体 iPad/Safari 安装测试，也未部署线上。构建保留已有的大 chunk 提示。
