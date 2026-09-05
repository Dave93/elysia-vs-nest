// bench/report.ts — results/*.json → summary.md, results.html (local, inline SVG), facts.md. Run: bun bench/report.ts
import { existsSync } from "node:fs";
import { median } from "./lib";

const read = async (p: string) => (existsSync(p) ? JSON.parse(await Bun.file(p).text()) : null);
const R = await read("results/results.json");
if (!R) throw new Error("results/results.json missing");
const NOISE = await read("results/noise.json");
const BOOT = await read("results/boot.json");
const DX = await read("results/dx.json");
const SENS = await read("results/sensitivity.json");
const FAIR = await read("results/order-fair.json");
const DRIFT = await read("results/drift.json");
const COST = existsSync("results/cost-model.md") ? await Bun.file("results/cost-model.md").text() : "";

const LABEL: Record<string, string> = {
  A: "A · Nest 12 + Fastify / Node 26", B: "B · Nest 12 + Fastify / Bun 1.4",
  C: "C · Elysia 2 / Bun 1.4", D: "D · Elysia 2 + AOT / Bun 1.4",
  "B-pgjs": "B-pgjs · Nest / Bun, postgres.js", "A-typebox": "A-typebox · Nest / Node, TypeBox",
};
const CASE_DESC: Record<string, string> = {
  health: "GET /health — framework overhead", echo: "POST /echo — body validation", me: "GET /me — JWT guard + DB read",
  user: "GET /users/:id — single-row read", list: "GET /users?page=7&limit=20 — 20-row list", order: "POST /orders — validated insert", cpu: "GET /cpu?n=15000 — SHA-256 loop, runtime only",
};
const ORDER: string[] = R.methodology.order;
const CASES: string[] = R.methodology.cases;
const CONCS: number[] = R.methodology.concurrencies;
const FLOOR: number = NOISE?.floorPct ?? 10;
const f0 = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 0 });
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
const pct = (a: number, b: number) => (a ? ((b - a) / a) * 100 : 0);
const sign = (x: number) => (x > 0 ? "+" : "") + f1(x) + "%";
const verdict = (d: number) => (Math.abs(d) < FLOOR ? "noise" : Math.abs(d) < 10 ? "small" : "real");
const run = (cfg: string, c: string, conc: number, src = R) => {
  const o = src.runs.find((r: any) => r.config === cfg && r.case === c && r.concurrency === conc && !r.failed);
  if (!o) return undefined;
  const errPct = median(o.repeats.map((r: any) => (100 * r.non2xx) / Math.max(1, r.req2xx + r.non2xx)));
  return { ...o.median, errPct };
};
const INVALID = 1;
// /orders at c=100 comes from the fresh-table pass when available (main-run numbers depend on run order).
const runF = (cfg: string, c: string, conc: number, src = R) => {
  if (c === "order" && conc === 100 && FAIR?.configs?.[cfg] && src === R) {
    const m = FAIR.configs[cfg].median;
    return { ...m, p50: NaN, p90: NaN, peakRss: NaN, rpsPerCore: m.meanCpu ? m.rps / (m.meanCpu / 100) : 0, rpsPerMB: m.meanRss ? m.rps / m.meanRss : 0, errPct: 0, fair: true };
  }
  return run(cfg, c, conc, src);
}; // % non-2xx above which a combination's rps is not throughput
const src = (cfg: string, c: string, conc: number, field: string, file = "results.json") => `results/${file} → runs[config=${cfg}, case=${c}, concurrency=${conc}].median.${field}`;

// ---------- markdown sections ----------
const md: string[] = [];
const facts: string[] = [];
md.push(`# Elysia 2 vs NestJS 12 — results summary\n\nGenerated ${new Date().toISOString()} from \`results/*.json\`. Every number here is a median of ${R.methodology.repeats} × ${R.methodology.duration} bombardier runs after a ${R.methodology.warmup} warm-up unless stated otherwise. RSS/CPU sampled with \`ps\` every 500 ms; 100 % CPU = one core.\n`);

