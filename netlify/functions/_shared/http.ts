export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "服务器暂时不可用";
  console.error(error);
  return json({ error: message }, { status });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("请求内容不是有效 JSON");
  }
}

export function methodNotAllowed() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
