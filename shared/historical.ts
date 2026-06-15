import type { FixtureRecord, PredictionRecord } from "./domain";
import { FIFA_FALLBACK_FIXTURES } from "./fixtures";
import historicalBacktests from "./historical-backtests.json";

export const HISTORICAL_BACKTESTS =
  historicalBacktests as PredictionRecord[];

const backtestByMatch = new Map(
  HISTORICAL_BACKTESTS.map((record) => [record.matchNumber, record]),
);

export const STATIC_FIXTURES: FixtureRecord[] =
  FIFA_FALLBACK_FIXTURES.map((fixture) => {
    const backtest = backtestByMatch.get(fixture.matchNumber);
    if (!backtest?.result) return fixture;
    return {
      ...fixture,
      fixtureId: backtest.fixtureId ?? fixture.fixtureId,
      status: "FT",
      score: {
        home: backtest.result.home,
        away: backtest.result.away,
      },
      result: backtest.result,
      source: "fifa-api",
      updatedAt: backtest.result.confirmedAt,
    };
  });
