// bench/cost.ts — servers needed per stack per load, priced. Run: bun bench/cost.ts
import { mean } from "./lib";

const R = JSON.parse(await Bun.file("results/results.json").text());
const P = JSON.parse(await Bun.file("results/pricing-snapshot.json").text());
const FAIR = (await Bun.file("results/order-fair.json").exists()) ? JSON.parse(await Bun.file("results/order-fair.json").text()) : null;
const LOADS = [5000, 20000, 50000, 100000];
const HEADROOM = 0.5;           // run cores at 50 %
const RAM_MULT = 1.5;           // provision 1.5× peak RSS per process
const CASES = ["me", "user", "list", "order"];
const CONC = 100;

interface Plan { name: string; vcpu: number; ramGB: number; monthly: number }
const REF: Record<string, string> = { hetzner: "CAX11", fly: "shared-cpu-2x 4GB", aws: "t4g.medium" };
const rows: any[] = [];
for (const cfg of R.methodology.order as string[]) {
  const runs = R.runs.filter((r: any) => r.config === cfg && r.concurrency === CONC && CASES.includes(r.case) && !r.failed).map((r: any) => r.median);
  if (!runs.length) continue;
  const fair = FAIR?.configs?.[cfg]?.median;
  const perCore = R.runs.filter((r: any) => r.config === cfg && r.concurrency === CONC && CASES.includes(r.case) && !r.failed).map((r: any) => (r.case === "order" && fair ? fair.rps / (fair.meanCpu / 100) : r.median.rpsPerCore));
  const rpsPerCore = mean(perCore);
  const rssMB = Math.max(...runs.map((m: any) => m.peakRss));
  for (const load of LOADS) {
    const cores = load / (rpsPerCore * HEADROOM);
    const ramGB = (Math.ceil(cores) * rssMB * RAM_MULT) / 1024;
    const priced: Record<string, { plan: string; n: number; monthly: number }> = {};
    for (const [prov, spec] of Object.entries<any>(P.providers)) {
      const best = (spec.plans as Plan[])
        .map((p) => ({ plan: p.name, n: Math.max(Math.ceil(cores / p.vcpu), Math.ceil(ramGB / p.ramGB), 1), unit: p.monthly }))
        .map((p) => ({ plan: p.plan, n: p.n, monthly: p.n * p.unit }))
        .sort((a, b) => a.monthly - b.monthly)[0];
      priced[prov] = best;
    }
    const ref: Record<string, { plan: string; n: number; monthly: number }> = {};
    for (const [prov, spec] of Object.entries<any>(P.providers)) {
      const p = (spec.plans as Plan[]).find((x) => x.name === REF[prov]); if (!p) continue;
      const n = Math.max(Math.ceil(cores / p.vcpu), Math.ceil(ramGB / p.ramGB), 1);
      ref[prov] = { plan: p.name, n, monthly: n * p.monthly };
    }
    rows.push({ config: cfg, load, rpsPerCore, rssMB, coresNeeded: cores, ramGBNeeded: ramGB, priced, ref });
  }
}

const out = { assumptions: { ordersSource: FAIR ? "results/order-fair.json (fresh table)" : "results.json", loads: LOADS, headroom: HEADROOM, ramMultiplier: RAM_MULT, cases: CASES, concurrency: CONC, pricingFetchedAt: P.fetchedAt, currency: P.currency, eurUsd: P.eurUsd ?? null }, rows };
await Bun.write("results/cost-model.json", JSON.stringify(out, null, 2));

const provs = Object.keys(P.providers);
let md = `# Cost model\n\nDerived from \`results.json\` (cases ${CASES.join(", ")}, c=${CONC}, medians of 3 × 30 s) and \`pricing-snapshot.json\` (fetched ${P.fetchedAt}, prices in ${P.currency}${P.eurUsd ? `, EUR converted at ${P.eurUsd}` : ""}).\n\nFormula: cores = load ÷ (rps per core × ${HEADROOM}); RAM = ceil(cores) × peak RSS × ${RAM_MULT}. For each provider the cheapest plan count that covers both cores and RAM. Single-process figures; no cluster mode, no DB cost, no bandwidth. rps per core = rps ÷ (mean CPU % ÷ 100) measured on the same laptop, so treat the absolute dollar figures as relative, not as a quote.\n\n`;
for (const load of LOADS) {
  md += `## ${load.toLocaleString("en-US")} rps sustained\n\n| Config | rps/core | peak RSS MB | cores needed | ${provs.map((p) => `${P.providers[p].label ?? p}`).join(" | ")} |\n|---|---|---|---|${provs.map(() => "---").join("|")}|\n`;
  for (const r of rows.filter((r) => r.load === load)) {
    md += `| ${r.config} | ${r.rpsPerCore.toFixed(0)} | ${r.rssMB.toFixed(0)} | ${r.coresNeeded.toFixed(2)} | ${provs.map((p) => `${r.priced[p].plan} × ${r.priced[p].n} = $${r.priced[p].monthly.toFixed(0)}/mo`).join(" | ")} |\n`;
  }
  md += `\nSame load on one fixed box class per provider (2 vCPU / 4 GB: ${Object.values(REF).join(", ")}):\n\n| Config | ${provs.map((p) => `${REF[p]} × n = $/mo`).join(" | ")} |\n|---|${provs.map(() => "---").join("|")}|\n`;
  for (const r of rows.filter((r) => r.load === load)) md += `| ${r.config} | ${provs.map((p) => (r.ref[p] ? `× ${r.ref[p].n} = $${r.ref[p].monthly.toFixed(0)}` : "—")).join(" | ")} |\n`;
  md += "\n";
}
await Bun.write("results/cost-model.md", md);
console.log(md);
