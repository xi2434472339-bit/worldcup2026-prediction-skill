import type { Config, Context } from "@netlify/functions";
import { env } from "./_shared/env";
import { errorResponse, json } from "./_shared/http";
import { publicStats, recentPredictions } from "./_shared/records";
import { getSession, remainingCredits } from "./_shared/session";

export default async (request: Request, context: Context) => {
  try {
    const session = await getSession(request, context);
    const headers = session.setCookie ? { "Set-Cookie": session.setCookie } : undefined;
    return json(
      {
        stats: await publicStats(),
        recent: await recentPredictions(),
        remaining: remainingCredits(session.usage),
        contactWechat: env("CONTACT_WECHAT"),
        paymentQrUrl: env("PAYMENT_QR_URL"),
      },
      { headers },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/bootstrap" };
