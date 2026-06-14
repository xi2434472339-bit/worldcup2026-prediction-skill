import { randomUUID } from "node:crypto";
import type {
  FixtureRecord,
  PredictionGeneration,
  PredictionPayload,
  ReasoningEffort,
  Stage,
} from "../../../shared/domain";
import { isFixturePredictionCacheValid } from "../../../shared/domain";
import {
  generatePrediction,
  getSkillPromptVersion,
} from "./openrouter";
import { db } from "./storage";

const FIXTURE_CACHE_MS = 6 * 60 * 60 * 1000;

export interface PredictionServiceResult {
  prediction: PredictionPayload;
  generation: PredictionGeneration;
  cached: boolean;
}

async function recordGeneration(
  generation: PredictionGeneration,
  details: Record<string, unknown>,
) {
  await db.saveAudit({
    id: randomUUID(),
    action: "ai-generation",
    actor: "system",
    createdAt: new Date().toISOString(),
    details: {
      ...details,
      provider: generation.provider,
      model: generation.model,
      reasoningEffort: generation.reasoningEffort,
      promptVersion: generation.promptVersion,
      usage: generation.usage,
    },
  });
}

export async function generateWithAudit(
  teamA: string,
  teamB: string,
  stage: Stage,
  options: {
    reasoningEffort: ReasoningEffort;
    purpose: "official" | "fixture" | "custom" | "backtest";
    kickoff?: string;
    fixtureId?: string;
    matchNumber?: number;
  },
) {
  const result = await generatePrediction(teamA, teamB, stage, options);
  await recordGeneration(result.generation, {
    purpose: options.purpose,
    fixtureId: options.fixtureId,
    matchNumber: options.matchNumber,
    teamA,
    teamB,
  });
  return result;
}

export async function fixturePrediction(
  fixture: FixtureRecord,
  now = new Date(),
): Promise<PredictionServiceResult> {
  const [cached, currentPromptVersion] = await Promise.all([
    db.getFixturePredictionCache(fixture.fixtureId),
    getSkillPromptVersion(),
  ]);
  if (
    cached &&
    isFixturePredictionCacheValid(
      cached,
      fixture,
      currentPromptVersion,
      now,
    )
  ) {
    return {
      prediction: cached.prediction,
      generation: cached.generation,
      cached: true,
    };
  }

  const result = await generateWithAudit(
    fixture.teamA,
    fixture.teamB,
    fixture.stage,
    {
      reasoningEffort: "medium",
      purpose: "fixture",
      kickoff: fixture.kickoff,
      fixtureId: fixture.fixtureId,
      matchNumber: fixture.matchNumber,
    },
  );
  const createdAt = now.toISOString();
  await db.saveFixturePredictionCache({
    fixtureId: fixture.fixtureId,
    matchNumber: fixture.matchNumber,
    prediction: result.prediction,
    generation: result.generation,
    createdAt,
    expiresAt: new Date(now.getTime() + FIXTURE_CACHE_MS).toISOString(),
  });
  return { ...result, cached: false };
}

export const FIXTURE_PREDICTION_CACHE_MS = FIXTURE_CACHE_MS;
