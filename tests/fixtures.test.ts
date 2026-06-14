import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FixtureRecord } from "../shared/domain.ts";
import {
  beijingDayKeys,
  canPredictFixture,
  FIFA_FALLBACK_FIXTURES,
  fixturesForHome,
  mergeFixtures,
} from "../shared/fixtures.ts";

describe("fixture schedule", () => {
  it("contains the full 104-match tournament structure", () => {
    assert.equal(FIFA_FALLBACK_FIXTURES.length, 104);
    assert.equal(FIFA_FALLBACK_FIXTURES.filter((fixture) => fixture.stage === "小组赛").length, 72);
    assert.equal(FIFA_FALLBACK_FIXTURES.filter((fixture) => fixture.stage === "32强").length, 16);
    assert.equal(FIFA_FALLBACK_FIXTURES.at(-1)?.matchNumber, 104);
  });

  it("uses Beijing calendar days for the three-day home window", () => {
    const now = new Date("2026-06-13T16:30:00.000Z");
    assert.deepEqual(beijingDayKeys(now), ["2026-06-14", "2026-06-15", "2026-06-16"]);
    const fixtures = fixturesForHome(FIFA_FALLBACK_FIXTURES, now);
    assert.ok(fixtures.length > 0);
    assert.ok(fixtures.every((fixture) => fixture.kickoff.slice(0, 10) >= "2026-06-13"));
  });

  it("keeps knockout slots until dynamic teams are known", () => {
    const fixture = FIFA_FALLBACK_FIXTURES.find((item) => item.matchNumber === 73);
    assert.equal(fixture?.teamA, "A组第二");
    assert.equal(fixture?.teamAConfirmed, false);
  });

  it("replaces fallback matches by stable match number", () => {
    const fallback = FIFA_FALLBACK_FIXTURES.find((item) => item.matchNumber === 73)!;
    const dynamic: FixtureRecord = {
      ...fallback,
      fixtureId: "api-73",
      teamA: "墨西哥",
      teamB: "瑞士",
      teamAConfirmed: true,
      teamBConfirmed: true,
      source: "api-football",
    };
    const merged = mergeFixtures([dynamic]);
    assert.equal(merged.find((item) => item.matchNumber === 73)?.fixtureId, "api-73");
  });

  it("allows only confirmed future fixtures", () => {
    const fixture = {
      ...FIFA_FALLBACK_FIXTURES[0],
      kickoff: "2026-06-15T12:00:00.000Z",
      status: "NS",
    };
    assert.equal(canPredictFixture(fixture, new Date("2026-06-14T12:00:00.000Z")), true);
    assert.equal(canPredictFixture(fixture, new Date("2026-06-16T12:00:00.000Z")), false);
    assert.equal(canPredictFixture({ ...fixture, status: "1H" }, new Date("2026-06-14T12:00:00.000Z")), false);
  });
});
