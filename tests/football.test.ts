import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fetchWorldCupFixtures,
  fifaMatchToFixture,
  isOfficialPredictionWindow,
  type FifaCalendarMatch,
} from "../netlify/functions/_shared/football.ts";

function fifaMatch(
  values: Partial<FifaCalendarMatch> = {},
): FifaCalendarMatch {
  return {
    IdMatch: "400021443",
    MatchNumber: 1,
    Date: "2026-06-11T19:00:00Z",
    MatchStatus: 0,
    HomeTeamScore: 2,
    AwayTeamScore: 0,
    Home: { Abbreviation: "MEX" },
    Away: { Abbreviation: "RSA" },
    Stadium: {
      Name: [{ Description: "Mexico City Stadium" }],
      CityName: [{ Description: "Mexico City" }],
    },
    ...values,
  };
}

describe("FIFA calendar sync", () => {
  it("maps official teams, scores and results by stable match number", () => {
    const fixture = fifaMatchToFixture(
      fifaMatch(),
      "2026-06-15T10:00:00.000Z",
    );
    assert.equal(fixture.fixtureId, "400021443");
    assert.equal(fixture.teamA, "墨西哥");
    assert.equal(fixture.teamB, "南非");
    assert.equal(fixture.status, "FT");
    assert.deepEqual(fixture.score, { home: 2, away: 0 });
    assert.equal(fixture.result?.source, "fifa-api");
    assert.equal(fixture.source, "fifa-api");
    assert.equal(fixture.venue, "Mexico City Stadium · Mexico City");
  });

  it("keeps knockout placeholders until FIFA confirms both teams", () => {
    const fixture = fifaMatchToFixture(
      fifaMatch({
        IdMatch: "400021518",
        MatchNumber: 73,
        Date: "2026-06-28T19:00:00Z",
        MatchStatus: 1,
        HomeTeamScore: null,
        AwayTeamScore: null,
        Home: null,
        Away: null,
      }),
    );
    assert.equal(fixture.teamA, "A组第二");
    assert.equal(fixture.teamAConfirmed, false);
    assert.equal(fixture.status, "NS");
    assert.equal(fixture.result, undefined);
  });

  it("fetches and sorts FIFA calendar results", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({
        Results: [
          fifaMatch({
            IdMatch: "400021441",
            MatchNumber: 2,
            Date: "2026-06-12T02:00:00Z",
            Home: { Abbreviation: "KOR" },
            Away: { Abbreviation: "CZE" },
          }),
          fifaMatch(),
        ],
      }));
    const fixtures = await fetchWorldCupFixtures(fetcher as typeof fetch);
    assert.deepEqual(fixtures.map((fixture) => fixture.matchNumber), [1, 2]);
  });
});

describe("official prediction lock window", () => {
  const kickoff = "2026-06-14T12:00:00.000Z";

  it("opens three hours before kickoff", () => {
    assert.equal(isOfficialPredictionWindow(kickoff, new Date("2026-06-14T09:00:00.000Z")), true);
  });

  it("stays open until thirty minutes before kickoff", () => {
    assert.equal(isOfficialPredictionWindow(kickoff, new Date("2026-06-14T11:30:00.000Z")), true);
  });

  it("does not create an official prediction after the cutoff", () => {
    assert.equal(isOfficialPredictionWindow(kickoff, new Date("2026-06-14T11:31:00.000Z")), false);
  });

  it("does not create an official prediction too early", () => {
    assert.equal(isOfficialPredictionWindow(kickoff, new Date("2026-06-14T08:59:59.000Z")), false);
  });
});
