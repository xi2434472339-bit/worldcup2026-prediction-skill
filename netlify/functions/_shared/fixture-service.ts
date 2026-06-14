import type { FixtureRecord } from "../../../shared/domain";
import {
  FIFA_FALLBACK_FIXTURES,
  fixturesForHome,
  mergeFixtures,
} from "../../../shared/fixtures";
import { db } from "./storage";

export async function allFixtures() {
  const dynamic = await db.listFixtures();
  return mergeFixtures(dynamic);
}

export async function getFixtureById(fixtureId: string) {
  const direct = await db.getFixture(fixtureId);
  if (direct) return direct;
  return FIFA_FALLBACK_FIXTURES.find((fixture) => fixture.fixtureId === fixtureId) ?? null;
}

export async function queryFixtures(options: {
  from?: string;
  to?: string;
  stage?: string;
  status?: string;
  home?: boolean;
  now?: Date;
}) {
  const dynamic = await db.listFixtures();
  let fixtures: FixtureRecord[] = mergeFixtures(dynamic);
  if (options.home) fixtures = fixturesForHome(fixtures, options.now);
  if (options.from) {
    fixtures = fixtures.filter((fixture) => fixture.kickoff >= options.from!);
  }
  if (options.to) {
    fixtures = fixtures.filter((fixture) => fixture.kickoff <= options.to!);
  }
  if (options.stage) {
    fixtures = fixtures.filter((fixture) => fixture.stage === options.stage);
  }
  if (options.status === "scheduled") {
    fixtures = fixtures.filter((fixture) => !fixture.result);
  } else if (options.status === "finished") {
    fixtures = fixtures.filter((fixture) => Boolean(fixture.result));
  }
  return {
    items: fixtures,
    updatedAt: dynamic.map((fixture) => fixture.updatedAt).sort().at(-1) ?? null,
    usingFallback: dynamic.length === 0,
  };
}
