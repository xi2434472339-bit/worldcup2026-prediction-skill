import type { FixtureRecord, Stage } from "./domain.ts";
import { TEAMS, teamByName } from "./teams.ts";

const GROUPS = TEAMS.reduce<Record<string, typeof TEAMS>>((groups, team) => {
  groups[team.group] ??= [];
  groups[team.group].push(team);
  return groups;
}, {});
const DEFAULT_TIME = "12:00:00.000Z";

type GroupDateSet = [string, string, string, string];

const GROUP_DATES: Record<string, GroupDateSet> = {
  A: ["2026-06-11", "2026-06-11", "2026-06-18", "2026-06-24"],
  B: ["2026-06-12", "2026-06-13", "2026-06-18", "2026-06-24"],
  C: ["2026-06-13", "2026-06-13", "2026-06-19", "2026-06-24"],
  D: ["2026-06-12", "2026-06-13", "2026-06-19", "2026-06-25"],
  E: ["2026-06-14", "2026-06-14", "2026-06-20", "2026-06-25"],
  F: ["2026-06-14", "2026-06-14", "2026-06-20", "2026-06-25"],
  G: ["2026-06-15", "2026-06-15", "2026-06-21", "2026-06-26"],
  H: ["2026-06-15", "2026-06-15", "2026-06-21", "2026-06-26"],
  I: ["2026-06-16", "2026-06-16", "2026-06-22", "2026-06-26"],
  J: ["2026-06-16", "2026-06-16", "2026-06-22", "2026-06-27"],
  K: ["2026-06-17", "2026-06-17", "2026-06-23", "2026-06-27"],
  L: ["2026-06-17", "2026-06-17", "2026-06-23", "2026-06-27"],
};

const GROUP_MATCHUPS = [
  [0, 1, 0],
  [2, 3, 1],
  [0, 2, 2],
  [3, 1, 2],
  [3, 0, 3],
  [1, 2, 3],
] as const;

function fallbackFixture(
  matchNumber: number,
  teamA: string,
  teamB: string,
  stage: Stage,
  date: string,
  roundLabel: string,
  options: Partial<FixtureRecord> = {},
): FixtureRecord {
  return {
    fixtureId: `fifa-${matchNumber}`,
    matchNumber,
    teamA,
    teamB,
    teamASlot: teamA,
    teamBSlot: teamB,
    teamAFlag: teamByName(teamA)?.code,
    teamBFlag: teamByName(teamB)?.code,
    teamAConfirmed: Boolean(teamByName(teamA)),
    teamBConfirmed: Boolean(teamByName(teamB)),
    stage,
    roundLabel,
    kickoff: `${date}T${DEFAULT_TIME}`,
    kickoffConfirmed: false,
    status: "NS",
    source: "fifa-fallback",
    updatedAt: "2026-06-14T00:00:00.000Z",
    ...options,
  };
}

function groupFixtures() {
  const fixtures: Omit<FixtureRecord, "matchNumber" | "fixtureId">[] = [];
  for (const group of Object.keys(GROUPS).sort()) {
    const teams = GROUPS[group] ?? [];
    const dates = GROUP_DATES[group];
    GROUP_MATCHUPS.forEach(([homeIndex, awayIndex, dateIndex], matchupIndex) => {
      const teamA = teams[homeIndex]?.name;
      const teamB = teams[awayIndex]?.name;
      if (!teamA || !teamB) return;
      fixtures.push({
        teamA,
        teamB,
        teamASlot: teamA,
        teamBSlot: teamB,
        teamAFlag: teams[homeIndex]?.code,
        teamBFlag: teams[awayIndex]?.code,
        teamAConfirmed: true,
        teamBConfirmed: true,
        stage: "小组赛",
        roundLabel: `${group}组 · 第${matchupIndex < 2 ? 1 : matchupIndex < 4 ? 2 : 3}轮`,
        kickoff: `${dates[dateIndex]}T${DEFAULT_TIME}`,
        kickoffConfirmed: false,
        status: "NS",
        source: "fifa-fallback",
        updatedAt: "2026-06-14T00:00:00.000Z",
      });
    });
  }

  return fixtures
    .sort((left, right) =>
      left.kickoff.localeCompare(right.kickoff) ||
      left.roundLabel.localeCompare(right.roundLabel) ||
      left.teamA.localeCompare(right.teamA),
    )
    .map((fixture, index) => ({
      ...fixture,
      matchNumber: index + 1,
      fixtureId: `fifa-${index + 1}`,
    }));
}

