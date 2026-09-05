// bench/bench.ts — full run: bun bench/bench.ts (~2.5 h). Plumbing: BENCH_QUICK=1 bun bench/bench.ts
// Sensitivity: CONFIGS=B-pgjs,A-typebox CASES=me,user,list,order,echo CONC=100 bun bench/bench.ts
import { selectConfigs, startServer, startSampler, sampleProc, collectEnv, median, mean } from "./lib";
import { cases, bombardierArgs } from "./cases";
import { resetOrders } from "./db-reset";
import { mkdirSync } from "node:fs";

const QUICK = !!process.env.BENCH_QUICK;
const WARMUP = QUICK ? "1s" : "5s";
const DURATION = QUICK ? "3s" : "30s";
const REPEATS = QUICK ? 1 : 3;
const CONCURRENCIES = process.env.CONC ? process.env.CONC.split(",").map(Number) : QUICK ? [10] : [10, 100, 500];
const CONFIGS = selectConfigs();
const CASES = (await cases()).filter((c) => !process.env.CASES || process.env.CASES.split(",").includes(c.name));
const OUT = process.env.CONFIGS ? "results/sensitivity.json" : "results/results.json";

async function bombardier(args: string[], conc: number, dur: string) {
  const p = Bun.spawn(["bombardier", "-c", String(conc), "-d", dur, "-l", "--print", "r", "--format", "json", ...args], { stdout: "pipe", stderr: "inherit" });
  const out = await new Response(p.stdout).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`bombardier exit ${p.exitCode}`);
  const r = JSON.parse(out).result;
  const ms = (x: number) => x / 1000;
  return {
    rps: r.rps.mean as number,
    latMs: { mean: ms(r.latency.mean), p50: ms(r.latency.percentiles["50"]), p90: ms(r.latency.percentiles["90"]), p95: ms(r.latency.percentiles["95"]), p99: ms(r.latency.percentiles["99"]), max: ms(r.latency.max) },
    req2xx: r.req2xx as number,
    non2xx: (r.req1xx + r.req3xx + r.req4xx + r.req5xx + r.others) as number,
  };
}

mkdirSync("results", { recursive: true });
const results = {
  env: await collectEnv(),
  methodology: { warmup: WARMUP, duration: DURATION, repeats: REPEATS, concurrencies: CONCURRENCIES, order: CONFIGS.map((c) => c.id), cases: CASES.map((c) => c.name), loadGenerator: "bombardier, same machine" },
  idleRss: {} as Record<string, number>,
  bootMs: {} as Record<string, number>,
  runs: [] as any[],
};
const total = CONFIGS.length * CASES.length * CONCURRENCIES.length;
let n = 0;

for (const cfg of CONFIGS) {
  console.log(`\n=== ${cfg.id} ${cfg.label} ===`);
  await resetOrders();
  const srv = await startServer(cfg);
  results.bootMs[cfg.id] = srv.readyMs;
  try {
    await Bun.sleep(1500);
    results.idleRss[cfg.id] = (await sampleProc(srv.pid))?.rss ?? 0;
    console.log(`boot ${srv.readyMs.toFixed(0)} ms, idle RSS ${results.idleRss[cfg.id].toFixed(1)} MB`);
    for (const c of CASES) {
      for (const conc of CONCURRENCIES) {
        n++;
        console.log(`[${n}/${total}] ${cfg.id}/${c.name}/c=${conc}`);
        try {
          await bombardier(bombardierArgs(c), conc, WARMUP);
          const reps: any[] = [];
          for (let i = 0; i < REPEATS; i++) {
            const sampler = startSampler(srv.pid);
            const r = await bombardier(bombardierArgs(c), conc, DURATION);
            const samples = sampler.stop();
            const rss = samples.map((s) => s.rss), cpu = samples.map((s) => s.cpu);
            reps.push({ ...r, rss: { mean: mean(rss), peak: Math.max(0, ...rss) }, cpu: { mean: mean(cpu), peak: Math.max(0, ...cpu) } });
            console.log(`  run ${i + 1}: ${r.rps.toFixed(0)} rps, p99 ${r.latMs.p99.toFixed(2)} ms, rss ${mean(rss).toFixed(0)} MB, cpu ${mean(cpu).toFixed(0)}%${r.non2xx ? `  [!] non-2xx ${r.non2xx}` : ""}`);
          }
          const m = (f: (r: any) => number) => median(reps.map(f));
          const med = { rps: m((r) => r.rps), p50: m((r) => r.latMs.p50), p90: m((r) => r.latMs.p90), p99: m((r) => r.latMs.p99), non2xx: m((r) => r.non2xx), meanRss: m((r) => r.rss.mean), peakRss: m((r) => r.rss.peak), meanCpu: m((r) => r.cpu.mean), peakCpu: m((r) => r.cpu.peak) };
          results.runs.push({ config: cfg.id, case: c.name, concurrency: conc, repeats: reps, median: { ...med, rpsPerCore: med.meanCpu ? med.rps / (med.meanCpu / 100) : 0, rpsPerMB: med.meanRss ? med.rps / med.meanRss : 0 } });
        } catch (err) {
          console.error(`  FAILED: ${err}`);
          results.runs.push({ config: cfg.id, case: c.name, concurrency: conc, failed: true, error: String(err) });
        }
        await Bun.write(OUT, JSON.stringify(results, null, 2));
      }
    }
  } finally {
    await srv.stop();
  }
}
console.log(`done: ${results.runs.length} combinations → ${OUT}`);
