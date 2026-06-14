import { safeEqual, sha256, sign } from "./crypto";
import { env } from "./env";

const COOKIE_NAME = "gova_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret() {
  return env("SESSION_SECRET", "local-development-secret-change-before-deploy");
}

function parseCookie(request: Request, name: string) {
  const parts = (request.headers.get("cookie") ?? "").split(";");
  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === name) return value;
  }
  return "";
}

export function verifyAdminPassword(password: string) {
  const expectedHash = env("ADMIN_PASSWORD_HASH");
  const developmentPassword = env("ADMIN_PASSWORD");
  if (expectedHash) return safeEqual(sha256(password), expectedHash.toLowerCase());
  if (developmentPassword) return safeEqual(password, developmentPassword);
  throw new Error("尚未配置管理员密码");
}

export function createAdminCookie(request: Request) {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `admin.${expires}`;
  const token = `${payload}.${sign(payload, secret())}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}${secure}`;
}

export function requireAdmin(request: Request) {
  const token = parseCookie(request, COOKIE_NAME);
  const [role, expires, signature] = token.split(".");
  const payload = `${role}.${expires}`;
  if (
    role !== "admin" ||
    !expires ||
    !signature ||
    Number(expires) < Math.floor(Date.now() / 1000) ||
    !safeEqual(signature, sign(payload, secret()))
  ) {
    throw new Error("管理员登录已失效，请重新登录");
  }
}