md.push(`## Environment\n\n| | |\n|---|---|\n| Date | ${R.env.date} |\n| Machine | ${R.env.cpu}, ${R.env.cores} cores, ${f0(R.env.ramGB)} GB, macOS ${R.env.macos} |\n| Bun | ${R.env.bun} |\n| Node | ${R.env.node} |\n| Elysia | ${R.env.elysia} |\n| NestJS core | ${R.env.nestCore} |\n| Fastify | ${R.env.fastify} |\n| Drizzle | ${R.env.drizzle} |\n| Postgres | ${R.env.postgres} (Homebrew, same host) |\n| Load generator | ${R.env.bombardier || "bombardier"}, same host |\n| Run order | ${ORDER.join(" → ")} |\n| Concurrency | ${CONCS.join(", ")} |\n`);
facts.push(`## Environment\n- Hardware: ${R.env.cpu}, ${R.env.cores} cores, ${f0(R.env.ramGB)} GB RAM, macOS ${R.env.macos} (source: results/results.json → env)`);
facts.push(`- Versions: Bun ${R.env.bun}; Node ${R.env.node}; Elysia ${R.env.elysia}; @nestjs/core ${R.env.nestCore}; Fastify ${R.env.fastify}; drizzle-orm ${R.env.drizzle}; ${R.env.postgres} (source: results/results.json → env)`);
facts.push(`- Method: ${R.methodology.repeats} repeats × ${R.methodology.duration} per combination, ${R.methodology.warmup} warm-up discarded, medians; concurrency ${CONCS.join("/")}; run order ${ORDER.join("→")}; bombardier on the same machine (source: results/results.json → methodology)`);

if (NOISE) {
  md.push(`## Noise floor\n\nConfig ${NOISE.config}, c=${NOISE.concurrency}, ${NOISE.repeats} back-to-back ${NOISE.duration} runs per route.\n\n| Route | rps per run | spread (max−min)/min | CV |\n|---|---|---|---|\n` + Object.entries<any>(NOISE.cases).map(([k, v]) => `| ${k} | ${v.rps.map(f0).join(", ")} | ${f1(v.spreadPct)}% | ${f1(v.cv * 100)}% |`).join("\n") + `\n\n**Significance floor used below: ±${f1(FLOOR)}%.** A combination with more than 1% non-2xx is marked invalid: its rps counts connection resets, not served requests. Deltas inside the floor are labelled \`noise\`; between the floor and 10% \`small\`; 10% and above \`real\`.\n`);
  facts.push(`\n## Noise floor\n- Measured run-to-run spread on config C at c=100: ${Object.entries<any>(NOISE.cases).map(([k, v]) => `${k} ${f1(v.spreadPct)}%`).join(", ")}; floor used = ±${f1(FLOOR)}% (source: results/noise.json → cases, floorPct)`);
}

