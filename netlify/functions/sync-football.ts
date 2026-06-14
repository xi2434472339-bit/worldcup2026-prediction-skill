import type { Config } from "@netlify/functions";
import { randomUUID } from "node:crypto";
import { canPredictFixture } from "../../shared/fixtures";
import { fetchWorldCupFixtures, isOfficialPredictionWindow } from "./_shared/football";
import { errorResponse, json } from "./_shared/http";
import { queueOfficialPrediction } from "./_shared/official-jobs";
import { findOfficialPrediction, settleRecord } from "./_shared/records";
import { db } from "./_shared/storage";

async function systemAudit(action: string, details: Record<string, unknown>) {
  await db.saveAudit({
    id: randomUUID(),
    action,
    actor: "system",
    createdAt: new Date().toISOString(),
    details,
  });
}

export default async (request: Request) => {
  try {
    const fixtures = await fetchWorldCupFixtures();
    let generated = 0;
    let settled = 0;
    const failures: string[] = [];

    for (const fixture of fixtures) {
      await db.saveFixture(fixture);
      const existing = await findOfficialPrediction(
        fixture.teamA,
        fixture.teamB,
        fixture.fixtureId,
        fixture.stage,
        fixture.matchNumber,
      );

      if (fixture.result && existing) {
        const before = existing.settledAt;
        await settleRecord(existing, fixture.result);
        if (!before) settled += 1;
      }

      if (
        !existing &&
        canPredictFixture(fixture) &&
        isOfficialPredictionWindow(fixture.kickoff)
      ) {
        try {
          await queueOfficialPrediction(
            fixture,
            new URL(request.url).origin,
          );
          await systemAudit("official-prediction-queued", {
            fixtureId: fixture.fixtureId,
            kickoff: fixture.kickoff,
          });
          generated += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push(`${fixture.fixtureId}: ${message}`);
          await systemAudit("official-prediction-queue-failed", {
            fixtureId: fixture.fixtureId,
            message,
          });
        }
      }
    }

    await systemAudit("fixture-sync", {
      fixtures: fixtures.length,
      generated,
      settled,
      failures,
    });
    return json({ fixtures: fixtures.length, generated, settled, failures });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = {
  schedule: "*/30 * * * *",
};
