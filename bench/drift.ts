// bench/drift.ts — machine-drift check: re-measure config A (Node, unaffected by the Bun upgrade) on two routes at c=100,
// 3 × 30 s, and compare with the morning medians. Run: bun bench/drift.ts
import { CONFIGS, startServer, startSampler, median, mean, collectEnv } from "./lib";
import { cases, bombardierArgs } from "./cases";
const R = JSON.parse(await Bun.file("results/results-bun141canary.json").text());
const cfg = CONFIGS.find((c) => c.id === "A")!;
const CS = (await cases()).filter((c) => ["health", "user"].includes(c.name));
async function bomb(args: string[], dur: string) {
  const p = Bun.spawn(["bombardier", "-c", "100", "-d", dur, "-l", "--print", "r", "--format", "json", ...args], { stdout: "pipe", stderr: "ignore" });
  const r = JSON.parse(await new Response(p.stdout).text()).result; await p.exited; return r.rps.mean as number;
}
const srv = await startServer(cfg);
const out: any = { env: await collectEnv(), config: "A", concurrency: 100, cases: {} };
try {
  for (const c of CS) {
    await bomb(bombardierArgs(c), "5s");
    const rps: number[] = [], cpu: number[] = [];
    for (let i = 0; i < 3; i++) { const s = startSampler(srv.pid); rps.push(await bomb(bombardierArgs(c), "30s")); cpu.push(mean(s.stop().map((x) => x.cpu))); }
    const morning = R.runs.find((r: any) => r.config === "A" && r.case === c.name && r.concurrency === 100).median.rps;
    out.cases[c.name] = { rps, median: median(rps), meanCpu: mean(cpu), morningRps: morning, deltaPct: (median(rps) / morning - 1) * 100 };
    console.log(c.name, "now", median(rps).toFixed(0), "morning", morning.toFixed(0), "delta", out.cases[c.name].deltaPct.toFixed(1) + "%");
  }
} finally { await srv.stop(); }
await Bun.write("results/drift.json", JSON.stringify(out, null, 2));
