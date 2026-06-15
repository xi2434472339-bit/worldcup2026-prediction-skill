import type { FixtureRecord, MatchResult, Stage } from "../../../shared/domain.ts";
import { FIFA_FALLBACK_FIXTURES } from "../../../shared/fixtures.ts";
import { teamByName } from "../../../shared/teams.ts";

export interface FifaCalendarMatch {
  IdMatch: string;
  MatchNumber: number;
  Date: string;
  MatchStatus: number;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
  Home?: {
    Abbreviation?: string;
    PictureUrl?: string;
  } | null;
  Away?: {
    Abbreviation?: string;
    PictureUrl?: string;
  } | null;
  Stadium?: {
    Name?: Array<{ Description?: string }>;
    CityName?: Array<{ Description?: string }>;
  } | null;
}

const FIFA_TEAM_NAMES: Record<string, string> = {
  MEX: "墨西哥",
  RSA: "南非",
  KOR: "韩国",
  CZE: "捷克",
  CAN: "加拿大",
  BIH: "波黑",
  QAT: "卡塔尔",
  SUI: "瑞士",
  BRA: "巴西",
  MAR: "摩洛哥",
  HAI: "海地",
  SCO: "苏格兰",
  USA: "美国",
  PAR: "巴拉圭",
  AUS: "澳大利亚",
  TUR: "土耳其",
  GER: "德国",
  CUW: "库拉索",
  CIV: "科特迪瓦",
  ECU: "厄瓜多尔",
  NED: "荷兰",
  JPN: "日本",
  SWE: "瑞典",
  TUN: "突尼斯",
  BEL: "比利时",
  EGY: "埃及",
  IRN: "伊朗",
  NZL: "新西兰",
  ESP: "西班牙",
  CPV: "佛得角",
  KSA: "沙特",
  URU: "乌拉圭",
  FRA: "法国",
  SEN: "塞内加尔",
  IRQ: "伊拉克",
  NOR: "挪威",
  ARG: "阿根廷",
  ALG: "阿尔及利亚",
  AUT: "奥地利",
  JOR: "约旦",
  POR: "葡萄牙",
  COD: "刚果金",
  UZB: "乌兹别克斯坦",
  COL: "哥伦比亚",
  ENG: "英格兰",
  CRO: "克罗地亚",
  GHA: "加纳",
  PAN: "巴拿马",
};

const FIFA_CALENDAR_URL =
  "https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&language=en&count=500";

function teamName(abbreviation: string | undefined, fallback: string) {
  return (abbreviation && FIFA_TEAM_NAMES[abbreviation]) || fallback;
}

function fixtureStatus(match: FifaCalendarMatch) {
  if (match.MatchStatus === 0) return "FT";
  if (match.MatchStatus === 1) return "NS";
  return "LIVE";
}

function fixtureScore(match: FifaCalendarMatch) {
  if (
    !Number.isInteger(match.HomeTeamScore) ||
    !Number.isInteger(match.AwayTeamScore)
  ) {
    return undefined;
  }
  return {
    home: match.HomeTeamScore as number,
    away: match.AwayTeamScore as number,
  };
}

function resultFromFixture(
  fixture: FifaCalendarMatch,
  updatedAt: string,
): MatchResult | undefined {
  const score = fixtureScore(fixture);
  if (fixture.MatchStatus !== 0 || !score) return undefined;
  return {
    ...score,
    source: "fifa-api",
    confirmedAt: updatedAt,
  };
}

function venueName(match: FifaCalendarMatch) {
  const stadium = match.Stadium?.Name?.[0]?.Description;
  const city = match.Stadium?.CityName?.[0]?.Description;
  return [stadium, city].filter(Boolean).join(" · ") || undefined;
}

export function fifaMatchToFixture(
  item: FifaCalendarMatch,
  updatedAt = new Date().toISOString(),
): FixtureRecord {
  const fallback = FIFA_FALLBACK_FIXTURES.find(
    (fixture) => fixture.matchNumber === item.MatchNumber,
  );
  if (!fallback) {
    throw new Error(`FIFA 返回未知比赛编号 ${item.MatchNumber}`);
  }
  const teamA = teamName(item.Home?.Abbreviation, fallback.teamA);
  const teamB = teamName(item.Away?.Abbreviation, fallback.teamB);
  const score = fixtureScore(item);
  return {
    ...fallback,
    fixtureId: item.IdMatch || fallback.fixtureId,
    teamA,
    teamB,
    teamAConfirmed: Boolean(item.Home?.Abbreviation),
    teamBConfirmed: Boolean(item.Away?.Abbreviation),
    teamAFlag: teamByName(teamA)?.code,
    teamBFlag: teamByName(teamB)?.code,
    teamALogo: item.Home?.PictureUrl,
    teamBLogo: item.Away?.PictureUrl,
    kickoff: item.Date,
    kickoffConfirmed: true,
    status: fixtureStatus(item),
    score,
    venue: venueName(item),
    source: "fifa-api",
    result: resultFromFixture(item, updatedAt),
    updatedAt,
  };
}

export async function fetchWorldCupFixtures(
  fetcher: typeof fetch = fetch,
): Promise<FixtureRecord[]> {
  const response = await fetcher(FIFA_CALENDAR_URL, {
    headers: { Accept: "application/json" },
  });
  const body = (await response.json()) as {
    Results?: FifaCalendarMatch[];
  };
  if (!response.ok || !Array.isArray(body.Results)) {
    throw new Error(`FIFA 赛程同步失败：HTTP ${response.status}`);
  }
  const updatedAt = new Date().toISOString();
  return body.Results
    .sort((left, right) => left.MatchNumber - right.MatchNumber)
    .map((item) => fifaMatchToFixture(item, updatedAt));
}

export function isOfficialPredictionWindow(kickoff: string, now = new Date()) {
  const kickoffTime = new Date(kickoff).getTime();
  const difference = kickoffTime - now.getTime();
  return difference <= 3 * 60 * 60 * 1000 && difference >= 30 * 60 * 1000;
}
