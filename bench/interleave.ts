// bench/interleave.ts — alternate configs back to back to settle small deltas (e.g. C vs D).
// SEQ=C,D,C,D CASES=me,health CONC=100 bun bench/interleave.ts → results/interleave.json
import { CONFIGS, startServer, startSampler, startSysSampler, median, mean, collectEnv } from "./lib";
import { cases, bombardierArgs } from "./cases";
const SEQ = (process.env.SEQ ?? "C,D,C,D").split(",");
const CONC = process.env.CONC ?? "100";
const CS = (await cases()).filter((c) => (process.env.CASES ?? "me,health").split(",").includes(c.name));
async function bomb(args: string[], dur: string) {
  const p = Bun.spawn(["bombardier", "-c", CONC, "-d", dur, "-l", "--print", "r", "--format", "json", ...args], { stdout: "pipe", stderr: "ignore" });
  const r = JSON.parse(await new Response(p.stdout).text()).result; await p.exited;
  return { rps: r.rps.mean as number, p99: r.latency.percentiles["99"] / 1000 };
}
const out: any = { env: await collectEnv(), seq: SEQ, concurrency: Number(CONC), rounds: [] };
for (const [i, id] of SEQ.entries()) {
  const cfg = CONFIGS.find((c) => c.id === id)!;
  const srv = await startServer(cfg);
  const round: any = { pos: i, config: id, cases: {} };
  try {
    for (const c of CS) {
      await bomb(bombardierArgs(c), "5s");
      const reps: any[] = [];
      for (let k = 0; k < 3; k++) { const s = startSampler(srv.pid), y = startSysSampler(srv.pid); const r = await bomb(bombardierArgs(c), "30s"); reps.push({ ...r, meanRss: mean(s.stop().map((x) => x.rss)), otherCpu: mean(y.stop()) }); }
      round.cases[c.name] = { rps: median(reps.map((r) => r.rps)), p99: median(reps.map((r) => r.p99)), meanRss: median(reps.map((r) => r.meanRss)), otherCpu: mean(reps.map((r) => r.otherCpu)), reps };
      console.log(`#${i} ${id} ${c.name}: ${round.cases[c.name].rps.toFixed(0)} rps, other ${round.cases[c.name].otherCpu.toFixed(0)}%`);
    }
  } finally { await srv.stop(); }
  out.rounds.push(round);
}
await Bun.write("results/interleave.json", JSON.stringify(out, null, 2));
