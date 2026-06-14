import type { Config } from "@netlify/functions";
import { errorResponse, json } from "./_shared/http";
import { publicStats } from "./_shared/records";

export default async () => {
  try {
    return json(await publicStats());
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/stats" };
