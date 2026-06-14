export function env(name: string, fallback = "") {
  const runtime = (globalThis as typeof globalThis & {
    Netlify?: { env: { get: (key: string) => string | undefined } };
  }).Netlify;
  return runtime?.env.get(name) || process.env[name] || fallback;
}

export function requiredEnv(name: string) {
  const value = env(name);
  if (!value) throw new Error(`服务端缺少环境变量 ${name}`);
  return value;
}
