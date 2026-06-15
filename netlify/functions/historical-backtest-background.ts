import type { PredictionRecord } from "../../shared/domain";
import { settlePrediction } from "../../shared/domain";
import { fetchWorldCupFixtures } from "./_shared/football";
import { internalJobAuthorized } from "./_shared/official-jobs";
import { generateWithAudit } from "./_shared/prediction-service";
import { db } from "./_shared/storage";

export default async (request: Request) => {
  if (request.method !== "POST" || !internalJobAuthorized(request)) {
    return new Response(null, { status: 401 });
  }

  const fixtures = (await fetchWorldCupFixtures()).filter(
    (fixture) => fixture.status === "FT" && fixture.result,
  );
  const existing = new Set(
    (await db.listPredictions()).map((record) => record.id),
  );

  for (const fixture of fixtures) {
    const id = `backtest-match-${fixture.matchNumber}`;
    if (existing.has(id)) continue;

    const simulatedNow = new Date(
      new Date(fixture.kickoff).getTime() - 4 * 60 * 60 * 1000,
    );
    try {
      const generated = await generateWithAudit(
        fixture.teamA,
        fixture.teamB,
        fixture.stage,
        {
          reasoningEffort: "medium",
          purpose: "backtest",
          kickoff: fixture.kickoff,
          fixtureId: fixture.fixtureId,
          matchNumber: fixture.matchNumber,
          now: simulatedNow,
        },
      );
      const createdAt = generated.generation.generatedAt;
      const record: PredictionRecord = settlePrediction(
        {
          id,
          fixtureId: fixture.fixtureId,
          matchNumber: fixture.matchNumber,
          source: "backtest",
          stage: fixture.stage,
          kickoff: fixture.kickoff,
          lockedAt: createdAt,
          prediction: generated.prediction,
          generation: generated.generation,
          createdAt,
        },
        fixture.result!,
        createdAt,
      );
      await db.savePrediction(record);
    } catch (error) {
      await db.saveAudit({
        id: crypto.randomUUID(),
        action: "historical-backtest-failed",
        actor: "system",
        createdAt: new Date().toISOString(),
        details: {
          fixtureId: fixture.fixtureId,
          matchNumber: fixture.matchNumber,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  return new Response(null, { status: 204 });
};
