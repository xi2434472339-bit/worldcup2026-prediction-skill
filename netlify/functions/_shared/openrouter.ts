import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  PredictionGeneration,
  PredictionPayload,
  ReasoningEffort,
  Stage,
} from "../../../shared/domain.ts";
import { validatePrediction } from "../../../shared/domain.ts";
import { env, requiredEnv } from "./env.ts";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-5.5";

let promptCache = "";

export interface GeneratedPrediction {
  prediction: PredictionPayload;
  generation: PredictionGeneration;
}

interface GenerateOptions {
  reasoningEffort?: ReasoningEffort;
  kickoff?: string;
  purpose?: "official" | "fixture" | "custom" | "backtest";
  now?: Date;
  fetchImpl?: typeof fetch;
  skillOverride?: string;
}

interface OpenRouterResponse {
  id?: string;
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  error?: { message?: string; code?: string | number };
}

class InvalidModelOutputError extends Error {}

async function loadSkillPrompt() {
  if (promptCache) return promptCache;
  const candidates = [
    join(process.cwd(), "skill.md"),
    join(process.cwd(), "..", "skill.md"),
  ];
  for (const path of candidates) {
    try {
      promptCache = await readFile(path, "utf8");
      return promptCache;
    } catch {
      // Try the next path. Netlify includes skill.md at the project root.
    }
  }
  throw new Error("服务端无法读取 skill.md");
}

function promptVersion(skill: string) {
  return createHash("sha256").update(skill).digest("hex").slice(0, 16);
}

export async function getSkillPromptVersion(skillOverride?: string) {
  return promptVersion(skillOverride ?? (await loadSkillPrompt()));
}

function predictionSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "teamA",
      "draw",
      "teamB",
      "predictedScore",
      "confidence",
      "keyFactors",
      "analysis",
      "playersToWatch",
    ],
    properties: {
      teamA: {
        type: "object",
        additionalProperties: false,
        required: ["name", "winProb"],
        properties: {
          name: { type: "string" },
          winProb: { type: "integer", minimum: 0, maximum: 85 },
        },
      },
      draw: { type: "integer", minimum: 0, maximum: 85 },
      teamB: {
        type: "object",
        additionalProperties: false,
        required: ["name", "winProb"],
        properties: {
          name: { type: "string" },
          winProb: { type: "integer", minimum: 0, maximum: 85 },
        },
      },
      predictedScore: { type: "string", pattern: "^\\d{1,2}-\\d{1,2}$" },
      confidence: { type: "string", enum: ["高", "中", "低"] },
      keyFactors: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: { type: "string", minLength: 1, maxLength: 15 },
      },
      analysis: { type: "string", minLength: 1, maxLength: 150 },
      playersToWatch: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["team", "player", "reason"],
          properties: {
            team: { type: "string" },
            player: { type: "string" },
            reason: { type: "string", minLength: 1 },
          },
        },
      },
    },
  };
}

function friendlyApiError(status: number, body: OpenRouterResponse) {
  const detail = body.error?.message?.trim();
  if (status === 401 || status === 403) {
    return new Error("OpenRouter API Key 无效或没有模型访问权限");
  }
  if (status === 402) {
    return new Error("OpenRouter 账户余额不足");
  }
  if (status === 429) {
    return new Error("OpenRouter 请求过于频繁，请稍后重试");
  }
  if (status >= 500) {
    return new Error("OpenRouter 模型服务暂时不可用，请稍后重试");
  }
  return new Error(detail || `OpenRouter 请求失败（${status}）`);
}

function safeHeaderValue(value: string) {
  return /^[\x20-\x7E]*$/.test(value) ? value : encodeURIComponent(value);
}

function parsePrediction(
  content: string | undefined,
  teamA: string,
  teamB: string,
) {
  if (!content) throw new InvalidModelOutputError("模型没有返回预测内容");
  try {
    return validatePrediction(JSON.parse(content), { teamA, teamB });
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON 无效";
    throw new InvalidModelOutputError(`模型输出校验失败：${message}`);
  }
}

