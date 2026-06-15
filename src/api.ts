import type {
  FixtureQueryResult,
  PaginatedPredictions,
  PredictionGeneration,
  PredictionJobStatus,
  PredictionPayload,
  PredictionRecord,
  PublicStats,
  Stage,
} from "../shared/domain";
import { calculateStats } from "../shared/domain";
import {
  HISTORICAL_BACKTESTS,
  STATIC_FIXTURES,
} from "../shared/historical";
import { fixturesForHome } from "../shared/fixtures";

const STATIC_DEPLOYMENT =
  import.meta.env.VITE_STATIC_DEPLOYMENT === "true";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  if (STATIC_DEPLOYMENT) {
    throw new Error("当前为只读备用镜像，请在主站使用在线预测功能");
  }
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "请求失败，请稍后再试");
  return data;
}

export interface PredictionReadyResponse {
  status: "ready";
  prediction: PredictionPayload;
  official: boolean;
  cached: boolean;
  generation?: PredictionGeneration;
  remaining: number;
  record?: PredictionRecord;
}

export interface PredictionGeneratingResponse {
  status: "generating";
  fixtureId: string;
  retryAfterMs: number;
  remaining: number;
}

export type PredictionResponse =
  | PredictionReadyResponse
  | PredictionGeneratingResponse;

export interface PredictionStatusResponse {
  status: PredictionJobStatus;
  retryAfterMs: number;
  message?: string;
}

export type PredictionRequest =
  | { mode: "fixture"; fixtureId: string }
  | { mode: "custom"; teamA: string; teamB: string; stage: Stage };

export interface BootstrapResponse {
  stats: PublicStats;
  recent: PredictionRecord[];
  remaining: number;
  contactWechat: string;
  paymentQrUrl: string;
}

function staticPredictions(params: URLSearchParams): PaginatedPredictions {
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize")) || 12));
  const team = params.get("team");
  const status = params.get("status");
  const source = params.get("source");
  let records = [...HISTORICAL_BACKTESTS];
  if (team) {
    records = records.filter(
      (record) =>
        record.prediction.teamA.name.includes(team) ||
        record.prediction.teamB.name.includes(team),
    );
  }
  if (source) records = records.filter((record) => record.source === source);
  if (status === "hit") records = records.filter((record) => record.outcomeHit === true);
  if (status === "miss") records = records.filter((record) => record.outcomeHit === false);
  if (status === "pending") records = records.filter((record) => !record.result);
  records.sort((left, right) => right.kickoff.localeCompare(left.kickoff));
  const total = records.length;
  const start = (page - 1) * pageSize;
  return {
    items: records.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

function staticFixtures(params: URLSearchParams): FixtureQueryResult {
  let items = [...STATIC_FIXTURES];
  if (params.get("window") === "home") items = fixturesForHome(items);
  const stage = params.get("stage");
  const status = params.get("status");
  const from = params.get("from");
  const to = params.get("to");
  if (stage) items = items.filter((fixture) => fixture.stage === stage);
  if (status === "scheduled") items = items.filter((fixture) => !fixture.result);
  if (status === "finished") items = items.filter((fixture) => Boolean(fixture.result));
  if (from) items = items.filter((fixture) => fixture.kickoff >= from);
  if (to) items = items.filter((fixture) => fixture.kickoff <= to);
  items.sort(
    (left, right) =>
      left.kickoff.localeCompare(right.kickoff) ||
      left.matchNumber - right.matchNumber,
  );
  return {
    items,
    updatedAt: HISTORICAL_BACKTESTS.map((record) => record.settledAt ?? record.createdAt)
      .sort()
      .at(-1) ?? null,
    usingFallback: true,
  };
}

const STATIC_STATS = calculateStats(HISTORICAL_BACKTESTS);

export const api = {
  bootstrap: () =>
    STATIC_DEPLOYMENT
      ? Promise.resolve<BootstrapResponse>({
          stats: STATIC_STATS,
          recent: [...HISTORICAL_BACKTESTS]
            .sort((left, right) => right.kickoff.localeCompare(left.kickoff))
            .slice(0, 6),
          remaining: 0,
          contactWechat: "",
          paymentQrUrl: "",
        })
      : request<BootstrapResponse>("/api/bootstrap"),
  fixtures: (params = new URLSearchParams()) =>
    STATIC_DEPLOYMENT
      ? Promise.resolve(staticFixtures(params))
      : request<FixtureQueryResult>(`/api/fixtures?${params.toString()}`),
  predict: (payload: PredictionRequest) =>
    request<PredictionResponse>("/api/predict", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  predictionStatus: (fixtureId: string) =>
    request<PredictionStatusResponse>(
      `/api/prediction-status?fixtureId=${encodeURIComponent(fixtureId)}`,
    ),
  redeem: (code: string) =>
    request<{ remaining: number }>("/api/redeem", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  stats: () =>
    STATIC_DEPLOYMENT
      ? Promise.resolve(STATIC_STATS)
      : request<PublicStats>("/api/stats"),
  predictions: (params: URLSearchParams) =>
    STATIC_DEPLOYMENT
      ? Promise.resolve(staticPredictions(params))
      : request<PaginatedPredictions>(`/api/predictions?${params.toString()}`),
  adminLogin: (password: string) =>
    request<{ ok: true }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  admin: <T>(action: string, payload: Record<string, unknown> = {}) =>
    request<T>("/api/admin", {
      method: "POST",
      body: JSON.stringify({ action, ...payload }),
    }),
};
