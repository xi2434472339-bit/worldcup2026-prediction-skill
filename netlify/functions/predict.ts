import type { Config, Context } from "@netlify/functions";
import { randomUUID } from "node:crypto";
import { STAGES, type PredictionRecord, type Stage } from "../../shared/domain";
import { canPredictFixture } from "../../shared/fixtures";
import { TEAMS } from "../../shared/teams";
import { getFixtureById } from "./_shared/fixture-service";
import { isOfficialPredictionWindow } from "./_shared/football";
import { errorResponse, json, methodNotAllowed, readJson } from "./_shared/http";
import { queueOfficialPrediction } from "./_shared/official-jobs";
import {
  fixturePrediction,
  generateWithAudit,
} from "./_shared/prediction-service";
import { findOfficialPrediction } from "./_shared/records";
import { consumeCredit, getSession } from "./_shared/session";

interface FixturePredictBody {
  mode: "fixture";
  fixtureId: string;
}

interface CustomPredictBody {
  mode: "custom";
  teamA: string;
  teamB: string;
  stage: Stage;
}

export default async (request: Request, context: Context) => {
  if (request.method !== "POST") return methodNotAllowed();
  try {
    const body = await readJson<FixturePredictBody | CustomPredictBody>(request);
    const session = await getSession(request, context);
    if (session.usage.freeRemaining + session.usage.paidRemaining <= 0) {
      return json(
        { error: "预测次数已用完，请兑换套餐后继续" },
        { status: 402, headers: session.setCookie ? { "Set-Cookie": session.setCookie } : undefined },
      );
    }

    let teamA: string;
    let teamB: string;
    let stage: Stage;
    let officialRecord: PredictionRecord | undefined;
    let generated:
      | Awaited<ReturnType<typeof fixturePrediction>>
      | Awaited<ReturnType<typeof generateWithAudit>>
      | undefined;

    if (body.mode === "fixture") {
      const fixture = await getFixtureById(body.fixtureId);
      if (!fixture) return json({ error: "比赛不存在或赛程已更新" }, { status: 404 });
      if (!fixture.teamAConfirmed || !fixture.teamBConfirmed) {
        return json({ error: "本场对阵尚未确定，球队产生后即可预测" }, { status: 409 });
      }
      if (!canPredictFixture(fixture)) {
        return json({ error: "比赛已经开始或结束，不能再生成赛前预测" }, { status: 409 });
      }
      teamA = fixture.teamA;
      teamB = fixture.teamB;
      stage = fixture.stage;
      officialRecord = await findOfficialPrediction(
        fixture.teamA,
        fixture.teamB,
        fixture.fixtureId,
        fixture.stage,
        fixture.matchNumber,
      );

      if (!officialRecord && isOfficialPredictionWindow(fixture.kickoff)) {
        await queueOfficialPrediction(fixture, new URL(request.url).origin);
        return json(
          {
            status: "generating",
            fixtureId: fixture.fixtureId,
            retryAfterMs: 3000,
            remaining:
              session.usage.freeRemaining + session.usage.paidRemaining,
          },
          {
            status: 202,
            headers: session.setCookie
              ? { "Set-Cookie": session.setCookie }
              : undefined,
          },
        );
      }
      if (!officialRecord) generated = await fixturePrediction(fixture);
    } else if (body.mode === "custom") {
      const validTeams = new Set(TEAMS.map((team) => team.name));
      if (!validTeams.has(body.teamA) || !validTeams.has(body.teamB) || body.teamA === body.teamB) {
        return json({ error: "请选择两支有效且不同的球队" }, { status: 400 });
      }
      if (!STAGES.includes(body.stage)) {
        return json({ error: "比赛阶段无效" }, { status: 400 });
      }
      teamA = body.teamA;
      teamB = body.teamB;
      stage = body.stage;
      generated = await generateWithAudit(teamA, teamB, stage, {
        reasoningEffort: "medium",
        purpose: "custom",
      });
    } else {
      return json({ error: "预测模式无效" }, { status: 400 });
    }

    const prediction =
      officialRecord?.prediction ?? generated!.prediction;
    const cached = generated && "cached" in generated ? generated.cached : false;
    const remaining = await consumeCredit(session.usage);

    return json(
      {
        status: "ready",
        prediction,
        official: Boolean(officialRecord),
        cached,
        generation: officialRecord?.generation ?? generated?.generation,
        remaining,
        record: officialRecord,
        requestId: randomUUID(),
      },
      { headers: session.setCookie ? { "Set-Cookie": session.setCookie } : undefined },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/predict" };
