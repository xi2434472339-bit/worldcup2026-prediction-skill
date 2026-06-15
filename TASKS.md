# 戈瓦预测网站任务清单

更新时间：2026-06-15

## 已完成

- [x] 保存中断现场检查点。
- [x] 安装 npm 依赖并提交 `package-lock.json`。
- [x] 运行 `npm.cmd test` 并通过全部 21 个测试。
- [x] 运行 `npm.cmd run build` 并通过生产构建。
- [x] 验证 Netlify 本地前端启动和 Functions 加载。
- [x] 验证 `/api/bootstrap` 本地返回 200。
- [x] 修复 OpenRouter 网络失败时的明确错误提示。
- [x] 同步项目文档。
- [x] 将仓库发布到 `xi2434472339-bit/worldcup2026-prediction-skill`。
- [x] 在正确账号创建 Netlify 项目 `gova-prediction-2026` 并配置基础环境变量。
- [x] 发布 GitHub Pages 静态预览并验证首页资源返回 200。
- [x] 将 FIFA 官方 104 场比赛编号、淘汰赛槽位和开球时间同步到静态赛程。
- [x] 部署完整 Netlify 生产站点并验证首页、`/api/bootstrap` 和 `/api/fixtures`。

## 待处理

- [ ] 经用户明确授权后，在正确 Netlify 站点配置本机已有的 `OPENROUTER_API_KEY`。
- [ ] 如需实时比分和状态，在 Netlify 配置 `API_FOOTBALL_KEY` 和 `API_FOOTBALL_LEAGUE_ID`。
- [ ] 配置管理员密码、联系微信和收款码等运营变量。
- [ ] 配置 API-Football 后确认 `sync-football` 定时函数每 30 分钟运行。
- [ ] 部署后确认 `official-prediction-background` 可执行官方 high 推理任务。
- [ ] 根据 `npm audit` 结果规划非破坏性依赖安全升级。
