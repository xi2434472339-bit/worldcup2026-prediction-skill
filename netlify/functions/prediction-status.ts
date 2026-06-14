import type { Config } from "@netlify/functions";
import { json, methodNotAllowed } from "./_shared/http";
import { findOfficialPrediction } from "./_shared/records";
import { getFixtureById } from "./_shared/fixture-service";
import { db } from "./_shared/storage";

export default async (request: Request) => {
  if (request.method !== "GET") return methodNotAllowed();
  const fixtureId = new URL(request.url).searchParams.get("fixtureId") ?? "";
  const fixture = await getFixtureById(fixtureId);
  if (!fixture) return json({ error: "比赛不存在" }, { status: 404 });

  const official = await findOfficialPrediction(
    fixture.teamA,
    fixture.teamB,
    fixture.fixtureId,
    fixture.stage,
    fixture.matchNumber,
  );
  if (official) {
    return json({ status: "ready", retryAfterMs: 0 });
  }
  const job = await db.getOfficialPredictionJob(fixture.fixtureId);
  return json({
    status: job?.status ?? "failed",
    retryAfterMs: job?.status === "queued" || job?.status === "running" ? 3000 : 0,
    message:
      job?.status === "failed"
        ? job.error || "官方预测生成失败，请稍后重试"
        : undefined,
  });
};

export const config: Config = { path: "/api/prediction-status" };
