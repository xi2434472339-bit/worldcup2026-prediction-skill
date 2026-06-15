import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  FixturePredictionCache,
  OfficialPredictionJob,
  PredictionPayload,
  PredictionRecord,
} from "../shared/domain.ts";
import {
  calculateStats,
  isFixturePredictionCacheValid,
  officialPredictionRecordId,
  shouldQueueOfficialPredictionJob,
  settlePrediction,
  validatePrediction,
} from "../shared/domain.ts";

const prediction: PredictionPayload = {
  teamA: { name: "阿根廷", winProb: 55 },
  draw: 25,
  teamB: { name: "西班牙", winProb: 20 },
  predictedScore: "2-1",
  confidence: "中",
  keyFactors: ["近期状态更稳", "阵容厚度占优", "大赛经验丰富"],
  analysis: "阿根廷在关键比赛经验方面略占优势。",
  playersToWatch: [
    { team: "阿根廷", player: "梅西", reason: "进攻组织核心" },
    { team: "西班牙", player: "亚马尔", reason: "边路突破关键" },
  ],
};

function record(source: "official" | "backtest" = "official"): PredictionRecord {
  return {
    id: `${source}-1`,
    source,
    stage: "小组赛",
    kickoff: "2026-06-14T12:00:00.000Z",
    lockedAt: "2026-06-14T09:00:00.000Z",
    prediction,
    createdAt: "2026-06-14T09:00:00.000Z",
  };
}

describe("prediction validation", () => {
  it("accepts a valid prediction", () => {
    assert.deepEqual(validatePrediction(prediction), prediction);
  });

  it("rejects probabilities that do not total 100", () => {
    assert.throws(() =>
      validatePrediction({
        ...prediction,
        draw: 24,
      }),
      /总和为 100/,
    );
  });

  it("rejects a score that contradicts the highest outcome probability", () => {
    assert.throws(
      () => validatePrediction({ ...prediction, predictedScore: "0-1" }),
      /比分必须与最高胜平负概率方向一致/,
    );
  });
});

describe("prediction cache and official jobs", () => {
  const cache: FixturePredictionCache = {
    fixtureId: "fixture-25",
    matchNumber: 25,
    prediction: {
      ...prediction,
      teamA: { name: "德国", winProb: 70 },
      draw: 20,
      teamB: { name: "库拉索", winProb: 10 },
      predictedScore: "3-0",
      playersToWatch: [
        { team: "德国", player: "维尔茨", reason: "进攻组织核心" },
        { team: "库拉索", player: "巴库纳", reason: "反击推进关键" },
      ],
    },
    generation: {
      provider: "openrouter",
      model: "openai/gpt-5.5",
      reasoningEffort: "medium",
      generatedAt: "2026-06-14T08:00:00.000Z",
      promptVersion: "prompt-v1",
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    },
    createdAt: "2026-06-14T08:00:00.000Z",
    expiresAt: "2026-06-14T14:00:00.000Z",
  };
  const fixture = {
    fixtureId: "fixture-25",
    matchNumber: 25,
    teamA: "德国",
    teamB: "库拉索",
  };

  it("accepts a matching six-hour fixture cache entry", () => {
    assert.equal(
      isFixturePredictionCacheValid(
        cache,
        fixture,
        "prompt-v1",
        new Date("2026-06-14T13:59:59.000Z"),
      ),
      true,
    );
  });

  it("invalidates expired or old-prompt fixture cache entries", () => {
    assert.equal(
      isFixturePredictionCacheValid(
        cache,
        fixture,
        "prompt-v1",
        new Date("2026-06-14T14:00:00.000Z"),
      ),
      false,
    );
    assert.equal(
      isFixturePredictionCacheValid(
        cache,
        fixture,
        "prompt-v2",
        new Date("2026-06-14T12:00:00.000Z"),
      ),
      false,
    );
  });

  it("uses deterministic official IDs and does not requeue active jobs", () => {
    assert.equal(officialPredictionRecordId(25), "official-match-25");
    const job: OfficialPredictionJob = {
      fixtureId: "fixture-25",
      matchNumber: 25,
      status: "running",
      attempts: 1,
      createdAt: "2026-06-14T08:00:00.000Z",
      updatedAt: "2026-06-14T08:05:00.000Z",
    };
    assert.equal(
      shouldQueueOfficialPredictionJob(
        job,
        new Date("2026-06-14T08:10:00.000Z"),
      ),
      false,
    );
    assert.equal(
      shouldQueueOfficialPredictionJob(
        job,
        new Date("2026-06-14T08:16:00.000Z"),
      ),
      true,
    );
  });
});

describe("settlement and public stats", () => {
  it("settles outcome and exact score against 90-minute result", () => {
    const settled = settlePrediction(record(), {
      home: 2,
      away: 1,
      source: "api-football",
      confirmedAt: "2026-06-14T14:00:00.000Z",
    });
    assert.equal(settled.outcomeHit, true);
    assert.equal(settled.exactScoreHit, true);
  });

  it("does not include backtests in official accuracy", () => {
    const official = settlePrediction(record("official"), {
      home: 2,
      away: 1,
      source: "api-football",
      confirmedAt: "2026-06-14T14:00:00.000Z",
    });
    const backtest = settlePrediction(record("backtest"), {
      home: 0,
      away: 3,
      source: "admin",
      confirmedAt: "2026-06-14T14:00:00.000Z",
    });
    const stats = calculateStats([official, backtest]);
    assert.equal(stats.settledOfficial, 1);
    assert.equal(stats.outcomeRate, 100);
    assert.equal(stats.backtestCount, 1);
    assert.equal(stats.backtestOutcomeRate, 0);
    assert.equal(stats.backtestExactScoreRate, 0);
  });
});
