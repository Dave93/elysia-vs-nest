/**
 * Emit the six JSON payloads the article's interactive blocks consume, from
 * results/*.json — never from prose. Output: results/article-blocks/<name>.json.
 *
 * The shapes mirror the guards in shipkit_landing
 * (apps/web/components/blog/blocks/<name>.guard.ts). A number that appears in
 * a block must be reproducible from these files, which is what lets the
 * skeptic check a fence by diffing instead of by hunting.
 *
 *   bun bench/article-blocks.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const R = (name: string) => JSON.parse(readFileSync(join("results", name), "utf8"));

type Median = { rps: number; p99: number; meanRss: number; meanCpu: number; non2xx: number; rpsPerCore: number; req2xx?: number };
type Run = { config: string; case: string; concurrency: number; median: Median; repeats: { req2xx: number; non2xx: number }[] };

const results = R("results.json") as { runs: Run[]; idleRss: Record<string, number> };
const canary = R("results-bun141canary.json") as { runs: Run[] };
const orderFair = R("order-fair.json") as { concurrency: number; configs: Record<string, { before: { dead: number }; median: Median }> };
const boot = R("boot.json") as { repeats: number } & Record<string, { bootMedian: number; firstReqMedian?: number; firstReqMs?: number[] }>;
const noise = R("noise.json") as { config: string; concurrency: number; duration: string; repeats: number; cases: Record<string, { rps: number[] }>; floorPct: number };
const diag = R("diag.json") as { cfg: string; c: string; conc: number; req2xx: number; others: number; latencyP99ms?: number; errors?: { description: string; count: number }[] }[];
const cost = R("cost-model.json") as { assumptions: { loads: number[] }; rows: { config: string; load: number; priced: Record<string, { plan: string; n: number; monthly: number }>; ref: Record<string, { plan: string; n: number; monthly: number }> }[] };

const FLOOR = noise.floorPct;
const CONC = 100;
const round = (x: number, d = 1) => Number(x.toFixed(d));

const run = (runs: Run[], config: string, c: string, conc = CONC) =>
  runs.find((r) => r.config === config && r.case === c && r.concurrency === conc);

// report.ts: median over repeats of each repeat's non-2xx share.
const errorRate = (r: Run) => median(r.repeats.map((x) => x.non2xx / Math.max(1, x.req2xx + x.non2xx)));

// Exactly bench/report.ts's rule on unrounded values, so every verdict here
// equals the one in summary.md / facts.md. A delta that prints as −2.6% can
// therefore carry "small" beside a floor that prints as ±2.6%; the article
// says so rather than quietly rounding the verdict.
const verdictFor = (deltaPct: number, invalid: boolean) =>
  invalid ? "invalid" : Math.abs(deltaPct) < FLOOR ? "noise" : Math.abs(deltaPct) < 10 ? "small" : "real";

// ---------------------------------------------------------------- layer-steps
const ROUTES: { id: string; label: string }[] = [
  { id: "health", label: "GET /health — framework overhead" },
  { id: "echo", label: "POST /echo — body validation" },
  { id: "me", label: "GET /me — JWT + one-row read" },
  { id: "user", label: "GET /users/:id — single-row read" },
  { id: "list", label: "GET /users?page=7 — 20-row list" },
  { id: "order", label: "POST /orders — validated insert, fresh table" },
];
const STEPS: { id: string; from: string; to: string; label: string; total?: boolean }[] = [
  { id: "A→B", from: "A", to: "B", label: "runtime: Node → Bun (+ native SQL driver)" },
  { id: "B→C", from: "B", to: "C", label: "framework: Nest + Fastify → Elysia 2" },
  { id: "C→D", from: "C", to: "D", label: "build: JIT → AOT" },
  { id: "A→D", from: "A", to: "D", label: "the whole swap", total: true },
];

function metric(route: string, config: string): { rps: number; rss: number; invalid: boolean } {
  if (route === "order") {
    const m = orderFair.configs[config]!.median;
    return { rps: m.rps, rss: m.meanRss, invalid: m.non2xx > 0.01 * (m.req2xx ?? Infinity) };
  }
  const r = run(results.runs, config, route)!;
  return { rps: r.median.rps, rss: r.median.meanRss, invalid: errorRate(r) > 0.01 };
}

const layerSteps = {
  concurrency: CONC,
  floorPct: round(FLOOR, 1),
  default: "me",
  routes: ROUTES.map((route) => {
    const steps = (key: "rps" | "rss") =>
      STEPS.map((s) => {
        const a = metric(route.id, s.from);
        const b = metric(route.id, s.to);
        const from = Math.round(a[key]);
        const toValue = Math.round(b[key]);
        const delta = ((b[key] - a[key]) / a[key]) * 100;
        return {
          id: s.id,
          to: s.to,
          label: s.label,
          from,
          toValue,
          delta: round(delta, 1),
          verdict: verdictFor(delta, a.invalid || b.invalid),
          ...(s.total ? { total: true } : {}),
        };
      });
    return { id: route.id, label: route.label, steps: steps("rps"), rss: steps("rss") };
  }),
};

// ------------------------------------------------------------------ boot-race
const bootRace = {
  repeats: boot.repeats,
  configs: ["A", "B", "C", "D"].map((id) => {
    const b = boot[id]!;
    const first = b.firstReqMedian ?? median(b.firstReqMs ?? []);
    return { id, bootMs: Math.round(b.bootMedian), idleRssMb: Math.round(results.idleRss[id]!), firstReqMs: round(first, 1) };
  }),
};
function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2) : NaN;
}

// ---------------------------------------------------------------- noise-floor
const ROUTE_LABEL: Record<string, string> = { health: "GET /health", user: "GET /users/:id" };
const noiseFloor = {
  config: noise.config,
  concurrency: noise.concurrency,
  seconds: parseInt(noise.duration, 10),
  floorPct: round(FLOOR, 1),
  runs: Object.entries(noise.cases).map(([c, v]) => ({ route: ROUTE_LABEL[c] ?? c, values: v.rps.map((x) => Math.round(x)) })),
  bands: [
    { id: "noise", to: round(FLOOR, 1) },
    { id: "small", to: 10 },
    { id: "real", to: 20 },
  ],
};

// ---------------------------------------------------------------- invalid-rps
const probe = (cfg: string) => diag.find((d) => d.cfg === cfg && d.c === "cpu" && d.conc === 100)!;
// "dial tcp …: connect: connection reset by peer" only — the number the
// friction log quotes; the handful of "read: connection reset" variants stay
// in `other` with the broken pipes and timeouts.
const resets = (d: (typeof diag)[number]) =>
  (d.errors ?? []).filter((e) => e.description.startsWith("dial tcp") && e.description.includes("connection reset by peer")).reduce((n, e) => n + e.count, 0);
const aCpu = run(results.runs, "A", "cpu")!;
const invalidRps = {
  probe: { seconds: 10, concurrency: 100, route: "GET /cpu?n=15000" },
  headline: {
    config: "A",
    rps: Math.round(aCpu.median.rps),
    non2xx: aCpu.median.non2xx,
    pct: round(errorRate(aCpu) * 100, 2),
  },
  rows: ["A", "C"].map((cfg) => {
    const d = probe(cfg);
    const rs = resets(d);
    return { id: cfg, served: d.req2xx, resets: rs, other: d.others - rs, p99Ms: cfg === "A" ? null : Math.round(d.latencyP99ms ?? NaN) };
  }),
};

// --------------------------------------------------------------- orders-bloat
// pg_stat_user_tables snapshot recorded in friction-log.md at 14:52; the
// harness does not store it, so these six numbers are the one hand-copied
// input here and are flagged as such for the skeptic.
const ordersTable = { live: 200000, dead: 5911710, inserts: 32004978, deletes: 31804978, autovacuums: 79, diskMb: 547 };
const ordersBloat = {
  table: ordersTable,
  passes: [
    {
      label: "morning pass, A ran first",
      order: [
        { id: "A", rps: Math.round(run(results.runs, "A", "order")!.median.rps) },
        ...["B", "C", "D"].map((id) => ({ id, rps: Math.round(run(canary.runs, id, "order")!.median.rps) })),
      ],
    },
    {
      label: "afternoon pass, B ran first",
      order: ["B", "C", "D"].map((id) => ({ id, rps: Math.round(run(results.runs, id, "order")!.median.rps) })),
    },
  ],
  fresh: ["A", "B", "C", "D"].map((id) => {
    const c = orderFair.configs[id]!;
    return { id, rps: Math.round(c.median.rps), p99Ms: round(c.median.p99, 2), deadBefore: c.before.dead };
  }),
};

// ---------------------------------------------------------------------- boxes
const PROVIDERS = [
  { id: "hetzner", label: "Hetzner", box: "CAX11 · 2 vCPU / 4 GB" },
  { id: "fly", label: "Fly.io", box: "shared-cpu-2x 4GB" },
  { id: "aws", label: "AWS", box: "t4g.medium" },
];
const boxes = {
  loads: cost.assumptions.loads,
  providers: PROVIDERS,
  rows: cost.rows.map((r) => ({
    load: r.load,
    config: r.config,
    fixed: PROVIDERS.map((p) => ({ provider: p.id, count: r.ref[p.id]!.n, usd: Math.round(r.ref[p.id]!.monthly) })),
    cheapest: PROVIDERS.map((p) => ({ provider: p.id, plan: `${r.priced[p.id]!.plan} × ${r.priced[p.id]!.n}`, usd: Math.round(r.priced[p.id]!.monthly) })),
  })),
  note: "cores = load ÷ (rps per core × 0.5); RAM = ceil(cores) × peak RSS × 1.5. Single process, laptop-derived, no database or bandwidth: the figures are relative, not a quote.",
};

// ----------------------------------------------------------------------- write
const out = join("results", "article-blocks");
mkdirSync(out, { recursive: true });
const payloads: Record<string, unknown> = {
  "layer-steps": layerSteps,
  "boot-race": bootRace,
  "noise-floor": noiseFloor,
  "invalid-rps": invalidRps,
  "orders-bloat": ordersBloat,
  boxes,
};
for (const [name, data] of Object.entries(payloads)) {
  writeFileSync(join(out, `${name}.json`), JSON.stringify(data, null, 2) + "\n");
  console.log(`${name}.json`);
}
