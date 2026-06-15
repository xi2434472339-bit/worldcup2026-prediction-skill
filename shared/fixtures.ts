import type { FixtureRecord, Stage } from "./domain.ts";
import { TEAMS, teamByName } from "./teams.ts";

type GroupScheduleEntry = readonly [
  matchNumber: number,
  homeCode: string,
  awayCode: string,
  kickoff: string,
];

// FIFA calendar API, season 285023. Kickoff values are canonical UTC times.
const GROUP_SCHEDULE: GroupScheduleEntry[] = [
  [1, "MX", "ZA", "2026-06-11T19:00:00.000Z"],
  [2, "KR", "CZ", "2026-06-12T02:00:00.000Z"],
  [3, "CA", "BA", "2026-06-12T19:00:00.000Z"],
  [4, "US", "PY", "2026-06-13T01:00:00.000Z"],
  [5, "HT", "GB-SCT", "2026-06-14T01:00:00.000Z"],
  [6, "AU", "TR", "2026-06-14T04:00:00.000Z"],
  [7, "BR", "MA", "2026-06-13T22:00:00.000Z"],
  [8, "QA", "CH", "2026-06-13T19:00:00.000Z"],
  [9, "CI", "EC", "2026-06-14T23:00:00.000Z"],
  [10, "DE", "CW", "2026-06-14T17:00:00.000Z"],
  [11, "NL", "JP", "2026-06-14T20:00:00.000Z"],
  [12, "SE", "TN", "2026-06-15T02:00:00.000Z"],
  [13, "SA", "UY", "2026-06-15T22:00:00.000Z"],
  [14, "ES", "CV", "2026-06-15T16:00:00.000Z"],
  [15, "IR", "NZ", "2026-06-16T01:00:00.000Z"],
  [16, "BE", "EG", "2026-06-15T19:00:00.000Z"],
  [17, "FR", "SN", "2026-06-16T19:00:00.000Z"],
  [18, "IQ", "NO", "2026-06-16T22:00:00.000Z"],
  [19, "AR", "DZ", "2026-06-17T01:00:00.000Z"],
  [20, "AT", "JO", "2026-06-17T04:00:00.000Z"],
  [21, "GH", "PA", "2026-06-17T23:00:00.000Z"],
  [22, "GB-ENG", "HR", "2026-06-17T20:00:00.000Z"],
  [23, "PT", "CD", "2026-06-17T17:00:00.000Z"],
  [24, "UZ", "CO", "2026-06-18T02:00:00.000Z"],
  [25, "CZ", "ZA", "2026-06-18T16:00:00.000Z"],
  [26, "CH", "BA", "2026-06-18T19:00:00.000Z"],
  [27, "CA", "QA", "2026-06-18T22:00:00.000Z"],
  [28, "MX", "KR", "2026-06-19T01:00:00.000Z"],
  [29, "BR", "HT", "2026-06-20T00:30:00.000Z"],
  [30, "GB-SCT", "MA", "2026-06-19T22:00:00.000Z"],
  [31, "TR", "PY", "2026-06-20T03:00:00.000Z"],
  [32, "US", "AU", "2026-06-19T19:00:00.000Z"],
  [33, "DE", "CI", "2026-06-20T20:00:00.000Z"],
  [34, "EC", "CW", "2026-06-21T00:00:00.000Z"],
  [35, "NL", "SE", "2026-06-20T17:00:00.000Z"],
  [36, "TN", "JP", "2026-06-21T04:00:00.000Z"],
  [37, "UY", "CV", "2026-06-21T22:00:00.000Z"],
  [38, "ES", "SA", "2026-06-21T16:00:00.000Z"],
  [39, "BE", "IR", "2026-06-21T19:00:00.000Z"],
  [40, "NZ", "EG", "2026-06-22T01:00:00.000Z"],
  [41, "NO", "SN", "2026-06-23T00:00:00.000Z"],
  [42, "FR", "IQ", "2026-06-22T21:00:00.000Z"],
  [43, "AR", "AT", "2026-06-22T17:00:00.000Z"],
  [44, "JO", "DZ", "2026-06-23T03:00:00.000Z"],
  [45, "GB-ENG", "GH", "2026-06-23T20:00:00.000Z"],
  [46, "PA", "HR", "2026-06-23T23:00:00.000Z"],
  [47, "PT", "UZ", "2026-06-23T17:00:00.000Z"],
  [48, "CO", "CD", "2026-06-24T02:00:00.000Z"],
  [49, "GB-SCT", "BR", "2026-06-24T22:00:00.000Z"],
  [50, "MA", "HT", "2026-06-24T22:00:00.000Z"],
  [51, "CH", "CA", "2026-06-24T19:00:00.000Z"],
  [52, "BA", "QA", "2026-06-24T19:00:00.000Z"],
  [53, "CZ", "MX", "2026-06-25T01:00:00.000Z"],
  [54, "ZA", "KR", "2026-06-25T01:00:00.000Z"],
  [55, "CW", "CI", "2026-06-25T20:00:00.000Z"],
  [56, "EC", "DE", "2026-06-25T20:00:00.000Z"],
  [57, "JP", "SE", "2026-06-25T23:00:00.000Z"],
  [58, "TN", "NL", "2026-06-25T23:00:00.000Z"],
  [59, "TR", "US", "2026-06-26T02:00:00.000Z"],
  [60, "PY", "AU", "2026-06-26T02:00:00.000Z"],
  [61, "NO", "FR", "2026-06-26T19:00:00.000Z"],
  [62, "SN", "IQ", "2026-06-26T19:00:00.000Z"],
  [63, "EG", "IR", "2026-06-27T03:00:00.000Z"],
  [64, "NZ", "BE", "2026-06-27T03:00:00.000Z"],
  [65, "CV", "SA", "2026-06-27T00:00:00.000Z"],
  [66, "UY", "ES", "2026-06-27T00:00:00.000Z"],
  [67, "PA", "GB-ENG", "2026-06-27T21:00:00.000Z"],
  [68, "HR", "GH", "2026-06-27T21:00:00.000Z"],
  [69, "DZ", "AT", "2026-06-28T02:00:00.000Z"],
  [70, "JO", "AR", "2026-06-28T02:00:00.000Z"],
  [71, "CO", "PT", "2026-06-27T23:30:00.000Z"],
  [72, "CD", "UZ", "2026-06-27T23:30:00.000Z"],
];

