// bench/lib.ts — configs, server lifecycle, stats. Run everything from repo root.
import { SignJWT } from "jose";

export interface ConfigSpec {
  id: "A" | "B" | "C" | "D" | "B-pgjs" | "A-typebox";
  label: string;
  cmd: string[];
  env: Record<string, string>;
  sensitivity?: boolean;
}

const BASE_ENV = { NODE_ENV: "production", PORT: "3000", DATABASE_URL: "postgres://postgres@localhost:5432/bench_saas" };

export const CONFIGS: ConfigSpec[] = [
  { id: "A", label: "Nest 12 + Fastify / Node 26", cmd: ["node", "apps/nest-api/dist/main.js"], env: { ...BASE_ENV, DB_DRIVER: "postgresjs" } },
  { id: "B", label: "Nest 12 + Fastify / Bun 1.4", cmd: ["bun", "apps/nest-api/dist/main.js"], env: { ...BASE_ENV, DB_DRIVER: "bunsql" } },
  { id: "C", label: "Elysia 2 / Bun 1.4", cmd: ["bun", "apps/elysia-api/dist/index.js"], env: { ...BASE_ENV, DB_DRIVER: "bunsql" } },
  { id: "D", label: "Elysia 2 + AOT / Bun 1.4", cmd: ["bun", "apps/elysia-api/dist-aot/index.js"], env: { ...BASE_ENV, DB_DRIVER: "bunsql" } },
  { id: "B-pgjs", label: "Nest 12 + Fastify / Bun 1.4, postgres.js", cmd: ["bun", "apps/nest-api/dist/main.js"], env: { ...BASE_ENV, DB_DRIVER: "postgresjs" }, sensitivity: true },
  { id: "A-typebox", label: "Nest 12 + Fastify / Node 26, TypeBox validator", cmd: ["node", "apps/nest-api/dist/main.js"], env: { ...BASE_ENV, DB_DRIVER: "postgresjs", VALIDATOR: "typebox" }, sensitivity: true },
];

export function selectConfigs(): ConfigSpec[] {
  const only = process.env.CONFIGS?.split(",").map((s) => s.trim());
  return CONFIGS.filter((c) => (only ? only.includes(c.id) : !c.sensitivity));
}

export const BASE_URL = "http://127.0.0.1:3000";
export const SECRET = "bench-secret-do-not-use-in-prod";
export const TOKEN: Promise<string> = new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("4242")
  .setIssuedAt(0)
  .sign(new TextEncoder().encode(SECRET));

export async function sh(cmd: string[], cwd?: string): Promise<string> {
  const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "ignore", cwd });
  const out = await new Response(p.stdout).text();
  await p.exited;
  return out.trim();
}

export async function startServer(cfg: ConfigSpec): Promise<{ pid: number; stop: () => Promise<void>; readyMs: number }> {
  const t0 = performance.now();
  const proc = Bun.spawn(cfg.cmd, { env: { ...process.env, ...cfg.env }, stdout: "ignore", stderr: "inherit" });
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) break;
    } catch {}
    if (Date.now() > deadline) { proc.kill(); throw new Error(`${cfg.id}: server not ready within 15s`); }
    await Bun.sleep(20);
  }
  const readyMs = performance.now() - t0;
  return {
    pid: proc.pid,
    readyMs,
    stop: async () => { proc.kill("SIGTERM"); await proc.exited; await Bun.sleep(500); },
  };
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
}
export function cv(xs: number[]): number {
  const m = mean(xs); if (!m) return 0;
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m;
}

export async function sampleProc(pid: number): Promise<{ rss: number; cpu: number } | null> {
  const out = await sh(["ps", "-o", "rss=,%cpu=", "-p", String(pid)]);
  const [rss, cpu] = out.split(/\s+/).map(Number);
  if (!Number.isFinite(rss) || !Number.isFinite(cpu)) return null;
  return { rss: rss / 1024, cpu };
}

export function startSampler(pid: number) {
  const samples: { rss: number; cpu: number }[] = [];
  let active = true;
  (async () => { while (active) { const s = await sampleProc(pid); if (s) samples.push(s); await Bun.sleep(500); } })();
  return { stop: () => { active = false; return samples; } };
}

export async function collectEnv() {
  const pkg = async (p: string) => { try { return JSON.parse(await Bun.file(p).text()).version as string; } catch { return "?"; } };
  return {
    date: new Date().toISOString(),
    cpu: await sh(["sysctl", "-n", "machdep.cpu.brand_string"]),
    cores: Number(await sh(["sysctl", "-n", "hw.ncpu"])),
    ramGB: Number(await sh(["sysctl", "-n", "hw.memsize"])) / 2 ** 30,
    macos: await sh(["sw_vers", "-productVersion"]),
    bun: await sh(["bun", "--revision"]),
    node: await sh(["node", "--version"]),
    postgres: await sh(["psql", "--version"]),
    bombardier: await sh(["bombardier", "--version"]),
    elysia: await pkg("apps/elysia-api/node_modules/elysia/package.json"),
    nestCore: await pkg("apps/nest-api/node_modules/@nestjs/core/package.json"),
    fastify: await pkg("apps/nest-api/node_modules/fastify/package.json"),
    drizzle: await pkg("apps/elysia-api/node_modules/drizzle-orm/package.json"),
  };
}

// System-wide CPU used by processes other than the server and bombardier (sum of %CPU, 100 = one core).
export async function otherCpu(serverPid: number): Promise<number> {
  const out = await sh(["ps", "-Ao", "pid=,pcpu=,comm="]);
  let sum = 0;
  for (const line of out.split("\n")) {
    const m = line.trim().match(/^(\d+)\s+([\d.]+)\s+(.*)$/); if (!m) continue;
    const pid = Number(m[1]), cpu = Number(m[2]), comm = m[3];
    if (pid === serverPid || pid === process.pid || /bombardier$/.test(comm) || /\/ps$/.test(comm)) continue;
    sum += cpu;
  }
  return sum;
}
export function startSysSampler(serverPid: number) {
  const samples: number[] = []; let active = true;
  (async () => { while (active) { samples.push(await otherCpu(serverPid)); await Bun.sleep(1000); } })();
  return { stop: () => { active = false; return samples; } };
}
