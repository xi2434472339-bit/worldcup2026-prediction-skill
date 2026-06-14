import type { Config, Context } from "@netlify/functions";
import { sha256 } from "./_shared/crypto";
import { errorResponse, json, methodNotAllowed, readJson } from "./_shared/http";
import { getSession, remainingCredits } from "./_shared/session";
import { db } from "./_shared/storage";

export default async (request: Request, context: Context) => {
  if (request.method !== "POST") return methodNotAllowed();
  try {
    const { code } = await readJson<{ code: string }>(request);
    const normalized = code?.trim().toUpperCase();
    if (!normalized) return json({ error: "请输入兑换码" }, { status: 400 });
    const codeHash = sha256(normalized);
    const accessCode = await db.getCode(codeHash);
    if (!accessCode || accessCode.status !== "active") {
      return json({ error: "兑换码无效、已使用或已停用" }, { status: 400 });
    }

    const session = await getSession(request, context);
    if (session.usage.redeemedCodes.includes(codeHash)) {
      return json({ error: "当前账户已兑换过此兑换码" }, { status: 400 });
    }

    const now = new Date().toISOString();
    session.usage.paidRemaining += accessCode.credits;
    session.usage.redeemedCodes.push(codeHash);
    session.usage.updatedAt = now;
    accessCode.status = "redeemed";
    accessCode.redeemedAt = now;
    accessCode.redeemedBy = session.id;
    await db.saveUsage(session.usage);
    await db.saveCode(accessCode);

    return json(
      { remaining: remainingCredits(session.usage) },
      { headers: session.setCookie ? { "Set-Cookie": session.setCookie } : undefined },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/redeem" };