function fallbackFixture(
  matchNumber: number,
  teamA: string,
  teamB: string,
  stage: Stage,
  kickoff: string,
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
    kickoff,
    kickoffConfirmed: true,
    status: "NS",
    source: "fifa-fallback",
    updatedAt: "2026-06-15T10:00:00.000Z",
    ...options,
  };
}

function groupFixtures() {
  const matchesPerGroup = new Map<string, number>();
  return GROUP_SCHEDULE.map(([matchNumber, homeCode, awayCode, kickoff]) => {
    const teamA = TEAMS.find((team) => team.code === homeCode);
    const teamB = TEAMS.find((team) => team.code === awayCode);
    if (!teamA || !teamB || teamA.group !== teamB.group) {
      throw new Error(`Invalid FIFA group fixture ${matchNumber}`);
    }
    const groupMatchIndex = matchesPerGroup.get(teamA.group) ?? 0;
    matchesPerGroup.set(teamA.group, groupMatchIndex + 1);
    return fallbackFixture(
      matchNumber,
      teamA.name,
      teamB.name,
      "小组赛",
      kickoff,
      `${teamA.group}组 · 第${Math.floor(groupMatchIndex / 2) + 1}轮`,
      {
        teamAFlag: teamA.code,
        teamBFlag: teamB.code,
        teamAConfirmed: true,
        teamBConfirmed: true,
      },
    );
  });
}

