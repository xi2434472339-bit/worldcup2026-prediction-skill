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

const STATIC_DEPLOYMENT =
  import.meta.env.VITE_STATIC_DEPLOYMENT === "true";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  if (STATIC_DEPLOYMENT) {
    throw new Error("当前为静态预览站，在线预测服务等待 Netlify 额度恢复");
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

export const api = {
  bootstrap: () => request<BootstrapResponse>("/api/bootstrap"),
  fixtures: (params = new URLSearchParams()) =>
    request<FixtureQueryResult>(`/api/fixtures?${params.toString()}`),
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
  stats: () => request<PublicStats>("/api/stats"),
  predictions: (params: URLSearchParams) =>
    request<PaginatedPredictions>(`/api/predictions?${params.toString()}`),
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
