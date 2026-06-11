# ⚽ WorldCup-2026-Prediction-Skill · 绿茵神算

一份经过实战验证的**大模型系统提示词（System Prompt）**，让任何大模型对 2026 世界杯比赛做出**有依据、格式稳定**的预测——杜绝瞎编比分、虚构伤病。

🔗 在线体验：[worldcup.youliaoyun.com](http://worldcup.youliaoyun.com)

## 它解决什么问题

直接问大模型"墨西哥对南非谁会赢"，它会一本正经地编：编历史交锋、编球员伤病、每次输出格式还不一样。本 Skill 通过四层约束解决：

1. **资料库**——12 个小组 48 支队的真实分组、历史战绩、核心球员状态全部写死在文档里，模型只许引用
2. **方法论**——固定评估权重：近期状态 40% / 硬实力 30% / 历史交锋 15% / 情境因素 15%，并限制最大胜率 ≤85%（足球有偶然性）
3. **输出契约**——严格 JSON 格式（胜平负概率、比分、信心、关键因素、关键先生、解说式分析），可直接喂给前端渲染
4. **每日情报区**——文档末尾的「最新情报」节设计为可覆盖更新位：用任何自动化流程（AI Agent / 爬虫 / 人工）每天只重写这一节，预测就能跟上伤停变化，其余章节永不用动

## 使用方法

把 [`skill.md`](skill.md) **全文**作为 `system` 消息，用户消息传入对阵即可。任何 OpenAI 兼容接口通用（DeepSeek / Qwen / GPT / Claude）：

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的APIKey" \
  -d '{
    "model": "deepseek-v4-pro",
    "response_format": {"type": "json_object"},
    "messages": [
      {"role": "system", "content": "<skill.md 全文粘贴到这里>"},
      {"role": "user", "content": "请预测这场 2026 世界杯比赛：【小组赛】墨西哥 vs 南非。严格按约束文档的 JSON 格式输出。"}
    ]
  }'
```

返回示例（真实输出）：

```json
{
  "teamA": { "name": "墨西哥", "winProb": 70 },
  "draw": 20,
  "teamB": { "name": "南非", "winProb": 10 },
  "predictedScore": "2-0",
  "confidence": "高",
  "keyFactors": ["阿兹特克主场揭幕战气势如虹", "墨西哥金杯冠军班底实力碾压", "南非时隔16年重返经验不足"],
  "analysis": "东道主墨西哥在阿兹特克球场迎战南非，实力与主场优势明显……",
  "playersToWatch": [
    { "team": "墨西哥", "player": "圣地亚哥·希门尼斯", "reason": "米兰前锋状态火热" },
    { "team": "南非", "player": "佩西·塔乌", "reason": "南非进攻核心，肩负爆冷希望" }
  ]
}
```

阶段可选：小组赛 / 32强 / 16强 / 8强 / 半决赛 / 决赛（淘汰赛的"平局"概率代表 90 分钟战平进加时/点球）。

## 每日更新

只重写 `skill.md` 末尾「## 六、最新情报（每日更新区）」一节：更新日期、写入未来 48 小时参赛队的伤停与状态要点（未经证实的标"传闻"）。**不要动一至五节**。

## 声明

仅供娱乐与球迷讨论。本 Skill 内置红线：拒绝输出任何投注、赔率、下注建议。预测结果不构成任何参考依据，请理性看球。

## License

MIT
