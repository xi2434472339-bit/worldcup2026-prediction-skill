import type { Config } from "@netlify/functions";
import { createAdminCookie, verifyAdminPassword } from "./_shared/admin-auth";
import { errorResponse, json, methodNotAllowed, readJson } from "./_shared/http";

export default async (request: Request) => {
  if (request.method !== "POST") return methodNotAllowed();
  try {
    const { password } = await readJson<{ password: string }>(request);
    if (!password || !verifyAdminPassword(password)) {
      return json({ error: "管理员密码错误" }, { status: 401 });
    }
    return json({ ok: true }, { headers: { "Set-Cookie": createAdminCookie(request) } });
  } catch (error) {
    return errorResponse(error, error instanceof Error && error.message.includes("密码") ? 401 : 500);
  }
};

export const config: Config = { path: "/api/admin/login" };
