// bench/merge.ts — final results.json = A from the canary run + B/C/D from the Bun 1.4.2 run.
// Run: bun bench/merge.ts results/results-bun141canary.json results/results-bun142.json
const [aPath, bunPath] = process.argv.slice(2);
const A = JSON.parse(await Bun.file(aPath).text());
const B = JSON.parse(await Bun.file(bunPath).text());
const keepA = (cfg: string) => cfg === "A";
const merged = {
  env: { ...B.env, bunNote: `A measured on ${A.env.bun}; B/C/D on ${B.env.bun}. A runs on Node and does not use Bun.` },
  methodology: { ...B.methodology, order: ["A", ...B.methodology.order.filter((c: string) => c !== "A")], sources: { A: aPath, "B,C,D": bunPath } },
  idleRss: { A: A.idleRss.A, ...Object.fromEntries(Object.entries(B.idleRss).filter(([k]) => !keepA(k))) },
  bootMs: { A: A.bootMs.A, ...Object.fromEntries(Object.entries(B.bootMs).filter(([k]) => !keepA(k))) },
  runs: [...A.runs.filter((r: any) => keepA(r.config)), ...B.runs.filter((r: any) => !keepA(r.config))],
};
await Bun.write("results/results.json", JSON.stringify(merged, null, 2));
console.log(`merged: ${merged.runs.length} runs, order ${merged.methodology.order.join(",")}`);