md.push(`## Throughput, latency, resources — per route\n`);
for (const c of CASES) {
  md.push(`### ${CASE_DESC[c] ?? c}${c === "order" && FAIR ? " — main-run rows depend on run order (table bloat); see the fresh-table section" : ""}\n\n| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |\n|---|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const conc of CONCS) for (const cfg of ORDER) {
    const m = run(cfg, c, conc); if (!m) { md.push(`| ${cfg} | ${conc} | failed | | | | | | | | | |`); continue; }
    md.push(`| ${cfg} | ${conc} | ${m.errPct > INVALID ? "~~" + f0(m.rps) + "~~ invalid" : f0(m.rps)} | ${f2(m.p50)} | ${f2(m.p90)} | ${f2(m.p99)} | ${f0(m.non2xx)} (${f2(m.errPct)}%) | ${f0(m.meanRss)} | ${f0(m.peakRss)} | ${f0(m.meanCpu)} | ${f0(m.rpsPerCore)} | ${f0(m.rpsPerMB)} |`);
  }
  md.push("");
}
facts.push(`\n## Per-route medians (c=100)`);
for (const c of CASES) for (const cfg of ORDER) { const m = run(cfg, c, 100); if (m) facts.push(`- ${cfg} ${c} c=100: ${f0(m.rps)} rps, p50 ${f2(m.p50)} ms, p99 ${f2(m.p99)} ms, mean RSS ${f0(m.meanRss)} MB, peak RSS ${f0(m.peakRss)} MB, mean CPU ${f0(m.meanCpu)} %, ${f0(m.rpsPerCore)} rps/core, non-2xx ${f0(m.non2xx)} = ${f2(m.errPct)}%${m.errPct > INVALID ? " [INVALID: connection errors, rps is not throughput]" : ""} (source: ${src(cfg, c, 100, "*")})`); }
facts.push(`\n## Per-route medians (c=500)`);
for (const c of CASES) for (const cfg of ORDER) { const m = run(cfg, c, 500); if (m) facts.push(`- ${cfg} ${c} c=500: ${f0(m.rps)} rps, p99 ${f2(m.p99)} ms, mean RSS ${f0(m.meanRss)} MB, mean CPU ${f0(m.meanCpu)} %, non-2xx ${f0(m.non2xx)} = ${f2(m.errPct)}%${m.errPct > INVALID ? " [INVALID: connection errors, rps is not throughput]" : ""} (source: ${src(cfg, c, 500, "*")})`); }

// ---------- layer deltas ----------
const STEPS: [string, string, string][] = [["A", "B", "runtime: Node → Bun (+ native SQL driver)"], ["B", "C", "framework: Nest+Fastify → Elysia 2"], ["C", "D", "build: JIT → AOT"], ["A", "D", "total: A → D"]];
for (const conc of [100, 500]) {
  md.push(`## Layer attribution at c=${conc}\n\nEach step changes one layer. \`noise\` = inside ±${f1(FLOOR)}%.\n\n| Route | Step | rps | Δ rps | verdict | mean RSS | Δ RSS | p99 | Δ p99 | rps/core | Δ rps/core |\n|---|---|---|---|---|---|---|---|---|---|---|`);
  facts.push(`\n## Layer attribution (c=${conc}, floor ±${f1(FLOOR)}%)`);
  for (const c of CASES) for (const [a, b, what] of STEPS) {
    const ma = runF(a, c, conc), mb = runF(b, c, conc); if (!ma || !mb) continue;
    const dr = pct(ma.rps, mb.rps), drss = pct(ma.meanRss, mb.meanRss), dp = pct(ma.p99, mb.p99), dc = pct(ma.rpsPerCore, mb.rpsPerCore);
    const v = ma.errPct > INVALID || mb.errPct > INVALID ? "invalid (errors)" : verdict(dr);
    md.push(`| ${c}${ma.fair ? " (fresh table)" : ""} | ${a}→${b} ${what} | ${f0(ma.rps)} → ${f0(mb.rps)} | ${sign(dr)} | ${v} | ${f0(ma.meanRss)} → ${f0(mb.meanRss)} MB | ${sign(drss)} | ${f2(ma.p99)} → ${f2(mb.p99)} | ${sign(dp)} | ${f0(ma.rpsPerCore)} → ${f0(mb.rpsPerCore)} | ${sign(dc)} |`);
    facts.push(`- ${c} ${a}→${b} (${what}): rps ${sign(dr)} [${v}], mean RSS ${sign(drss)}, p99 ${sign(dp)}, rps/core ${sign(dc)} (source: ${src(a, c, conc, "rps|meanRss|p99|rpsPerCore")} vs ${b})`);
  }
  md.push("");
}

// ---------- /orders with a fresh table ----------
if (FAIR) {
  md.push(`## POST /orders with a freshly vacuumed table, c=100\n\nEach config got \`VACUUM (FULL, ANALYZE) orders\` and a 200,000-row table before its 3 × 30 s. This replaces the main-run \`/orders\` numbers, which depended on which config ran first.\n\n| Config | rps | p99 ms | mean RSS MB | mean CPU % | rps/core | dead tuples before → after | non-2xx |\n|---|---|---|---|---|---|---|---|`);
  facts.push(`\n## /orders, fresh table, c=100`);
  for (const cfg of ORDER) {
    const v = FAIR.configs[cfg]; if (!v) continue; const m = v.median;
    md.push(`| ${cfg} | ${f0(m.rps)} | ${f2(m.p99)} | ${f0(m.meanRss)} | ${f0(m.meanCpu)} | ${f0(m.meanCpu ? m.rps / (m.meanCpu / 100) : 0)} | ${f0(v.before.dead)} → ${f0(v.after.dead)} | ${f0(m.non2xx)} |`);
    facts.push(`- ${cfg} /orders c=100 fresh table: ${f0(m.rps)} rps, p99 ${f2(m.p99)} ms, mean RSS ${f0(m.meanRss)} MB, mean CPU ${f0(m.meanCpu)} % (source: results/order-fair.json → configs.${cfg}.median)`);
  }
  md.push("");
}

// ---------- machine drift ----------
if (DRIFT) {
  md.push(`## Machine drift check\n\nConfig A (Node, untouched by the Bun upgrade) re-measured after the afternoon pass, c=100, 3 × 30 s, against its morning medians.\n\n| Route | morning rps | afternoon rps | Δ | verdict | foreign CPU during afternoon run |\n|---|---|---|---|---|---|`);
  facts.push(`\n## Machine drift (A re-measured)`);
  for (const [k, v] of Object.entries<any>(DRIFT.cases)) {
    md.push(`| ${k} | ${f0(v.morningRps)} | ${f0(v.median)} | ${sign(v.deltaPct)} | ${verdict(v.deltaPct)} | ${f0(v.otherCpu)}% |`);
    facts.push(`- A ${k} c=100: morning ${f0(v.morningRps)} rps, afternoon ${f0(v.median)} rps, ${sign(v.deltaPct)} [${verdict(v.deltaPct)}] (source: results/drift.json → cases.${k})`);
  }
  md.push("");
}

// ---------- idle RSS, boot ----------
md.push(`## Idle memory and startup\n\n| Config | idle RSS MB (bench run) | boot→healthy ms (bench run, 1 sample) | boot→healthy ms (median of ${BOOT?.repeats ?? "?"}) | first request ms (median) |\n|---|---|---|---|---|`);
facts.push(`\n## Idle memory and startup`);
for (const cfg of ORDER) {
  const b = BOOT?.[cfg];
  md.push(`| ${cfg} | ${f1(R.idleRss[cfg])} | ${f0(R.bootMs[cfg])} | ${b ? f0(b.bootMedian) : "—"} | ${b ? f2(b.firstReqMedian) : "—"} |`);
  facts.push(`- ${cfg}: idle RSS ${f1(R.idleRss[cfg])} MB (source: results/results.json → idleRss.${cfg})${b ? `; boot to healthy median ${f0(b.bootMedian)} ms over ${BOOT.repeats} cold starts, first request ${f2(b.firstReqMedian)} ms (source: results/boot.json → ${cfg})` : ""}`);
}
md.push("");

// ---------- DX ----------
if (DX) {
  const e = DX.elysia, n = DX.nest;
  const row = (k: string, fe: string, fn: string) => `| ${k} | ${fe} | ${fn} |`;
  md.push(`## Developer-experience measurements\n\n| Metric | Elysia 2 (Bun) | NestJS 12 (npm/Node) |\n|---|---|---|\n` + [
    row("fresh install (lockfile)", `${f1(e.installMs / 1000)} s`, `${f1(n.installMs / 1000)} s`),
    row("node_modules size", `${f0(e.nodeModulesMB)} MB`, `${f0(n.nodeModulesMB)} MB`),
    row("packages in node_modules", f0(e.depCount), f0(n.depCount)),
    row("direct deps (runtime / dev)", `${e.directDeps.runtime} / ${e.directDeps.dev}`, `${n.directDeps.runtime} / ${n.directDeps.dev}`),
    row("production build (median of 3)", `${f0(e.buildMs)} ms (bundle)${e.aotBuildMs ? `; AOT ${f0(e.aotBuildMs)} ms` : ""}`, `${f0(n.buildMs)} ms (SWC, unbundled)`),
    row("dist size", `${f0(e.distKB)} KB${e.aotDistKB ? `; AOT ${f0(e.aotDistKB)} KB` : ""}`, `${f0(n.distKB)} KB`),
    row("tsc --noEmit (median of 3)", `${f1(e.typecheckMs / 1000)} s`, `${f1(n.typecheckMs / 1000)} s`),
    row("watch-mode reload (median of 5)", `${f0(e.reloadMedianMs)} ms`, `${f0(n.reloadMedianMs)} ms`),
    row("app source LOC / files", `${e.loc} / ${e.files}`, `${n.loc} / ${n.files}`),
    row("config files at app root", e.configFiles, n.configFiles),
  ].join("\n") + "\n");
  facts.push(`\n## DX measurements\n- Elysia app: install ${f1(e.installMs / 1000)} s, node_modules ${f0(e.nodeModulesMB)} MB / ${e.depCount} packages, build ${f0(e.buildMs)} ms, dist ${f0(e.distKB)} KB, AOT build ${f0(e.aotBuildMs)} ms / ${f0(e.aotDistKB)} KB, typecheck ${f1(e.typecheckMs / 1000)} s, reload ${f0(e.reloadMedianMs)} ms, ${e.loc} LOC in ${e.files} files (source: results/dx.json → elysia)`);
  facts.push(`- Nest app: install ${f1(n.installMs / 1000)} s, node_modules ${f0(n.nodeModulesMB)} MB / ${n.depCount} packages, build ${f0(n.buildMs)} ms, dist ${f0(n.distKB)} KB, typecheck ${f1(n.typecheckMs / 1000)} s, reload ${f0(n.reloadMedianMs)} ms, ${n.loc} LOC in ${n.files} files (source: results/dx.json → nest)`);
}

// ---------- sensitivity ----------
if (SENS) {
  md.push(`## Sensitivity runs (c=100)\n\n| Route | Pair | rps | Δ rps | verdict | mean RSS | Δ RSS |\n|---|---|---|---|---|---|---|`);
  facts.push(`\n## Sensitivity (c=100)`);
  const pairs: [string, string, string][] = [["B", "B-pgjs", "Bun runtime: bun-sql → postgres.js"], ["A", "A-typebox", "Node: Zod → TypeBox validator"]];
  for (const [base, alt, what] of pairs) for (const c of SENS.methodology.cases as string[]) {
    const mb = run(base, c, 100), ma = run(alt, c, 100, SENS); if (!mb || !ma) continue;
    const dr = pct(mb.rps, ma.rps), drss = pct(mb.meanRss, ma.meanRss);
    md.push(`| ${c} | ${base}→${alt} ${what} | ${f0(mb.rps)} → ${f0(ma.rps)} | ${sign(dr)} | ${verdict(dr)} | ${f0(mb.meanRss)} → ${f0(ma.meanRss)} MB | ${sign(drss)} |`);
    facts.push(`- ${c} ${base}→${alt} (${what}): rps ${sign(dr)} [${verdict(dr)}], mean RSS ${sign(drss)} (source: results/sensitivity.json → runs[config=${alt}, case=${c}, concurrency=100] vs results/results.json ${base})`);
  }
  md.push("");
}

// ---------- Bun version delta (canary run vs 1.4.2 run, same B/C/D configs) ----------
const CANARY = await read("results/results-bun141canary.json");
if (CANARY && R.methodology.sources) {
  md.push(`## Bun ${CANARY.env.bun} → ${R.env.bun}, same configs\n\nB/C/D were measured twice: first on the canary, then on the 1.4.2 release. Same harness, same order, same day. Deltas at c=100.\n\n| Route | Config | rps canary → 1.4.2 | Δ rps | verdict | mean RSS canary → 1.4.2 | Δ RSS |\n|---|---|---|---|---|---|---|`);
  facts.push(`\n## Bun version delta (${CANARY.env.bun} → ${R.env.bun}, c=100)`);
  for (const c of CASES) for (const cfg of ["B", "C", "D"]) {
    const m0 = run(cfg, c, 100, CANARY), m1 = run(cfg, c, 100); if (!m0 || !m1) continue;
    const dr = pct(m0.rps, m1.rps), drss = pct(m0.meanRss, m1.meanRss);
    md.push(`| ${c} | ${cfg} | ${f0(m0.rps)} → ${f0(m1.rps)} | ${sign(dr)} | ${verdict(dr)} | ${f0(m0.meanRss)} → ${f0(m1.meanRss)} MB | ${sign(drss)} |`);
    facts.push(`- ${c} ${cfg}: rps ${sign(dr)} [${verdict(dr)}], mean RSS ${sign(drss)} (source: results/results-bun141canary.json vs results/results.json, runs[config=${cfg}, case=${c}, concurrency=100].median)`);
  }
  md.push("");
}

if (COST) { md.push(COST.replace(/^# Cost model/, "## Cost model")); facts.push(`\n## Cost model\n- See results/cost-model.md; every row derives from results.json medians at c=100 and results/pricing-snapshot.json (dated). Formula in the file header.`); }

await Bun.write("results/summary.md", md.join("\n"));
await Bun.write("results/facts.md", `# Facts with provenance\n\nThe only permitted fact set for the article. Each line names the file and key it came from. Nothing stronger than these numbers may appear in prose.\n\n${facts.join("\n")}\n`);

// ---------- HTML with inline SVG ----------
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"], SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500"];
function barChart(title: string, unit: string, groups: { label: string; values: number[] }[], series: string[]): string {
  const W = 760, H = 300, padL = 60, padR = 16, padT = 36, padB = 44;
  const max = Math.max(...groups.flatMap((g) => g.values)) || 1;
  const gw = (W - padL - padR) / groups.length, bw = Math.min(28, (gw - 16) / series.length);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}"><title>${title}</title>`;
  s += `<text x="${padL}" y="20" class="t">${title}</text>`;
  for (let i = 0; i <= 4; i++) { const v = (max * i) / 4; s += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" class="ax">${f0(v)}</text>`; }
  groups.forEach((g, gi) => {
    const x0 = padL + gi * gw + (gw - bw * series.length - 2 * (series.length - 1)) / 2;
    const top = Math.max(...g.values);
    g.values.forEach((v, si) => {
      const x = x0 + si * (bw + 2), h = y(0) - y(v);
      s += `<rect x="${x}" y="${y(v)}" width="${bw}" height="${h}" rx="4" ry="4" fill="var(--s${si + 1})"><title>${series[si]} · ${g.label}: ${f0(v)} ${unit}</title></rect>`;
      s += `<rect x="${x}" y="${y(0) - 4}" width="${bw}" height="4" fill="var(--s${si + 1})"/>`;
      if (v === top) s += `<text x="${x + bw / 2}" y="${y(v) - 5}" text-anchor="middle" class="lab">${f0(v)}</text>`;
    });
    s += `<text x="${padL + gi * gw + gw / 2}" y="${H - padB + 18}" text-anchor="middle" class="ax">${g.label}</text>`;
  });
  s += `<text x="${W - padR}" y="${H - 6}" text-anchor="end" class="ax">${unit}</text></svg>`;
  return s;
}
const legend = `<div class="legend">${ORDER.map((c, i) => `<span><i style="background:var(--s${i + 1})"></i>${LABEL[c]}</span>`).join("")}</div>`;
const charts: string[] = [];
for (const c of CASES) charts.push(barChart(`${CASE_DESC[c] ?? c} — requests/s`, "req/s", CONCS.map((conc) => ({ label: `c=${conc}`, values: ORDER.map((cfg) => run(cfg, c, conc)?.rps ?? 0) })), ORDER.map((c) => LABEL[c])));
charts.push(barChart("Mean RSS under load, c=100 — MB", "MB", CASES.map((c) => ({ label: c, values: ORDER.map((cfg) => run(cfg, c, 100)?.meanRss ?? 0) })), ORDER.map((c) => LABEL[c])));
charts.push(barChart("Requests per core, c=100", "req/s per core", CASES.filter((c) => c !== "cpu").map((c) => ({ label: c, values: ORDER.map((cfg) => run(cfg, c, 100)?.rpsPerCore ?? 0) })), ORDER.map((c) => LABEL[c])));
charts.push(barChart("Idle RSS — MB", "MB", [{ label: "idle", values: ORDER.map((cfg) => R.idleRss[cfg]) }], ORDER.map((c) => LABEL[c])));
if (BOOT) charts.push(barChart(`Boot to healthy, median of ${BOOT.repeats} — ms`, "ms", [{ label: "boot", values: ORDER.map((cfg) => BOOT[cfg]?.bootMedian ?? 0) }], ORDER.map((c) => LABEL[c])));

function mdToHtml(m: string): string {
  const lines = m.split("\n"); let out = "", inTable = false;
  for (const l of lines) {
    if (l.startsWith("|")) { const cells = l.split("|").slice(1, -1).map((c) => c.trim()); if (cells.every((c) => /^-+$/.test(c))) continue; if (!inTable) { out += "<table>"; inTable = true; } out += `<tr>${cells.map((c) => `<td>${c.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")}</td>`).join("")}</tr>`; continue; }
    if (inTable) { out += "</table>"; inTable = false; }
    if (/^### /.test(l)) out += `<h3>${l.slice(4)}</h3>`; else if (/^## /.test(l)) out += `<h2>${l.slice(3)}</h2>`; else if (/^# /.test(l)) out += `<h1>${l.slice(2)}</h1>`; else if (l.trim()) out += `<p>${l.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")}</p>`;
  }
  if (inTable) out += "</table>";
  return out;
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elysia 2 vs NestJS 12 — results</title>
<style>
:root{color-scheme:light;--bg:#fcfcfb;--fg:#0b0b0b;--fg2:#52514e;--grid:#e6e5e1;--s1:${SERIES[0]};--s2:${SERIES[1]};--s3:${SERIES[2]};--s4:${SERIES[3]}}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){color-scheme:dark;--bg:#1a1a19;--fg:#fff;--fg2:#c3c2b7;--grid:#333331;--s1:${SERIES_DARK[0]};--s2:${SERIES_DARK[1]};--s3:${SERIES_DARK[2]};--s4:${SERIES_DARK[3]}}}
:root[data-theme=dark]{color-scheme:dark;--bg:#1a1a19;--fg:#fff;--fg2:#c3c2b7;--grid:#333331;--s1:${SERIES_DARK[0]};--s2:${SERIES_DARK[1]};--s3:${SERIES_DARK[2]};--s4:${SERIES_DARK[3]}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,sans-serif}main{max-width:1000px;margin:0 auto;padding:24px}
h1{font-size:22px}h2{font-size:18px;margin-top:36px}h3{font-size:15px;color:var(--fg2)}code{font-size:12px}
table{border-collapse:collapse;font-size:12.5px;margin:8px 0;display:block;overflow-x:auto;max-width:100%}td{padding:4px 10px;border-bottom:1px solid var(--grid);white-space:nowrap}tr:first-child td{font-weight:600;color:var(--fg2)}
.charts{display:grid;grid-template-columns:1fr;gap:20px}svg{width:100%;height:auto}svg .t{font-size:13px;font-weight:600;fill:var(--fg)}svg .ax{font-size:11px;fill:var(--fg2)}svg .lab{font-size:11px;fill:var(--fg)}svg .grid{stroke:var(--grid);stroke-width:1}
.legend{display:flex;flex-wrap:wrap;gap:16px;font-size:12.5px;color:var(--fg2);margin:8px 0 16px}.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
</style></head><body><main>
<h1>Elysia 2 vs NestJS 12 — results</h1><p>Local report. Hover a bar for the exact value; every number is also in the tables below and in <code>results/summary.md</code>.</p>
${legend}<div class="charts">${charts.join("")}</div>
${mdToHtml(md.slice(1).join("\n"))}
</main></body></html>`;
await Bun.write("results/results.html", html);
console.log(`summary.md ${md.join("\n").length} chars, facts.md ${facts.length} lines, results.html ${html.length} chars`);
