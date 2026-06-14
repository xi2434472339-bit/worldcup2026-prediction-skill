import type { FixtureRecord, OfficialPredictionJob } from "../../../shared/domain";
import { shouldQueueOfficialPredictionJob } from "../../../shared/domain";
import { safeEqual } from "./crypto";
import { env, requiredEnv } from "./env";
import { db } from "./storage";

const STALE_JOB_MS = 10 * 60 * 1000;

export async function queueOfficialPrediction(
  fixture: FixtureRecord,
  origin: string,
) {
  const now = new Date();
  const existing = await db.getOfficialPredictionJob(fixture.fixtureId);
  if (!shouldQueueOfficialPredictionJob(existing, now, STALE_JOB_MS)) {
    return existing;
  }

  const job: OfficialPredictionJob = {
    fixtureId: fixture.fixtureId,
    matchNumber: fixture.matchNumber,
    status: "queued",
    attempts: existing?.attempts ?? 0,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await db.saveOfficialPredictionJob(job);

  const secret = requiredEnv("INTERNAL_JOB_SECRET");
  const response = await fetch(
    `${origin.replace(/\/+$/, "")}/.netlify/functions/official-prediction-background`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Job-Secret": secret,
      },
      body: JSON.stringify({ fixtureId: fixture.fixtureId }),
    },
  );
  if (!response.ok && response.status !== 202) {
    const failed: OfficialPredictionJob = {
      ...job,
      status: "failed",
      updatedAt: new Date().toISOString(),
      error: `后台任务触发失败（${response.status}）`,
    };
    await db.saveOfficialPredictionJob(failed);
    throw new Error(failed.error);
  }
  return job;
}

export function internalJobAuthorized(request: Request) {
  const actual = request.headers.get("x-internal-job-secret") ?? "";
  const expected = env("INTERNAL_JOB_SECRET");
  return Boolean(actual && expected && safeEqual(actual, expected));
}
