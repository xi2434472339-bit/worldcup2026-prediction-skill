export const STAGES = ["小组赛", "32强", "16强", "8强", "半决赛", "决赛"] as const;

export type Stage = (typeof STAGES)[number];
export type PredictionSource = "official" | "backtest" | "user";
export type MatchOutcome = "teamA" | "draw" | "teamB";

export interface TeamProbability {
  name: string;
  winProb: number;
}

export interface PlayerToWatch {
  team: string;
  player: string;
  reason: string;
}

export interface PredictionPayload {
  teamA: TeamProbability;
  draw: number;
  teamB: TeamProbability;
  predictedScore: string;
  confidence: "高" | "中" | "低";
  keyFactors: string[];
  analysis: string;
  playersToWatch: PlayerToWatch[];
}

export type ReasoningEffort = "medium" | "high";

export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
  cost?: number;
}

export interface PredictionGeneration {
  provider: "openrouter";
  model: string;
  reasoningEffort: ReasoningEffort;
  generatedAt: string;
  promptVersion: string;
  usage: ModelUsage;
}

export interface MatchResult {
  home: number;
  away: number;
  confirmedAt: string;
  source: "fifa-api" | "api-football" | "admin";
}

export interface PredictionRecord {
  id: string;
  fixtureId?: string;
  matchNumber?: number;
  source: PredictionSource;
  stage: Stage;
  kickoff: string;
  lockedAt: string;
  prediction: PredictionPayload;
  generation?: PredictionGeneration;
  result?: MatchResult;
  outcomeHit?: boolean;
  exactScoreHit?: boolean;
  settledAt?: string;
  createdAt: string;
}

export interface PublicStats {
  settledOfficial: number;
  outcomeHits: number;
  exactScoreHits: number;
  outcomeRate: number | null;
  exactScoreRate: number | null;
  backtestCount: number;
  updatedAt: string | null;
}

