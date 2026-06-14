# 戈瓦预测网站部署说明

## 本地检查

项目根目录的 `preview.html` 只展示界面，不再生成任何模拟比分。真实预测必须通过 Netlify 本地服务或正式站点调用。

1. 安装依赖：`npm install`
2. 复制 `.env.example` 为 `.env`
3. 在 `.env` 中填写 OpenRouter API Key 和随机的 `INTERNAL_JOB_SECRET`
4. 设置临时后台密码：`ADMIN_PASSWORD=你的本地密码`
5. 启动 Netlify 本地环境：`npm run netlify:dev -- --port 8888`

必须使用 `netlify:dev`，普通 `npm run dev` 不会启动 Functions 和 Blobs。

## 生产环境变量

- `OPENROUTER_API_KEY`：OpenRouter API 密钥
- `OPENROUTER_MODEL`：默认 `openai/gpt-5.5`
- `OPENROUTER_BASE_URL`：默认 `https://openrouter.ai/api/v1`
- `OPENROUTER_SITE_URL`：正式站点地址
- `OPENROUTER_SITE_NAME`：默认 `戈瓦预测`
- `INTERNAL_JOB_SECRET`：至少 32 字节的随机字符串，用于触发后台官方预测
- `API_FOOTBALL_KEY`：API-Football 密钥
- `API_FOOTBALL_LEAGUE_ID`：2026 世界杯赛事 ID
- `API_FOOTBALL_SEASON`：默认 `2026`
- `ADMIN_PASSWORD_HASH`：管理员密码的 SHA-256 小写十六进制
- `SESSION_SECRET`：至少 32 字节的随机字符串
- `CONTACT_WECHAT`：付款后联系的微信号
- `PAYMENT_QR_URL`：收款码图片 URL，例如 `/payment-qr.png`

生成管理员密码哈希：

```powershell
node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('替换成你的密码').digest('hex'))"
```

生成会话密钥：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Netlify 发布

确认本地首版后执行：

```powershell
npm run build
npx netlify login
npx netlify init --manual
npx netlify env:set OPENROUTER_API_KEY "..." --secret
npx netlify env:set OPENROUTER_MODEL "openai/gpt-5.5"
npx netlify env:set INTERNAL_JOB_SECRET "..." --secret
npx netlify env:set API_FOOTBALL_KEY "..."
npx netlify deploy
npx netlify deploy --prod
```

首次发布前应在 Netlify 后台确认定时函数 `sync-football` 已注册为每 30 分钟运行一次。
同时确认 `official-prediction-background` 已作为 Background Function 部署；官方 high 推理任务由它执行。

## 模型调用

- 普通真实赛程和自定义对阵使用 `reasoning.effort=medium`。
- 官方锁定预测使用 `reasoning.effort=high`，首次请求返回生成中状态，完成后页面自动刷新。
- 普通真实赛程缓存 6 小时；Skill 内容变化、球队变化或缓存过期都会触发重新生成。
- OpenRouter 超时、限流或 JSON 校验失败时不返回模拟结果，也不扣除用户次数。

## 赛程数据

- 首页请求北京时间今天、明天、后天的未完赛比赛。
- `/schedule` 展示小组赛到决赛共 104 场完整赛程。
- 静态赛程负责在 API 不可用时保留比赛结构；未确认的开赛时间显示“时间待同步”。
- 淘汰赛球队未确定时显示晋级路径，API-Football 返回球队后按稳定比赛编号覆盖占位。
- 直播中和已开赛比赛禁止新预测；淘汰赛双方未确定时不会生成官方预测。
- 自定义对阵会扣减次数，但不会写入官方战绩或准确率。

## 数据口径

- 官方命中率只统计开赛前 30 分钟之前锁定的官方预测。
- 淘汰赛仍按 90 分钟赛果和 90 分钟比分结算。
- 历史回测始终标记为赛后模拟，不进入官方命中率。
- 管理员修正赛果会写入审计日志。
