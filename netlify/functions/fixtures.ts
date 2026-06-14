import type { Config } from "@netlify/functions";
import { errorResponse, json } from "./_shared/http";
import { queryFixtures } from "./_shared/fixture-service";

export default async (request: Request) => {
  try {
    const url = new URL(request.url);
    return json(
      await queryFixtures({
        from: url.searchParams.get("from") || undefined,
        to: url.searchParams.get("to") || undefined,
        stage: url.searchParams.get("stage") || undefined,
        status: url.searchParams.get("status") || undefined,
        home: url.searchParams.get("window") === "home",
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/fixtures" };
