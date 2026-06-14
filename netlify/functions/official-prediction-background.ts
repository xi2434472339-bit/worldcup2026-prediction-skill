import type { PredictionRecord } from "../../shared/domain";
import { canPredictFixture } from "../../shared/fixtures";
import { getFixtureById } from "./_shared/fixture-service";
import { isOfficialPredictionWindow } from "./_shared/football";
import { internalJobAuthorized } from "./_shared/official-jobs";
import { generateWithAudit } from "./_shared/prediction-service";
import {
  findOfficialPrediction,
  officialPredictionId,
} from "./_shared/records";
import { db } from "./_shared/storage";

export default async (request: Request) => {
  if (request.method !== "POST" || !internalJobAuthorized(request)) {
    return new Response(null, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    fixtureId?: string;
  };
  if (!body.fixtureId) return new Response(null, { status: 400 });

  const fixture = await getFixtureById(body.fixtureId);
  if (
    !fixture ||
    !canPredictFixture(fixture) ||
    !isOfficialPredictionWindow(fixture.kickoff)
  ) {
    return new Response(null, { status: 409 });
  }

  const existing = await findOfficialPrediction(
    fixture.teamA,
    fixture.teamB,
    fixture.fixtureId,
    fixture.stage,
    fixture.matchNumber,
  );
  if (existing) {
    await db.saveOfficialPredictionJob({
      fixtureId: fixture.fixtureId,
      matchNumber: fixture.matchNumber,
      status: "ready",
      attempts: 1,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
    return new Response(null, { status: 204 });
  }

  const current = await db.getOfficialPredictionJob(fixture.fixtureId);
  const startedAt = new Date().toISOString();
  await db.saveOfficialPredictionJob({
    fixtureId: fixture.fixtureId,
    matchNumber: fixture.matchNumber,
    status: "running",
    attempts: (current?.attempts ?? 0) + 1,
    createdAt: current?.createdAt ?? startedAt,
    updatedAt: startedAt,
    startedAt,
  });

  try {
    const generated = await generateWithAudit(
      fixture.teamA,
      fixture.teamB,
      fixture.stage,
      {
        reasoningEffort: "high",
        purpose: "official",
        kickoff: fixture.kickoff,
        fixtureId: fixture.fixtureId,
        matchNumber: fixture.matchNumber,
      },
    );
    const completedAt = new Date().toISOString();
    const record: PredictionRecord = {
      id: officialPredictionId(fixture.matchNumber),
      fixtureId: fixture.fixtureId,
      matchNumber: fixture.matchNumber,
      source: "official",
      stage: fixture.stage,
      kickoff: fixture.kickoff,
      lockedAt: startedAt,
      prediction: generated.prediction,
      generation: generated.generation,
      createdAt: completedAt,
    };
    await db.savePrediction(record);
    await db.saveOfficialPredictionJob({
      fixtureId: fixture.fixtureId,
      matchNumber: fixture.matchNumber,
      status: "ready",
      attempts: (current?.attempts ?? 0) + 1,
      createdAt: current?.createdAt ?? startedAt,
      updatedAt: completedAt,
      startedAt,
      completedAt,
    });
  } catch (error) {
    const failedAt = new Date().toISOString();
    await db.saveOfficialPredictionJob({
      fixtureId: fixture.fixtureId,
      matchNumber: fixture.matchNumber,
      status: "failed",
      attempts: (current?.attempts ?? 0) + 1,
      createdAt: current?.createdAt ?? startedAt,
      updatedAt: failedAt,
      startedAt,
      completedAt: failedAt,
      error: error instanceof Error ? error.message : "官方预测生成失败",
    });
  }

  return new Response(null, { status: 204 });
};