export async function generatePrediction(
  teamA: string,
  teamB: string,
  stage: Stage,
  options: GenerateOptions = {},
): Promise<GeneratedPrediction> {
  const apiKey = requiredEnv("OPENROUTER_API_KEY");
  const baseUrl = env("OPENROUTER_BASE_URL", DEFAULT_BASE_URL).replace(/\/+$/, "");
  const configuredModel = env("OPENROUTER_MODEL", DEFAULT_MODEL);
  const reasoningEffort = options.reasoningEffort ?? "medium";
  const skill = options.skillOverride ?? (await loadSkillPrompt());
  const version = promptVersion(skill);
  const fetchImpl = options.fetchImpl ?? fetch;
  const currentTime = (options.now ?? new Date()).toISOString();
  const backtestInstruction =
    options.purpose === "backtest"
      ? "这是赛后回测，但你必须忽略比赛实际结果，只按资料截止时间模拟赛前判断。"
      : "";
  const timeoutMs = reasoningEffort === "high" ? 120_000 : 26_000;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const retryInstruction =
        attempt === 0
          ? ""
          : "上一次输出未通过服务器校验。请重新核对概率总和、球队名称、比分方向和字段限制。";
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(env("OPENROUTER_SITE_URL")
            ? { "HTTP-Referer": env("OPENROUTER_SITE_URL") }
            : {}),
          "X-Title": safeHeaderValue(
            env("OPENROUTER_SITE_NAME", "戈瓦预测"),
          ),
        },
        body: JSON.stringify({
          model: configuredModel,
          reasoning: { effort: reasoningEffort },
          max_tokens: reasoningEffort === "high" ? 10_000 : 5_000,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "gova_world_cup_prediction",
              strict: true,
              schema: predictionSchema(),
            },
          },
          messages: [
            { role: "system", content: skill },
            {
              role: "user",
              content: [
                `当前服务器时间：${currentTime}`,
                options.kickoff ? `比赛开赛时间：${options.kickoff}` : "",
                `预测用途：${options.purpose ?? "custom"}`,
                `请预测这场 2026 世界杯比赛：【${stage}】${teamA} vs ${teamB}。`,
                backtestInstruction,
                "比分必须反映胜平负概率和双方实力差距，不得机械套用任何示例比分。",
                "严格输出符合 JSON Schema 的对象，禁止输出投注、赔率或下注建议。",
                retryInstruction,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        }),
      });
      const body = (await response.json().catch(() => ({}))) as OpenRouterResponse;
      if (!response.ok) throw friendlyApiError(response.status, body);
      const prediction = parsePrediction(
        body.choices?.[0]?.message?.content,
        teamA,
        teamB,
      );
      const usage = body.usage ?? {};
      return {
        prediction,
        generation: {
          provider: "openrouter",
          model: body.model || configuredModel,
          reasoningEffort,
          generatedAt: new Date().toISOString(),
          promptVersion: version,
          usage: {
            promptTokens: usage.prompt_tokens ?? 0,
            completionTokens: usage.completion_tokens ?? 0,
            totalTokens:
              usage.total_tokens ??
              (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
            reasoningTokens:
              usage.completion_tokens_details?.reasoning_tokens ?? undefined,
            cost: usage.cost,
          },
        },
      };
    } catch (error) {
      if (error instanceof InvalidModelOutputError && attempt === 0) continue;
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("GPT-5.5 分析超时，请稍后重试");
      }
      if (error instanceof TypeError && error.message === "fetch failed") {
        throw new Error("无法连接 OpenRouter，请检查网络或 OPENROUTER_BASE_URL");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("GPT-5.5 未能生成有效预测");
}

export const OPENROUTER_DEFAULT_MODEL = DEFAULT_MODEL;