const ROUND_OF_32: Array<[number, string, string, string]> = [
  [73, "2026-06-28T19:00:00.000Z", "A组第二", "B组第二"],
  [74, "2026-06-29T20:30:00.000Z", "E组第一", "A/B/C/D/F组最佳第三"],
  [75, "2026-06-30T01:00:00.000Z", "F组第一", "C组第二"],
  [76, "2026-06-29T17:00:00.000Z", "C组第一", "F组第二"],
  [77, "2026-06-30T21:00:00.000Z", "I组第一", "C/D/F/G/H组最佳第三"],
  [78, "2026-06-30T17:00:00.000Z", "E组第二", "I组第二"],
  [79, "2026-07-01T01:00:00.000Z", "A组第一", "C/E/F/H/I组最佳第三"],
  [80, "2026-07-01T16:00:00.000Z", "L组第一", "E/H/I/J/K组最佳第三"],
  [81, "2026-07-02T00:00:00.000Z", "D组第一", "B/E/F/I/J组最佳第三"],
  [82, "2026-07-01T20:00:00.000Z", "G组第一", "A/E/H/I/J组最佳第三"],
  [83, "2026-07-02T23:00:00.000Z", "K组第二", "L组第二"],
  [84, "2026-07-02T19:00:00.000Z", "H组第一", "J组第二"],
  [85, "2026-07-03T03:00:00.000Z", "B组第一", "E/F/G/I/J组最佳第三"],
  [86, "2026-07-03T22:00:00.000Z", "J组第一", "H组第二"],
  [87, "2026-07-04T01:30:00.000Z", "K组第一", "D/E/I/J/L组最佳第三"],
  [88, "2026-07-03T18:00:00.000Z", "D组第二", "G组第二"],
];

const LATER_ROUNDS: Array<[number, Stage, string, string, string]> = [
  [89, "16强", "2026-07-04T21:00:00.000Z", "74场胜者", "77场胜者"],
  [90, "16强", "2026-07-04T17:00:00.000Z", "73场胜者", "75场胜者"],
  [91, "16强", "2026-07-05T20:00:00.000Z", "76场胜者", "78场胜者"],
  [92, "16强", "2026-07-06T00:00:00.000Z", "79场胜者", "80场胜者"],
  [93, "16强", "2026-07-06T19:00:00.000Z", "83场胜者", "84场胜者"],
  [94, "16强", "2026-07-07T00:00:00.000Z", "81场胜者", "82场胜者"],
  [95, "16强", "2026-07-07T16:00:00.000Z", "86场胜者", "88场胜者"],
  [96, "16强", "2026-07-07T20:00:00.000Z", "85场胜者", "87场胜者"],
  [97, "8强", "2026-07-09T20:00:00.000Z", "89场胜者", "90场胜者"],
  [98, "8强", "2026-07-10T19:00:00.000Z", "93场胜者", "94场胜者"],
  [99, "8强", "2026-07-11T21:00:00.000Z", "91场胜者", "92场胜者"],
  [100, "8强", "2026-07-12T01:00:00.000Z", "95场胜者", "96场胜者"],
  [101, "半决赛", "2026-07-14T19:00:00.000Z", "97场胜者", "98场胜者"],
  [102, "半决赛", "2026-07-15T19:00:00.000Z", "99场胜者", "100场胜者"],
  [103, "决赛", "2026-07-18T21:00:00.000Z", "101场负者", "102场负者"],
  [104, "决赛", "2026-07-19T19:00:00.000Z", "101场胜者", "102场胜者"],
];

function knockoutFixtures() {
  const roundOf32 = ROUND_OF_32.map(([matchNumber, kickoff, teamA, teamB]) =>
    fallbackFixture(matchNumber, teamA, teamB, "32强", kickoff, "32强", {
      teamAConfirmed: false,
      teamBConfirmed: false,
    }),
  );
  const later = LATER_ROUNDS.map(([matchNumber, stage, kickoff, teamA, teamB]) =>
    fallbackFixture(
      matchNumber,
      teamA,
      teamB,
      stage,
      kickoff,
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