export interface UsageState {
  id: string;
  freeRemaining: number;
  paidRemaining: number;
  redeemedCodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AccessCode {
  codeHash: string;
  codePreview: string;
  credits: number;
  status: "active" | "redeemed" | "disabled";
  createdAt: string;
  redeemedAt?: string;
  redeemedBy?: string;
  disabledAt?: string;
}

export interface FixtureRecord {
  fixtureId: string;
  matchNumber: number;
  teamA: string;
  teamB: string;
  teamASlot?: string;
  teamBSlot?: string;
  teamAFlag?: string;
  teamBFlag?: string;
  teamALogo?: string;
  teamBLogo?: string;
  teamAConfirmed: boolean;
  teamBConfirmed: boolean;
  stage: Stage;
  roundLabel: string;
  kickoff: string;
  kickoffConfirmed: boolean;
  status: string;
  score?: {
    home: number;
    away: number;
  };
  venue?: string;
  source: "fifa-fallback" | "fifa-api" | "api-football";
  result?: MatchResult;
  updatedAt: string;
}

export interface FixtureQueryResult {
  items: FixtureRecord[];
  updatedAt: string | null;
  usingFallback: boolean;
}

export interface FixturePredictionCache {
  fixtureId: string;
  matchNumber: number;
  prediction: PredictionPayload;
  generation: PredictionGeneration;
  createdAt: string;
  expiresAt: string;
}

export type PredictionJobStatus = "queued" | "running" | "ready" | "failed";

export interface OfficialPredictionJob {
  fixtureId: string;
  matchNumber: number;
  status: PredictionJobStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export function officialPredictionRecordId(matchNumber: number) {
  return `official-match-${matchNumber}`;
}

export function shouldQueueOfficialPredictionJob(
  job: OfficialPredictionJob | null,
  now = new Date(),
  staleAfterMs = 10 * 60 * 1000,
) {
  if (!job) return true;
  if (job.status === "ready" || job.status === "queued") return false;
  if (job.status === "failed") return true;
  return now.getTime() - new Date(job.updatedAt).getTime() > staleAfterMs;
}

export function isFixturePredictionCacheValid(
  cache: FixturePredictionCache | null,
  fixture: Pick<
    FixtureRecord,
    "fixtureId" | "teamA" | "teamB" | "matchNumber"
  >,
  currentPromptVersion: string,
  now = new Date(),
) {
  return Boolean(
    cache &&
      cache.fixtureId === fixture.fixtureId &&
      cache.matchNumber === fixture.matchNumber &&
      cache.generation.promptVersion === currentPromptVersion &&
      new Date(cache.expiresAt).getTime() > now.getTime() &&
      cache.prediction.teamA.name === fixture.teamA &&
      cache.prediction.teamB.name === fixture.teamB,
  );
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: "admin" | "system";
  createdAt: string;
  details: Record<string, unknown>;
}

export interface PaginatedPredictions {
  items: PredictionRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function outcomeFromScore(home: number, away: number): MatchOutcome {
  if (home === away) return "draw";
  return home > away ? "teamA" : "teamB";
}

export function predictedOutcome(prediction: PredictionPayload): MatchOutcome {
  const values: Array<[MatchOutcome, number]> = [
    ["teamA", prediction.teamA.winProb],
    ["draw", prediction.draw],
    ["teamB", prediction.teamB.winProb],
  ];
  values.sort((a, b) => b[1] - a[1]);
  return values[0][0];
}

export function parsePredictedScore(value: string): [number, number] | null {
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  return match ? [Number(match[1]), Number(match[2])] : null;
}

export function settlePrediction(
  record: PredictionRecord,
  result: MatchResult,
  settledAt = new Date().toISOString(),
): PredictionRecord {
  const score = parsePredictedScore(record.prediction.predictedScore);
  return {
    ...record,
    result,
    outcomeHit:
      predictedOutcome(record.prediction) === outcomeFromScore(result.home, result.away),
    exactScoreHit: Boolean(score && score[0] === result.home && score[1] === result.away),
    settledAt,
  };
}

export function calculateStats(records: PredictionRecord[]): PublicStats {
  const official = records.filter(
    (record) => record.source === "official" && record.result && record.settledAt,
  );
  const outcomeHits = official.filter((record) => record.outcomeHit).length;
  const exactScoreHits = official.filter((record) => record.exactScoreHit).length;
  const updatedAt = official
    .map((record) => record.settledAt ?? record.createdAt)
    .sort()
    .at(-1) ?? null;

  return {
    settledOfficial: official.length,
    outcomeHits,
    exactScoreHits,
    outcomeRate: official.length ? Math.round((outcomeHits / official.length) * 1000) / 10 : null,
    exactScoreRate: official.length
      ? Math.round((exactScoreHits / official.length) * 1000) / 10
      : null,
    backtestCount: records.filter((record) => record.source === "backtest").length,
    updatedAt,
  };
}

export function validatePrediction(
  value: unknown,
  expected?: { teamA: string; teamB: string },
): PredictionPayload {
  if (!value || typeof value !== "object") throw new Error("预测结果不是对象");
  const prediction = value as PredictionPayload;
  const total =
    prediction.teamA?.winProb + prediction.draw + prediction.teamB?.winProb;

  if (!prediction.teamA?.name || !prediction.teamB?.name) {
    throw new Error("预测结果缺少球队名称");
  }
  if (
    expected &&
    (prediction.teamA.name !== expected.teamA ||
      prediction.teamB.name !== expected.teamB)
  ) {
    throw new Error("预测结果中的球队名称与请求不一致");
  }
  if (
    !Number.isInteger(prediction.teamA.winProb) ||
    !Number.isInteger(prediction.draw) ||
    !Number.isInteger(prediction.teamB.winProb) ||
    total !== 100
  ) {
    throw new Error("胜平负概率必须为整数且总和为 100");
  }
  if (
    [prediction.teamA.winProb, prediction.draw, prediction.teamB.winProb].some(
      (probability) => probability < 0 || probability > 85,
    )
  ) {
    throw new Error("概率必须在 0 到 85 之间");
  }
  if (!parsePredictedScore(prediction.predictedScore)) {
    throw new Error("预测比分格式无效");
  }
  const [homeGoals, awayGoals] = parsePredictedScore(
    prediction.predictedScore,
  )!;
  if (
    predictedOutcome(prediction) !== outcomeFromScore(homeGoals, awayGoals)
  ) {
    throw new Error("预测比分必须与最高胜平负概率方向一致");
  }
  if (!["高", "中", "低"].includes(prediction.confidence)) {
    throw new Error("置信度无效");
  }
  if (
    !Array.isArray(prediction.keyFactors) ||
    prediction.keyFactors.length < 3 ||
    prediction.keyFactors.length > 5 ||
    prediction.keyFactors.some(
      (factor) => typeof factor !== "string" || !factor.trim() || factor.length > 15,
    )
  ) {
    throw new Error("关键因素数量无效");
  }
  if (
    typeof prediction.analysis !== "string" ||
    !prediction.analysis.trim() ||
    prediction.analysis.length > 150
  ) {
    throw new Error("综合分析必须为 150 字以内");
  }
  if (
    !Array.isArray(prediction.playersToWatch) ||
    prediction.playersToWatch.length !== 2 ||
    prediction.playersToWatch.some(
      (player) =>
        !player ||
        typeof player.team !== "string" ||
        typeof player.player !== "string" ||
        typeof player.reason !== "string" ||
        !player.team ||
        !player.player ||
        !player.reason,
    )
  ) {
    throw new Error("关键球员数量无效");
  }
  if (
    expected &&
    (prediction.playersToWatch[0].team !== expected.teamA ||
      prediction.playersToWatch[1].team !== expected.teamB)
  ) {
    throw new Error("关键球员必须按双方球队各返回一人");
  }
  return prediction;
}
