// bench/diag.ts — error breakdown for the non-2xx anomalies. 10 s runs, full bombardier JSON. Run: bun bench/diag.ts
import { CONFIGS, startServer } from "./lib";
import { cases, bombardierArgs } from "./cases";
const CS = await cases();
const probes: { cfg: string; c: string; conc: number }[] = [
  { cfg: "A", c: "health", conc: 500 }, { cfg: "A", c: "cpu", conc: 100 }, { cfg: "A", c: "cpu", conc: 500 },
  { cfg: "C", c: "health", conc: 500 }, { cfg: "C", c: "cpu", conc: 100 },
];
const out: any[] = [];
let cur: string | null = null, srv: any = null;
for (const p of probes) {
  if (cur !== p.cfg) { if (srv) await srv.stop(); srv = await startServer(CONFIGS.find((x) => x.id === p.cfg)!); cur = p.cfg; }
  const cs = CS.find((x) => x.name === p.c)!;
  const proc = Bun.spawn(["bombardier", "-c", String(p.conc), "-d", "10s", "-l", "--print", "r", "--format", "json", ...bombardierArgs(cs)], { stdout: "pipe", stderr: "ignore" });
  const text = await new Response(proc.stdout).text(); await proc.exited;
  const raw = JSON.parse(text).result;
  const row = { ...p, rps: raw.rps.mean, req2xx: raw.req2xx, req4xx: raw.req4xx, req5xx: raw.req5xx, others: raw.others, errors: raw.errors ?? null, latencyP99ms: raw.latency.percentiles["99"] / 1000 };
  out.push(row); console.log(JSON.stringify(row));
}
if (srv) await srv.stop();
await Bun.write("results/diag.json", JSON.stringify(out, null, 2));
