// bench/boot.ts — 10 cold boots per config: spawn → /health 200, then latency of the first /users/4242. Run: bun bench/boot.ts
import { CONFIGS, BASE_URL, startServer, median, collectEnv } from "./lib";

const N = process.env.BENCH_QUICK ? 2 : 10;
const out: Record<string, any> = { env: await collectEnv(), repeats: N };
for (const cfg of CONFIGS.filter((c) => !c.sensitivity)) {
  const bootMs: number[] = [], firstReqMs: number[] = [];
  for (let i = 0; i < N; i++) {
    const s = await startServer(cfg);
    const t0 = performance.now();
    await (await fetch(`${BASE_URL}/users/4242`)).text();
    firstReqMs.push(performance.now() - t0);
    bootMs.push(s.readyMs);
    await s.stop();
  }
  out[cfg.id] = { bootMs, bootMedian: median(bootMs), firstReqMs, firstReqMedian: median(firstReqMs) };
  console.log(cfg.id, "boot", median(bootMs).toFixed(0), "ms, first req", median(firstReqMs).toFixed(2), "ms");
}
await Bun.write("results/boot.json", JSON.stringify(out, null, 2));
