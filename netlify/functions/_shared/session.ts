import type { Context } from "@netlify/functions";
import type { UsageState } from "../../../shared/domain";
import { randomToken, safeEqual, sha256, sign } from "./crypto";
import { env } from "./env";
import { db } from "./storage";

const COOKIE_NAME = "gova_session";

function parseCookies(request: Request) {
  return Object.fromEntries(
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value),
  );
}

function secret() {
  return env("SESSION_SECRET", "local-development-secret-change-before-deploy");
}

function encodeSession(id: string) {
  return `${id}.${sign(id, secret())}`;
}

function decodeSession(value?: string) {
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!id || !signature || !safeEqual(signature, sign(id, secret()))) return null;
  return id;
}

function cookieHeader(request: Request, id: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeSession(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`;
}

export interface SessionContext {
  id: string;
  usage: UsageState;
  setCookie?: string;
}

export async function getSession(
  request: Request,
  context?: Pick<Context, "ip">,
): Promise<SessionContext> {
  const cookies = parseCookies(request);
  let id = decodeSession(cookies[COOKIE_NAME]);
  let setCookie: string | undefined;

  if (!id) {
    const fingerprint = [
      context?.ip ?? "local",
      request.headers.get("user-agent") ?? "unknown",
      secret(),
    ].join(":");
    id = sha256(fingerprint).slice(0, 40) || randomToken();
    setCookie = cookieHeader(request, id);
  }

  const now = new Date().toISOString();
  const storedUsage = await db.getUsage(id);
  const usage = storedUsage ?? {
    id,
    freeRemaining: 3,
    paidRemaining: 0,
    redeemedCodes: [],
    createdAt: now,
    updatedAt: now,
  };
  if (!storedUsage) await db.saveUsage(usage);

  return { id, usage, setCookie };
}

export function remainingCredits(usage: UsageState) {
  return usage.freeRemaining + usage.paidRemaining;
}

export async function consumeCredit(usage: UsageState) {
  if (usage.freeRemaining > 0) usage.freeRemaining -= 1;
  else if (usage.paidRemaining > 0) usage.paidRemaining -= 1;
  else throw new Error("预测次数已用完，请兑换套餐后继续");
  usage.updatedAt = new Date().toISOString();
  await db.saveUsage(usage);
  return remainingCredits(usage);
}
