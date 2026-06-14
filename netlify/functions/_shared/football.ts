import type { FixtureRecord, MatchResult, Stage } from "../../../shared/domain.ts";
import { teamByName } from "../../../shared/teams.ts";
import { env, requiredEnv } from "./env.ts";

interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string };
  };
  league: { round: string };
  teams: {
    home: { name: string; logo?: string };
    away: { name: string; logo?: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    fulltime: { home: number | null; away: number | null };
  };
}

const TEAM_NAMES: Record<string, string> = {
  Mexico: "墨西哥",
  "South Africa": "南非",
  "South Korea": "韩国",
  "Korea Republic": "韩国",
  Czechia: "捷克",
  "Czech Republic": "捷克",
  Canada: "加拿大",
  "Bosnia-Herzegovina": "波黑",
  "Bosnia and Herzegovina": "波黑",
  Qatar: "卡塔尔",
  Switzerland: "瑞士",
  Brazil: "巴西",
  Morocco: "摩洛哥",
  Haiti: "海地",
  Scotland: "苏格兰",
  USA: "美国",
  "United States": "美国",
  Paraguay: "巴拉圭",
  Australia: "澳大利亚",
  Turkey: "土耳其",
  Türkiye: "土耳其",
  Germany: "德国",
  Curaçao: "库拉索",
  Curacao: "库拉索",
  "Ivory Coast": "科特迪瓦",
  "Côte d'Ivoire": "科特迪瓦",
  Ecuador: "厄瓜多尔",
  Netherlands: "荷兰",
  Japan: "日本",
  Sweden: "瑞典",
  Tunisia: "突尼斯",
  Belgium: "比利时",
  Egypt: "埃及",
  Iran: "伊朗",
  "New Zealand": "新西兰",
  Spain: "西班牙",
  "Cape Verde": "佛得角",
  "Saudi Arabia": "沙特",
  Uruguay: "乌拉圭",
  France: "法国",
  Senegal: "塞内加尔",
  Iraq: "伊拉克",
  Norway: "挪威",
  Argentina: "阿根廷",
  Algeria: "阿尔及利亚",
  Austria: "奥地利",
  Jordan: "约旦",
  Portugal: "葡萄牙",
  "DR Congo": "刚果金",
  "Congo DR": "刚果金",
  Uzbekistan: "乌兹别克斯坦",
  Colombia: "哥伦比亚",
  England: "英格兰",
  Croatia: "克罗地亚",
  Ghana: "加纳",
  Panama: "巴拿马",
};

function stageFromRound(round: string): Stage {
  const value = round.toLowerCase();
  if (value.includes("final") && !value.includes("semi")) return "决赛";
  if (value.includes("semi")) return "半决赛";
  if (value.includes("quarter")) return "8强";
  if (value.includes("round of 16")) return "16强";
  if (value.includes("round of 32")) return "32强";
  return "小组赛";
}

function roundLabel(round: string, stage: Stage) {
  if (stage === "决赛" && round.toLowerCase().includes("3rd")) return "三四名决赛";
  return stage;
}

function localizedTeamName(name: string) {
  return TEAM_NAMES[name] ?? name;
}

function confirmedTeam(name: string) {
  const normalized = name.trim().toLowerCase();
  return !["", "tbd", "to be decided", "winner", "unknown"].includes(normalized);
}

function resultFromFixture(fixture: ApiFootballFixture): MatchResult | undefined {
  if (!["FT", "AET", "PEN"].includes(fixture.fixture.status.short)) return undefined;
  const home = fixture.score.fulltime.home;
  const away = fixture.score.fulltime.away;
  if (!Number.isInteger(home) || !Number.isInteger(away)) return undefined;
  return {
    home: home as number,
    away: away as number,
    source: "api-football",
    confirmedAt: new Date().toISOString(),
  };
}

export async function fetchWorldCupFixtures(): Promise<FixtureRecord[]> {
  const key = requiredEnv("API_FOOTBALL_KEY");
  const league = requiredEnv("API_FOOTBALL_LEAGUE_ID");
  const season = env("API_FOOTBALL_SEASON", "2026");
  const response = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${encodeURIComponent(league)}&season=${encodeURIComponent(season)}`,
    { headers: { "x-apisports-key": key } },
  );
  const body = (await response.json()) as {
    response?: ApiFootballFixture[];
    errors?: Record<string, string>;
  };
  if (!response.ok || !Array.isArray(body.response)) {
    throw new Error(`API-Football 同步失败：${JSON.stringify(body.errors ?? response.status)}`);
  }
  return body.response
    .sort((left, right) => left.fixture.date.localeCompare(right.fixture.date))
    .map((item, index): FixtureRecord => {
      const teamA = localizedTeamName(item.teams.home.name);
      const teamB = localizedTeamName(item.teams.away.name);
      const stage = stageFromRound(item.league.round);
      return {
        fixtureId: String(item.fixture.id),
        matchNumber: index + 1,
        teamA,
        teamB,
        teamASlot: teamA,
        teamBSlot: teamB,
        teamAFlag: teamByName(teamA)?.code,
        teamBFlag: teamByName(teamB)?.code,
        teamALogo: item.teams.home.logo,
        teamBLogo: item.teams.away.logo,
        teamAConfirmed: confirmedTeam(item.teams.home.name),
        teamBConfirmed: confirmedTeam(item.teams.away.name),
        stage,
        roundLabel: roundLabel(item.league.round, stage),
        kickoff: item.fixture.date,
        kickoffConfirmed: true,
        status: item.fixture.status.short,
        source: "api-football",
        result: resultFromFixture(item),
        updatedAt: new Date().toISOString(),
      };
    });
}

export function isOfficialPredictionWindow(kickoff: string, now = new Date()) {
  const kickoffTime = new Date(kickoff).getTime();
  const difference = kickoffTime - now.getTime();
  return difference <= 3 * 60 * 60 * 1000 && difference >= 30 * 60 * 1000;
}
