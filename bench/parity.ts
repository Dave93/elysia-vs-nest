// bench/parity.ts — every config must answer every case identically. Run: bun bench/parity.ts
import { CONFIGS, BASE_URL, startServer } from "./lib";
import { cases, normalize } from "./cases";

const CS = await cases();
const seen: Record<string, { cfg: string; body: string; status: number }> = {};
let bad = 0;

for (const cfg of CONFIGS) {
  const s = await startServer(cfg);
  try {
    for (const c of CS) {
      const res = await fetch(`${BASE_URL}${c.path}`, { method: c.method, headers: c.headers, body: c.body });
      const body = normalize(c.name, await res.text());
      if (res.status !== c.expectStatus) { bad++; console.log(`✗ ${cfg.id} ${c.name}: status ${res.status} != ${c.expectStatus}`); }
      const prev = seen[c.name];
      if (!prev) seen[c.name] = { cfg: cfg.id, body, status: res.status };
      else if (prev.body !== body) { bad++; console.log(`✗ ${cfg.id} ${c.name}: body differs from ${prev.cfg}\n  ${prev.body.slice(0, 160)}\n  ${body.slice(0, 160)}`); }
      else console.log(`✓ ${cfg.id} ${c.name}`);
    }
    const unauth = await fetch(`${BASE_URL}/me`);
    if (unauth.status !== 401) { bad++; console.log(`✗ ${cfg.id} /me without token: ${unauth.status}`); }
  } finally {
    await s.stop();
  }
}
if (bad) { console.error(`${bad} parity failures`); process.exit(1); }
console.log("parity OK across", CONFIGS.map((c) => c.id).join(", "));
