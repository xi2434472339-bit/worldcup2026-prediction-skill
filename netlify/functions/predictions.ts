import type { Config } from "@netlify/functions";
import type { PredictionSource } from "../../shared/domain";
import { errorResponse, json } from "./_shared/http";
import { queryPredictions } from "./_shared/records";

export default async (request: Request) => {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize")) || 12));
    const rawSource = url.searchParams.get("source");
    const source = rawSource === "official" || rawSource === "backtest" ? rawSource : undefined;
    return json(
      await queryPredictions({
        page,
        pageSize,
        team: url.searchParams.get("team") || undefined,
        status: url.searchParams.get("status") || undefined,
        source: source as PredictionSource | undefined,
        from: url.searchParams.get("from") || undefined,
        to: url.searchParams.get("to") || undefined,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/predictions" };