const ROUND_OF_32: Array<[number, string, string, string]> = [
  [73, "2026-06-28", "A组第二", "B组第二"],
  [74, "2026-06-29", "C组第一", "F组第二"],
  [75, "2026-06-29", "E组第一", "A/B/C/D/F组最佳第三"],
  [76, "2026-06-29", "F组第一", "C组第二"],
  [77, "2026-06-30", "E组第二", "I组第二"],
  [78, "2026-06-30", "I组第一", "C/D/F/G/H组最佳第三"],
  [79, "2026-06-30", "A组第一", "C/E/F/H/I组最佳第三"],
  [80, "2026-07-01", "L组第一", "E/H/I/J/K组最佳第三"],
  [81, "2026-07-01", "G组第一", "A/E/H/I/J组最佳第三"],
  [82, "2026-07-01", "D组第一", "B/E/F/I/J组最佳第三"],
  [83, "2026-07-02", "H组第一", "J组第二"],
  [84, "2026-07-02", "K组第二", "L组第二"],
  [85, "2026-07-02", "B组第一", "E/F/G/I/J组最佳第三"],
  [86, "2026-07-03", "D组第二", "G组第二"],
  [87, "2026-07-03", "J组第一", "H组第二"],
  [88, "2026-07-03", "K组第一", "D/E/I/J/L组最佳第三"],
];

const LATER_ROUNDS: Array<[number, Stage, string, string, string]> = [
  [89, "16强", "2026-07-04", "73场胜者", "75场胜者"],
  [90, "16强", "2026-07-04", "74场胜者", "77场胜者"],
  [91, "16强", "2026-07-05", "76场胜者", "78场胜者"],
  [92, "16强", "2026-07-05", "79场胜者", "80场胜者"],
  [93, "16强", "2026-07-06", "83场胜者", "84场胜者"],
  [94, "16强", "2026-07-06", "81场胜者", "82场胜者"],
  [95, "16强", "2026-07-07", "86场胜者", "88场胜者"],
  [96, "16强", "2026-07-07", "85场胜者", "87场胜者"],
  [97, "8强", "2026-07-09", "89场胜者", "90场胜者"],
  [98, "8强", "2026-07-10", "93场胜者", "94场胜者"],
  [99, "8强", "2026-07-11", "91场胜者", "92场胜者"],
  [100, "8强", "2026-07-11", "95场胜者", "96场胜者"],
  [101, "半决赛", "2026-07-14", "97场胜者", "98场胜者"],
  [102, "半决赛", "2026-07-15", "99场胜者", "100场胜者"],
  [103, "决赛", "2026-07-18", "101场负者", "102场负者"],
  [104, "决赛", "2026-07-19", "101场胜者", "102场胜者"],
];

function knockoutFixtures() {
  const roundOf32 = ROUND_OF_32.map(([matchNumber, date, teamA, teamB]) =>
    fallbackFixture(matchNumber, teamA, teamB, "32强", date, "32强", {
      teamAConfirmed: false,
      teamBConfirmed: false,
    }),
  );
  const later = LATER_ROUNDS.map(([matchNumber, stage, date, teamA, teamB]) =>
    fallbackFixture(
      matchNumber,
      teamA,
      teamB,
      stage,
      date,
      matchNumber === 103 ? "三四名决赛" : stage,
      { teamAConfirmed: false, teamBConfirmed: false },
    ),
  );
  return [...roundOf32, ...later];
}

export const FIFA_FALLBACK_FIXTURES: FixtureRecord[] = [
  ...groupFixtures(),
  ...knockoutFixtures(),
];

export const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
export const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE"]);

export function isFinishedFixture(fixture: FixtureRecord) {
  return FINISHED_STATUSES.has(fixture.status);
}

export function isLiveFixture(fixture: FixtureRecord) {
  return LIVE_STATUSES.has(fixture.status);
}

export function canPredictFixture(fixture: FixtureRecord, now = new Date()) {
  return (
    fixture.teamAConfirmed &&
    fixture.teamBConfirmed &&
    !isFinishedFixture(fixture) &&
    !isLiveFixture(fixture) &&
    new Date(fixture.kickoff).getTime() > now.getTime()
  );
}

export function beijingDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function beijingDayKeys(now = new Date(), days = 3) {
  const today = beijingDateKey(now);
  const cursor = new Date(`${today}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, index) => {
    const value = new Date(cursor);
    value.setUTCDate(value.getUTCDate() + index);
    return value.toISOString().slice(0, 10);
  });
}

export function fixturesForHome(fixtures: FixtureRecord[], now = new Date()) {
  const keys = new Set(beijingDayKeys(now, 3));
  return fixtures
    .filter((fixture) => keys.has(beijingDateKey(fixture.kickoff)))
    .filter((fixture) => !isFinishedFixture(fixture))
    .sort((left, right) => left.kickoff.localeCompare(right.kickoff));
}

export function mergeFixtures(dynamicFixtures: FixtureRecord[]) {
  const dynamicByMatch = new Map(
    dynamicFixtures.map((fixture) => [fixture.matchNumber, fixture]),
  );
  const merged = FIFA_FALLBACK_FIXTURES.map(
    (fallback) => dynamicByMatch.get(fallback.matchNumber) ?? fallback,
  );
  const knownNumbers = new Set(merged.map((fixture) => fixture.matchNumber));
  for (const fixture of dynamicFixtures) {
    if (!knownNumbers.has(fixture.matchNumber)) merged.push(fixture);
  }
  return merged.sort(
    (left, right) =>
      left.kickoff.localeCompare(right.kickoff) ||
      left.matchNumber - right.matchNumber,
  );
}
