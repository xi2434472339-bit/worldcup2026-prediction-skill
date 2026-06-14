import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { generatePrediction } from "../netlify/functions/_shared/openrouter.ts";

const originalEnv = {
  apiKey: process.env.OPENROUTER_API_KEY,
  model: process.env.OPENROUTER_MODEL,
  baseUrl: process.env.OPENROUTER_BASE_URL,
  siteUrl: process.env.OPENROUTER_SITE_URL,
};

before(() => {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  process.env.OPENROUTER_MODEL = "openai/gpt-5.5";
  process.env.OPENROUTER_BASE_URL = "https://openrouter.test/api/v1";
  process.env.OPENROUTER_SITE_URL = "https://gova.example";
});

after(() => {
  for (const [key, value] of Object.entries({
    OPENROUTER_API_KEY: originalEnv.apiKey,
    OPENROUTER_MODEL: originalEnv.model,
    OPENROUTER_BASE_URL: originalEnv.baseUrl,
    OPENROUTER_SITE_URL: originalEnv.siteUrl,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function validContent(score = "3-0") {
  return JSON.stringify({
    teamA: { name: "德国", winProb: 72 },
    draw: 18,
    teamB: { name: "库拉索", winProb: 10 },
    predictedScore: score,
    confidence: "高",
    keyFactors: ["整体实力差距", "德国中场控制", "库拉索经验有限"],
    analysis: "德国整体实力和阵容深度明显占优，预计能够持续控制比赛并创造更多机会。",
    playersToWatch: [
      { team: "德国", player: "维尔茨", reason: "负责进攻组织与最后一传" },
      { team: "库拉索", player: "巴库纳", reason: "反击推进的重要支点" },
    ],
  });
}

describe("OpenRouter GPT-5.5 client", () => {
  it("sends the configured model, reasoning effort and strict JSON schema", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;
      return Response.json({
        model: "openai/gpt-5.5",
        choices: [{ message: { content: validContent() } }],
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 300,
          total_tokens: 1500,
          cost: 0.12,
          completion_tokens_details: { reasoning_tokens: 180 },
        },
      });
    }) as typeof fetch;

    const result = await generatePrediction("德国", "库拉索", "小组赛", {
      reasoningEffort: "high",
      purpose: "official",
      kickoff: "2026-06-14T12:00:00.000Z",
      fetchImpl,
      skillOverride: "测试用戈瓦预测约束",
    });

    const headers = new Headers(capturedInit?.headers);
    const body = JSON.parse(String(capturedInit?.body));
    assert.equal(capturedUrl, "https://openrouter.test/api/v1/chat/completions");
    assert.equal(headers.get("authorization"), "Bearer test-openrouter-key");
    assert.equal(headers.get("http-referer"), "https://gova.example");
    assert.equal(body.model, "openai/gpt-5.5");
    assert.equal(body.reasoning.effort, "high");
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(result.prediction.predictedScore, "3-0");
    assert.equal(result.generation.usage.reasoningTokens, 180);
  });

  it("retries invalid model JSON once and accepts a non-2-1 score", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return Response.json({
        model: "openai/gpt-5.5",
        choices: [
          { message: { content: calls === 1 ? "{invalid" : validContent("3-0") } },
        ],
      });
    }) as typeof fetch;

    const result = await generatePrediction("德国", "库拉索", "小组赛", {
      reasoningEffort: "medium",
      fetchImpl,
      skillOverride: "测试用戈瓦预测约束",
    });
    assert.equal(calls, 2);
    assert.equal(result.prediction.predictedScore, "3-0");
  });

  it("does not retry rate limits", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return Response.json(
        { error: { message: "rate limited" } },
        { status: 429 },
      );
    }) as typeof fetch;

    await assert.rejects(
      () =>
        generatePrediction("德国", "库拉索", "小组赛", {
          fetchImpl,
          skillOverride: "测试用戈瓦预测约束",
        }),
      /请求过于频繁/,
    );
    assert.equal(calls, 1);
  });
});
