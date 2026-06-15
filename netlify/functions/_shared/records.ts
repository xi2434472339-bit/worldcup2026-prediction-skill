import type {
  MatchResult,
  PaginatedPredictions,
  PredictionRecord,
  PredictionSource,
} from "../../../shared/domain";
import {
  calculateStats,
  officialPredictionRecordId,
  settlePrediction,
} from "../../../shared/domain";
import { HISTORICAL_BACKTESTS } from "../../../shared/historical";
import { db } from "./storage";

export const officialPredictionId = officialPredictionRecordId;

async function allPredictionRecords() {
  const dynamic = await db.listPredictions();
  const records = new Map(
    HISTORICAL_BACKTESTS.map((record) => [record.id, record]),
  );
  for (const record of dynamic) records.set(record.id, record);
  return [...records.values()];
}

export async function publicStats() {
  return calculateStats(await allPredictionRecords());
}

export async function recentPredictions(limit = 6) {
  return (await allPredictionRecords())
    .filter((record) => record.source !== "user")
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
    .slice(0, limit);
}

export async function findOfficialPrediction(
  teamA: string,
  teamB: string,
  fixtureId?: string,
  stage?: string,
  matchNumber?: number,
) {
  if (matchNumber) {
    const deterministic = await db.getPrediction(officialPredictionId(matchNumber));
    if (deterministic?.source === "official") return deterministic;
  }
  const recentCutoff = Date.now() - 3 * 60 * 60 * 1000;
  return (await db.listPredictions())
    .filter((record) => record.source === "official")
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
    .find(
      (record) =>
        (fixtureId && record.fixtureId === fixtureId) ||
        (matchNumber && record.matchNumber === matchNumber) ||
        (record.prediction.teamA.name === teamA &&
          record.prediction.teamB.name === teamB &&
          (!stage || record.stage === stage) &&
          new Date(record.kickoff).getTime() >= recentCutoff),
    );
}

export async function settleRecord(
  record: PredictionRecord,
  result: MatchResult,
) {
  if (record.settledAt && record.result?.home === result.home && record.result.away === result.away) {
    return record;
  }
  const settled = settlePrediction(record, result);
  await db.savePrediction(settled);
  return settled;
}

export async function queryPredictions(options: {
  page: number;
  pageSize: number;
  team?: string;
  status?: string;
  source?: PredictionSource;
  from?: string;
  to?: string;
}): Promise<PaginatedPredictions> {
  const { page, pageSize, team, status, source, from, to } = options;
  let records = (await allPredictionRecords()).filter((record) => record.source !== "user");
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
  if (from) records = records.filter((record) => record.kickoff >= from);
  if (to) records = records.filter((record) => record.kickoff <= to);
  records.sort((a, b) => b.kickoff.localeCompare(a.kickoff));
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
