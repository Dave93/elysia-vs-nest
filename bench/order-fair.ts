// bench/order-fair.ts — /orders insert throughput with a freshly vacuumed table for every config, c=100, 3 × 30 s.
// The main run's /orders numbers depend on run order (dead tuples from the previous config). Run: bun bench/order-fair.ts
import { CONFIGS, startServer, startSampler, startSysSampler, median, mean, collectEnv } from "./lib";
import { cases, bombardierArgs } from "./cases";
import { resetOrders, ordersStats } from "./db-reset";
const c = (await cases()).find((x) => x.name === "order")!;
async function bomb(dur: string) {
  const p = Bun.spawn(["bombardier", "-c", "100", "-d", dur, "-l", "--print", "r", "--format", "json", ...bombardierArgs(c)], { stdout: "pipe", stderr: "ignore" });
  const r = JSON.parse(await new Response(p.stdout).text()).result; await p.exited;
  return { rps: r.rps.mean as number, p99: r.latency.percentiles["99"] / 1000, non2xx: (r.req1xx + r.req3xx + r.req4xx + r.req5xx + r.others) as number };
}
const out: any = { env: await collectEnv(), concurrency: 100, repeats: 3, duration: "30s", configs: {} };
for (const cfg of CONFIGS.filter((x) => !x.sensitivity)) {
  await resetOrders();
  const before = await ordersStats();
  const srv = await startServer(cfg);
  try {
    await bomb("5s");
    const reps: any[] = [];
    for (let i = 0; i < 3; i++) {
      const s = startSampler(srv.pid), y = startSysSampler(srv.pid);
      const r = await bomb("30s");
      const smp = s.stop(), other = y.stop();
      reps.push({ ...r, meanRss: mean(smp.map((x) => x.rss)), meanCpu: mean(smp.map((x) => x.cpu)), otherCpu: mean(other) });
      console.log(cfg.id, "run", i + 1, r.rps.toFixed(0), "rps, cpu", reps[i].meanCpu.toFixed(0) + "%, other", reps[i].otherCpu.toFixed(0) + "%");
    }
    const after = await ordersStats();
    out.configs[cfg.id] = { before, after, repeats: reps, median: { rps: median(reps.map((r) => r.rps)), p99: median(reps.map((r) => r.p99)), meanRss: median(reps.map((r) => r.meanRss)), meanCpu: median(reps.map((r) => r.meanCpu)), non2xx: median(reps.map((r) => r.non2xx)) } };
  } finally { await srv.stop(); }
}
await Bun.write("results/order-fair.json", JSON.stringify(out, null, 2));
console.log(Object.entries<any>(out.configs).map(([k, v]) => `${k}: ${v.median.rps.toFixed(0)} rps`).join(", "));
