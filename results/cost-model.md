# Cost model

Derived from `results.json` (cases me, user, list, order, c=100, medians of 3 × 30 s) and `pricing-snapshot.json` (fetched 2026-09-05, prices in USD).

Formula: cores = load ÷ (rps per core × 0.5); RAM = ceil(cores) × peak RSS × 1.5. For each provider the cheapest plan count that covers both cores and RAM. Single-process figures; no cluster mode, no DB cost, no bandwidth. rps per core = rps ÷ (mean CPU % ÷ 100) measured on the same laptop, so treat the absolute dollar figures as relative, not as a quote.

## 5,000 rps sustained

| Config | rps/core | peak RSS MB | cores needed | Hetzner (EU, shared vCPU) | Fly.io (Machines) | AWS EC2 on-demand us-east-1 (Graviton) |
|---|---|---|---|---|---|---|
| A | 13978 | 311 | 0.72 | CX23 × 1 = $6/mo | shared-cpu-1x 512MB × 1 = $3/mo | t4g.small × 1 = $12/mo |
| B | 22631 | 327 | 0.44 | CX23 × 1 = $6/mo | shared-cpu-1x 512MB × 1 = $3/mo | t4g.small × 1 = $12/mo |
| C | 24260 | 179 | 0.41 | CX23 × 1 = $6/mo | shared-cpu-1x 512MB × 1 = $3/mo | t4g.small × 1 = $12/mo |
| D | 23967 | 155 | 0.42 | CX23 × 1 = $6/mo | shared-cpu-1x 256MB × 1 = $2/mo | t4g.small × 1 = $12/mo |

Same load on one fixed box class per provider (2 vCPU / 4 GB: CAX11, shared-cpu-2x 4GB, t4g.medium):

| Config | CAX11 × n = $/mo | shared-cpu-2x 4GB × n = $/mo | t4g.medium × n = $/mo |
|---|---|---|---|
| A | × 1 = $7 | × 1 = $22 | × 1 = $25 |
| B | × 1 = $7 | × 1 = $22 | × 1 = $25 |
| C | × 1 = $7 | × 1 = $22 | × 1 = $25 |
| D | × 1 = $7 | × 1 = $22 | × 1 = $25 |

## 20,000 rps sustained

| Config | rps/core | peak RSS MB | cores needed | Hetzner (EU, shared vCPU) | Fly.io (Machines) | AWS EC2 on-demand us-east-1 (Graviton) |
|---|---|---|---|---|---|---|
| A | 13978 | 311 | 2.86 | CX33 × 1 = $10/mo | shared-cpu-1x 512MB × 3 = $10/mo | t4g.small × 2 = $25/mo |
| B | 22631 | 327 | 1.77 | CX23 × 1 = $6/mo | shared-cpu-1x 512MB × 2 = $7/mo | t4g.small × 1 = $12/mo |
| C | 24260 | 179 | 1.65 | CX23 × 1 = $6/mo | shared-cpu-1x 256MB × 3 = $6/mo | t4g.small × 1 = $12/mo |
| D | 23967 | 155 | 1.67 | CX23 × 1 = $6/mo | shared-cpu-1x 256MB × 2 = $4/mo | t4g.small × 1 = $12/mo |

Same load on one fixed box class per provider (2 vCPU / 4 GB: CAX11, shared-cpu-2x 4GB, t4g.medium):

| Config | CAX11 × n = $/mo | shared-cpu-2x 4GB × n = $/mo | t4g.medium × n = $/mo |
|---|---|---|---|
| A | × 2 = $14 | × 2 = $44 | × 2 = $50 |
| B | × 1 = $7 | × 1 = $22 | × 1 = $25 |
| C | × 1 = $7 | × 1 = $22 | × 1 = $25 |
| D | × 1 = $7 | × 1 = $22 | × 1 = $25 |

## 50,000 rps sustained

| Config | rps/core | peak RSS MB | cores needed | Hetzner (EU, shared vCPU) | Fly.io (Machines) | AWS EC2 on-demand us-east-1 (Graviton) |
|---|---|---|---|---|---|---|
| A | 13978 | 311 | 7.15 | CX43 × 1 = $18/mo | shared-cpu-4x 2GB × 2 = $27/mo | t4g.small × 4 = $50/mo |
| B | 22631 | 327 | 4.42 | CX43 × 1 = $18/mo | shared-cpu-1x 512MB × 5 = $17/mo | t4g.small × 3 = $37/mo |
| C | 24260 | 179 | 4.12 | CX43 × 1 = $18/mo | shared-cpu-1x 256MB × 6 = $12/mo | t4g.small × 3 = $37/mo |
| D | 23967 | 155 | 4.17 | CX43 × 1 = $18/mo | shared-cpu-1x 256MB × 5 = $10/mo | t4g.small × 3 = $37/mo |

Same load on one fixed box class per provider (2 vCPU / 4 GB: CAX11, shared-cpu-2x 4GB, t4g.medium):

| Config | CAX11 × n = $/mo | shared-cpu-2x 4GB × n = $/mo | t4g.medium × n = $/mo |
|---|---|---|---|
| A | × 4 = $28 | × 4 = $89 | × 4 = $99 |
| B | × 3 = $21 | × 3 = $67 | × 3 = $74 |
| C | × 3 = $21 | × 3 = $67 | × 3 = $74 |
| D | × 3 = $21 | × 3 = $67 | × 3 = $74 |

## 100,000 rps sustained

| Config | rps/core | peak RSS MB | cores needed | Hetzner (EU, shared vCPU) | Fly.io (Machines) | AWS EC2 on-demand us-east-1 (Graviton) |
|---|---|---|---|---|---|---|
| A | 13978 | 311 | 14.31 | CX53 × 1 = $35/mo | shared-cpu-1x 512MB × 15 = $50/mo | t4g.small × 8 = $99/mo |
| B | 22631 | 327 | 8.84 | CX33 × 3 = $30/mo | shared-cpu-1x 512MB × 9 = $30/mo | t4g.small × 5 = $62/mo |
| C | 24260 | 179 | 8.24 | CX33 × 3 = $30/mo | shared-cpu-1x 256MB × 10 = $20/mo | t4g.small × 5 = $62/mo |
| D | 23967 | 155 | 8.34 | CX33 × 3 = $30/mo | shared-cpu-1x 256MB × 9 = $18/mo | t4g.small × 5 = $62/mo |

Same load on one fixed box class per provider (2 vCPU / 4 GB: CAX11, shared-cpu-2x 4GB, t4g.medium):

| Config | CAX11 × n = $/mo | shared-cpu-2x 4GB × n = $/mo | t4g.medium × n = $/mo |
|---|---|---|---|
| A | × 8 = $56 | × 8 = $178 | × 8 = $199 |
| B | × 5 = $35 | × 5 = $111 | × 5 = $124 |
| C | × 5 = $35 | × 5 = $111 | × 5 = $124 |
| D | × 5 = $35 | × 5 = $111 | × 5 = $124 |

