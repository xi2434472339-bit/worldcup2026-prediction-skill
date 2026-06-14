import type { Config } from "@netlify/functions";
import { randomUUID } from "node:crypto";
import type { PredictionRecord, Stage } from "../../shared/domain";
import { settlePrediction, validatePrediction } from "../../shared/domain";
import { requireAdmin } from "./_shared/admin-auth";
import { randomToken, sha256 } from "./_shared/crypto";
import { errorResponse, json, methodNotAllowed, readJson } from "./_shared/http";
import { generateWithAudit } from "./_shared/prediction-service";
import { db } from "./_shared/storage";

interface AdminBody {
  action: string;
  [key: string]: unknown;
}

async function audit(action: string, details: Record<string, unknown>) {
  await db.saveAudit({
    id: randomUUID(),
    action,
    actor: "admin",
    createdAt: new Date().toISOString(),
    details,
  });
}

export default async (request: Request) => {
  if (request.method !== "POST") return methodNotAllowed();
  try {
    requireAdmin(request);
    const body = await readJson<AdminBody>(request);

    if (body.action === "snapshot") {
      const [codes, predictions, audit] = await Promise.all([
        db.listCodes(),
        db.listPredictions(),
        db.listAudit(),
      ]);
      const generationUsage = audit
        .filter((entry) => entry.action === "ai-generation")
        .reduce(
          (total, entry) => {
            const usage = (entry.details.usage ?? {}) as Record<string, unknown>;
            total.calls += 1;
            total.promptTokens += Number(usage.promptTokens) || 0;
            total.completionTokens += Number(usage.completionTokens) || 0;
            total.reasoningTokens += Number(usage.reasoningTokens) || 0;
            total.totalTokens += Number(usage.totalTokens) || 0;
            total.cost += Number(usage.cost) || 0;
            return total;
          },
          {
            calls: 0,
            promptTokens: 0,
            completionTokens: 0,
            reasoningTokens: 0,
            totalTokens: 0,
            cost: 0,
          },
        );
      return json({
        codes: codes.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        predictions: predictions
          .filter((record) => record.source !== "user")
          .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
          .slice(0, 100),
        generationUsage,
      });
    }

    if (body.action === "generate-codes") {
      const count = Math.min(50, Math.max(1, Number(body.count) || 1));
      const credits = Math.min(500, Math.max(1, Number(body.credits) || 30));
      const codes: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const raw = `GOVA-${randomToken(5).toUpperCase().replace(/[-_]/g, "X").slice(0, 4)}-${randomToken(5).toUpperCase().replace(/[-_]/g, "X").slice(0, 4)}`;
        const codeHash = sha256(raw);
        await db.saveCode({
          codeHash,
          codePreview: `${raw.slice(0, 9)}****`,
          credits,
          status: "active",
          createdAt: new Date().toISOString(),
        });
        codes.push(raw);
      }
      await audit("generate-codes", { count, credits });
      return json({ codes });
    }

    if (body.action === "disable-code") {
      const codeHash = String(body.codeHash || "");
      const code = await db.getCode(codeHash);
      if (!code) return json({ error: "兑换码不存在" }, { status: 404 });
      code.status = "disabled";
      code.disabledAt = new Date().toISOString();
      await db.saveCode(code);
      await audit("disable-code", { codeHash });
      return json({ ok: true });
    }

    if (body.action === "correct-result") {
      const recordId = String(body.recordId || "");
      const record = await db.getPrediction(recordId);
      const home = Number(body.home);
      const away = Number(body.away);
      if (!record) return json({ error: "预测记录不存在" }, { status: 404 });
      if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
        return json({ error: "实际比分无效" }, { status: 400 });
      }
      const corrected = settlePrediction(record, {
        home,
        away,
        source: "admin",
        confirmedAt: new Date().toISOString(),
      });
      await db.savePrediction(corrected);
      await audit("correct-result", { recordId, home, away });
      return json({ record: corrected });
    }

    if (body.action === "generate-backtest") {
      const teamA = String(body.teamA || "");
      const teamB = String(body.teamB || "");
      const stage = String(body.stage || "小组赛") as Stage;
      const kickoff = String(body.kickoff || "");
      const home = Number(body.home);
      const away = Number(body.away);
      if (!teamA || !teamB || teamA === teamB || !kickoff) {
        return json({ error: "请完整填写两队和比赛时间" }, { status: 400 });
      }
      if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
        return json({ error: "请填写有效的实际比分" }, { status: 400 });
      }
      const now = new Date().toISOString();
      const generated = await generateWithAudit(teamA, teamB, stage, {
        reasoningEffort: "medium",
        purpose: "backtest",
        kickoff,
      });
      const baseRecord: PredictionRecord = {
        id: randomUUID(),
        source: "backtest",
        stage,
        kickoff: new Date(kickoff).toISOString(),
        lockedAt: now,
        prediction: generated.prediction,
        generation: generated.generation,
        createdAt: now,
      };
      const record = settlePrediction(baseRecord, {
        home,
        away,
        source: "admin",
        confirmedAt: now,
      });
      await db.savePrediction(record);
      await audit("generate-backtest", { recordId: record.id, teamA, teamB });
      return json({ record });
    }

    if (body.action === "create-backtest") {
      const teamA = String(body.teamA || "");
      const teamB = String(body.teamB || "");
      const stage = String(body.stage || "小组赛") as Stage;
      const kickoff = String(body.kickoff || new Date().toISOString());
      const prediction = validatePrediction(body.prediction);
      const record: PredictionRecord = {
        id: randomUUID(),
        source: "backtest",
        stage,
        kickoff,
        lockedAt: new Date().toISOString(),
        prediction: { ...prediction, teamA: { ...prediction.teamA, name: teamA }, teamB: { ...prediction.teamB, name: teamB } },
        createdAt: new Date().toISOString(),
      };
      if (Number.isInteger(Number(body.home)) && Number.isInteger(Number(body.away))) {
        Object.assign(
          record,
          settlePrediction(record, {
            home: Number(body.home),
            away: Number(body.away),
            source: "admin",
            confirmedAt: new Date().toISOString(),
          }),
        );
      }
      await db.savePrediction(record);
      await audit("create-backtest", { recordId: record.id });
      return json({ record });
    }

    return json({ error: "未知管理操作" }, { status: 400 });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message.includes("登录");
    return errorResponse(error, unauthorized ? 401 : 500);
  }
};

export const config: Config = { path: "/api/admin" };
