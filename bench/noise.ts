// bench/noise.ts — noise floor: config C, c=100, health + user, 5 back-to-back repeats. Run: bun bench/noise.ts
import { CONFIGS, startServer, collectEnv, cv } from "./lib";
import { cases, bombardierArgs } from "./cases";

const DUR = process.env.BENCH_QUICK ? "3s" : "30s";
const N = process.env.BENCH_QUICK ? 2 : 5;
const cfg = CONFIGS.find((c) => c.id === "C")!;
const CS = (await cases()).filter((c) => ["health", "user"].includes(c.name));

async function run(args: string[]): Promise<number> {
  const p = Bun.spawn(["bombardier", "-c", "100", "-d", DUR, "--print", "r", "--format", "json", ...args], { stdout: "pipe", stderr: "inherit" });
  const out = JSON.parse(await new Response(p.stdout).text());
  await p.exited;
  return out.result.rps.mean as number;
}

const s = await startServer(cfg);
const out: any = { env: await collectEnv(), config: cfg.id, concurrency: 100, duration: DUR, repeats: N, cases: {} };
try {
  for (const c of CS) {
    await run(bombardierArgs(c)); // warm-up, discarded
    const rps: number[] = [];
    for (let i = 0; i < N; i++) { rps.push(await run(bombardierArgs(c))); console.log(c.name, i + 1, rps[i].toFixed(0)); }
    out.cases[c.name] = { rps, cv: cv(rps), spreadPct: (100 * (Math.max(...rps) - Math.min(...rps))) / Math.min(...rps) };
  }
} finally {
  await s.stop();
}
out.floorPct = Math.max(...Object.values(out.cases).map((c: any) => c.spreadPct));
await Bun.write("results/noise.json", JSON.stringify(out, null, 2));
console.log("noise floor (max spread %):", out.floorPct.toFixed(1));
