# Elysia 2 vs NestJS 12 — results summary

Generated 2026-09-05T11:20:50.787Z from `results/*.json`. Every number here is a median of 3 × 30s bombardier runs after a 5s warm-up unless stated otherwise. RSS/CPU sampled with `ps` every 500 ms; 100 % CPU = one core.

## Environment

| | |
|---|---|
| Date | 2026-09-05T08:40:15.965Z |
| Machine | Apple M4 Pro, 14 cores, 48 GB, macOS 27.0 |
| Bun | 1.4.2+744846f84 |
| Node | v26.3.1 |
| Elysia | 2.0.0-beta.12 |
| NestJS core | 12.0.1 |
| Fastify | 5.12.1 |
| Drizzle | 0.45.2 |
| Postgres | psql (PostgreSQL) 17.10 (Homebrew) (Homebrew, same host) |
| Load generator | bombardier, same host |
| Run order | A → B → C → D |
| Concurrency | 10, 100, 500 |

## Noise floor

Config C, c=100, 5 back-to-back 30s runs per route.

| Route | rps per run | spread (max−min)/min | CV |
|---|---|---|---|
| health | 132,462, 132,844, 133,172, 134,946, 135,879 | 2.6% | 1.0% |
| user | 33,201, 33,353, 33,269, 32,993, 33,014 | 1.1% | 0.4% |

**Significance floor used below: ±2.6%.** A combination with more than 1% non-2xx is marked invalid: its rps counts connection resets, not served requests. Deltas inside the floor are labelled `noise`; between the floor and 10% `small`; 10% and above `real`.

## Throughput, latency, resources — per route

### GET /health — framework overhead

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 98,160 | 0.09 | 0.16 | 0.21 | 0 (0.00%) | 192 | 192 | 100 | 98,648 | 512 |
| B | 10 | 88,491 | 0.10 | 0.18 | 0.24 | 0 (0.00%) | 171 | 172 | 104 | 84,968 | 517 |
| C | 10 | 124,799 | 0.07 | 0.12 | 0.15 | 0 (0.00%) | 64 | 64 | 109 | 114,093 | 1,962 |
| D | 10 | 125,699 | 0.07 | 0.12 | 0.15 | 0 (0.00%) | 55 | 58 | 110 | 114,322 | 2,267 |
| A | 100 | 100,021 | 0.94 | 1.16 | 1.36 | 0 (0.00%) | 183 | 183 | 100 | 100,429 | 547 |
| B | 100 | 89,886 | 1.08 | 1.20 | 1.93 | 0 (0.00%) | 177 | 177 | 102 | 87,872 | 508 |
| C | 100 | 137,311 | 0.74 | 0.79 | 1.35 | 0 (0.00%) | 64 | 64 | 102 | 134,775 | 2,133 |
| D | 100 | 138,283 | 0.73 | 0.79 | 1.35 | 0 (0.00%) | 59 | 59 | 102 | 135,375 | 2,344 |
| A | 500 | 85,120 | 5.91 | 6.54 | 7.11 | 4,024 (0.16%) | 199 | 199 | 100 | 85,525 | 427 |
| B | 500 | 85,527 | 5.70 | 6.42 | 8.46 | 0 (0.00%) | 187 | 187 | 102 | 83,588 | 458 |
| C | 500 | 132,110 | 3.81 | 4.12 | 4.84 | 0 (0.00%) | 65 | 65 | 102 | 129,917 | 2,047 |
| D | 500 | 133,325 | 3.76 | 4.13 | 4.90 | 0 (0.00%) | 59 | 59 | 102 | 130,946 | 2,253 |

### POST /echo — body validation

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 64,994 | 0.14 | 0.25 | 0.30 | 0 (0.00%) | 201 | 201 | 100 | 65,129 | 323 |
| B | 10 | 65,312 | 0.13 | 0.25 | 0.36 | 0 (0.00%) | 199 | 199 | 104 | 62,633 | 328 |
| C | 10 | 109,672 | 0.08 | 0.14 | 0.18 | 0 (0.00%) | 77 | 77 | 107 | 102,070 | 1,420 |
| D | 10 | 106,338 | 0.08 | 0.15 | 0.19 | 0 (0.00%) | 66 | 66 | 108 | 98,766 | 1,605 |
| A | 100 | 63,637 | 1.54 | 1.74 | 2.07 | 0 (0.00%) | 202 | 202 | 100 | 63,793 | 316 |
| B | 100 | 66,725 | 1.42 | 1.70 | 2.44 | 0 (0.00%) | 199 | 199 | 103 | 64,883 | 335 |
| C | 100 | 116,720 | 0.88 | 0.94 | 1.42 | 0 (0.00%) | 78 | 78 | 102 | 114,697 | 1,502 |
| D | 100 | 113,639 | 0.88 | 0.95 | 1.52 | 0 (0.00%) | 66 | 66 | 103 | 110,429 | 1,712 |
| A | 500 | ~~59,321~~ invalid | 8.47 | 9.05 | 9.95 | 30,748 (1.70%) | 204 | 204 | 100 | 59,579 | 290 |
| B | 500 | 64,354 | 7.62 | 8.50 | 9.72 | 0 (0.00%) | 203 | 203 | 103 | 62,496 | 317 |
| C | 500 | 115,852 | 4.43 | 4.78 | 5.34 | 0 (0.00%) | 78 | 78 | 102 | 113,769 | 1,491 |
| D | 500 | 106,242 | 4.66 | 5.11 | 5.90 | 0 (0.00%) | 66 | 66 | 102 | 104,195 | 1,600 |

### GET /me — JWT guard + DB read

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 14,766 | 0.65 | 0.77 | 1.17 | 0 (0.00%) | 210 | 210 | 123 | 12,046 | 70 |
| B | 10 | 22,774 | 0.41 | 0.54 | 1.23 | 0 (0.00%) | 244 | 244 | 128 | 17,817 | 93 |
| C | 10 | 25,479 | 0.36 | 0.48 | 1.00 | 0 (0.00%) | 108 | 108 | 131 | 19,426 | 235 |
| D | 10 | 24,039 | 0.38 | 0.51 | 1.10 | 0 (0.00%) | 97 | 97 | 133 | 18,122 | 248 |
| A | 100 | 14,906 | 6.64 | 7.30 | 7.96 | 0 (0.00%) | 256 | 303 | 115 | 12,996 | 58 |
| B | 100 | 23,106 | 4.12 | 5.29 | 7.46 | 0 (0.00%) | 250 | 250 | 132 | 17,441 | 93 |
| C | 100 | 26,702 | 3.60 | 4.46 | 6.03 | 0 (0.00%) | 114 | 115 | 140 | 19,080 | 234 |
| D | 100 | 25,121 | 3.83 | 4.75 | 6.84 | 0 (0.00%) | 112 | 112 | 141 | 17,803 | 224 |
| A | 500 | 14,046 | 35.43 | 37.31 | 40.62 | 1,176 (0.28%) | 311 | 326 | 123 | 11,449 | 45 |
| B | 500 | 21,878 | 22.58 | 25.94 | 31.35 | 0 (0.00%) | 268 | 268 | 138 | 15,868 | 82 |
| C | 500 | 25,599 | 19.42 | 21.68 | 24.22 | 15 (0.00%) | 128 | 129 | 145 | 17,631 | 199 |
| D | 500 | 23,770 | 20.84 | 23.11 | 26.02 | 0 (0.00%) | 116 | 117 | 148 | 16,108 | 204 |

### GET /users/:id — single-row read

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 17,194 | 0.56 | 0.67 | 0.98 | 0 (0.00%) | 260 | 274 | 107 | 16,049 | 66 |
| B | 10 | 27,555 | 0.35 | 0.43 | 1.06 | 0 (0.00%) | 270 | 270 | 106 | 26,104 | 102 |
| C | 10 | 32,816 | 0.29 | 0.35 | 0.81 | 0 (0.00%) | 132 | 132 | 107 | 30,595 | 248 |
| D | 10 | 30,454 | 0.31 | 0.38 | 0.90 | 0 (0.00%) | 119 | 119 | 109 | 27,948 | 255 |
| A | 100 | 16,634 | 5.95 | 6.46 | 7.08 | 0 (0.00%) | 282 | 293 | 107 | 15,495 | 59 |
| B | 100 | 29,608 | 3.20 | 4.26 | 5.62 | 0 (0.00%) | 271 | 271 | 110 | 27,013 | 109 |
| C | 100 | 34,038 | 2.79 | 3.55 | 4.81 | 0 (0.00%) | 133 | 133 | 112 | 30,273 | 256 |
| D | 100 | 32,390 | 2.94 | 3.75 | 5.01 | 0 (0.00%) | 119 | 119 | 114 | 28,313 | 271 |
| A | 500 | 16,767 | 29.54 | 31.68 | 34.68 | 504 (0.10%) | 313 | 318 | 115 | 14,617 | 54 |
| B | 500 | 27,757 | 17.78 | 20.38 | 23.79 | 0 (0.00%) | 272 | 273 | 114 | 24,378 | 102 |
| C | 500 | 33,117 | 14.97 | 16.78 | 20.78 | 0 (0.00%) | 144 | 144 | 118 | 28,094 | 230 |
| D | 500 | 30,839 | 16.06 | 17.90 | 22.44 | 0 (0.00%) | 121 | 121 | 121 | 25,452 | 256 |

### GET /users?page=7&limit=20 — 20-row list

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 11,434 | 0.76 | 0.95 | 1.58 | 0 (0.00%) | 223 | 231 | 97 | 11,760 | 51 |
| B | 10 | 20,564 | 0.45 | 0.56 | 1.36 | 0 (0.00%) | 279 | 279 | 103 | 20,034 | 74 |
| C | 10 | 23,063 | 0.39 | 0.52 | 1.13 | 0 (0.00%) | 160 | 161 | 106 | 21,804 | 144 |
| D | 10 | 21,402 | 0.41 | 0.63 | 1.36 | 0 (0.00%) | 124 | 125 | 105 | 20,449 | 172 |
| A | 100 | 12,243 | 7.98 | 8.80 | 12.07 | 0 (0.00%) | 233 | 242 | 106 | 11,535 | 53 |
| B | 100 | 21,641 | 4.36 | 5.98 | 8.75 | 0 (0.00%) | 279 | 280 | 115 | 18,817 | 77 |
| C | 100 | 24,795 | 3.91 | 4.98 | 6.75 | 0 (0.00%) | 163 | 165 | 120 | 20,720 | 152 |
| D | 100 | 24,094 | 4.03 | 5.24 | 7.10 | 0 (0.00%) | 125 | 125 | 123 | 19,668 | 193 |
| A | 500 | 11,600 | 42.58 | 46.06 | 50.75 | 502 (0.15%) | 313 | 317 | 128 | 9,095 | 37 |
| B | 500 | 20,929 | 23.62 | 28.03 | 33.58 | 0 (0.00%) | 282 | 282 | 118 | 17,702 | 74 |
| C | 500 | 23,974 | 20.63 | 24.14 | 29.55 | 0 (0.00%) | 165 | 165 | 129 | 18,579 | 146 |
| D | 500 | 23,249 | 21.36 | 24.95 | 30.03 | 0 (0.00%) | 127 | 127 | 131 | 17,712 | 183 |

### POST /orders — validated insert — main-run rows depend on run order (table bloat); see the fresh-table section

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 12,801 | 0.74 | 1.02 | 1.67 | 0 (0.00%) | 277 | 278 | 93 | 13,764 | 46 |
| B | 10 | 18,599 | 0.43 | 0.80 | 2.03 | 0 (0.00%) | 288 | 288 | 91 | 20,441 | 65 |
| C | 10 | 20,261 | 0.39 | 0.75 | 1.98 | 0 (0.00%) | 168 | 168 | 90 | 22,530 | 121 |
| D | 10 | 11,877 | 0.48 | 2.22 | 3.23 | 0 (0.00%) | 134 | 134 | 60 | 19,814 | 89 |
| A | 100 | 13,395 | 7.17 | 8.55 | 11.46 | 0 (0.00%) | 292 | 300 | 103 | 13,013 | 46 |
| B | 100 | 22,336 | 4.01 | 6.07 | 11.48 | 0 (0.00%) | 288 | 288 | 102 | 21,828 | 78 |
| C | 100 | 15,473 | 4.95 | 11.24 | 18.96 | 0 (0.00%) | 153 | 154 | 73 | 21,205 | 101 |
| D | 100 | 15,427 | 5.99 | 10.58 | 16.14 | 0 (0.00%) | 134 | 134 | 73 | 21,255 | 115 |
| A | 500 | 12,662 | 38.67 | 44.40 | 56.39 | 987 (0.25%) | 312 | 318 | 108 | 11,742 | 41 |
| B | 500 | 13,257 | 39.33 | 51.55 | 70.25 | 11 (0.00%) | 290 | 290 | 80 | 16,588 | 46 |
| C | 500 | 17,811 | 19.68 | 43.69 | 129.53 | 66 (0.01%) | 157 | 158 | 87 | 20,402 | 113 |
| D | 500 | 17,108 | 18.04 | 46.71 | 143.35 | 509 (0.12%) | 136 | 141 | 79 | 21,664 | 126 |

### GET /cpu?n=15000 — SHA-256 loop, runtime only

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 192 | 46.78 | 90.78 | 95.47 | 0 (0.00%) | 302 | 302 | 99 | 193 | 1 |
| B | 10 | 179 | 50.60 | 93.17 | 107.39 | 0 (0.00%) | 303 | 303 | 111 | 161 | 1 |
| C | 10 | 180 | 50.14 | 95.75 | 105.24 | 0 (0.00%) | 164 | 164 | 116 | 155 | 1 |
| D | 10 | 201 | 44.86 | 81.73 | 96.71 | 0 (0.00%) | 142 | 142 | 119 | 168 | 1 |
| A | 100 | ~~31,180~~ invalid | 0.59 | 2.32 | 7.47 | 910,605 (99.47%) | 263 | 301 | 90 | 34,796 | 119 |
| B | 100 | 178 | 561.21 | 582.35 | 667.21 | 0 (0.00%) | 303 | 303 | 111 | 161 | 1 |
| C | 100 | 178 | 556.51 | 582.86 | 653.34 | 0 (0.00%) | 164 | 164 | 116 | 153 | 1 |
| D | 100 | 195 | 501.69 | 541.46 | 655.91 | 0 (0.00%) | 142 | 142 | 119 | 164 | 1 |
| A | 500 | ~~39,150~~ invalid | 4.47 | 34.06 | 114.88 | 1,152,875 (99.65%) | 305 | 305 | 82 | 48,023 | 128 |
| B | 500 | ~~33,600~~ invalid | 3.01 | 19.07 | 60.43 | 982,332 (99.90%) | 260 | 260 | 93 | 36,049 | 129 |
| C | 500 | ~~33,257~~ invalid | 2.79 | 14.07 | 95.98 | 973,843 (99.86%) | 145 | 164 | 92 | 35,997 | 229 |
| D | 500 | ~~37,891~~ invalid | 2.86 | 14.08 | 51.72 | 1,101,663 (99.91%) | 142 | 142 | 94 | 40,470 | 267 |

## Layer attribution at c=100

Each step changes one layer. `noise` = inside ±2.6%.

| Route | Step | rps | Δ rps | verdict | mean RSS | Δ RSS | p99 | Δ p99 | rps/core | Δ rps/core |
|---|---|---|---|---|---|---|---|---|---|---|
| health | A→B runtime: Node → Bun (+ native SQL driver) | 100,021 → 89,886 | -10.1% | real | 183 → 177 MB | -3.2% | 1.36 → 1.93 | +42.6% | 100,429 → 87,872 | -12.5% |
| health | B→C framework: Nest+Fastify → Elysia 2 | 89,886 → 137,311 | +52.8% | real | 177 → 64 MB | -63.6% | 1.93 → 1.35 | -30.4% | 87,872 → 134,775 | +53.4% |
| health | C→D build: JIT → AOT | 137,311 → 138,283 | +0.7% | noise | 64 → 59 MB | -8.3% | 1.35 → 1.35 | +0.6% | 134,775 → 135,375 | +0.4% |
| health | A→D total: A → D | 100,021 → 138,283 | +38.3% | real | 183 → 59 MB | -67.7% | 1.36 → 1.35 | -0.1% | 100,429 → 135,375 | +34.8% |
| echo | A→B runtime: Node → Bun (+ native SQL driver) | 63,637 → 66,725 | +4.9% | small | 202 → 199 MB | -1.2% | 2.07 → 2.44 | +18.3% | 63,793 → 64,883 | +1.7% |
| echo | B→C framework: Nest+Fastify → Elysia 2 | 66,725 → 116,720 | +74.9% | real | 199 → 78 MB | -61.0% | 2.44 → 1.42 | -41.9% | 64,883 → 114,697 | +76.8% |
| echo | C→D build: JIT → AOT | 116,720 → 113,639 | -2.6% | small | 78 → 66 MB | -14.6% | 1.42 → 1.52 | +6.8% | 114,697 → 110,429 | -3.7% |
| echo | A→D total: A → D | 63,637 → 113,639 | +78.6% | real | 202 → 66 MB | -67.1% | 2.07 → 1.52 | -26.6% | 63,793 → 110,429 | +73.1% |
| me | A→B runtime: Node → Bun (+ native SQL driver) | 14,906 → 23,106 | +55.0% | real | 256 → 250 MB | -2.6% | 7.96 → 7.46 | -6.3% | 12,996 → 17,441 | +34.2% |
| me | B→C framework: Nest+Fastify → Elysia 2 | 23,106 → 26,702 | +15.6% | real | 250 → 114 MB | -54.2% | 7.46 → 6.03 | -19.1% | 17,441 → 19,080 | +9.4% |
| me | C→D build: JIT → AOT | 26,702 → 25,121 | -5.9% | small | 114 → 112 MB | -1.9% | 6.03 → 6.84 | +13.4% | 19,080 → 17,803 | -6.7% |
| me | A→D total: A → D | 14,906 → 25,121 | +68.5% | real | 256 → 112 MB | -56.2% | 7.96 → 6.84 | -14.1% | 12,996 → 17,803 | +37.0% |
| user | A→B runtime: Node → Bun (+ native SQL driver) | 16,634 → 29,608 | +78.0% | real | 282 → 271 MB | -4.0% | 7.08 → 5.62 | -20.6% | 15,495 → 27,013 | +74.3% |
| user | B→C framework: Nest+Fastify → Elysia 2 | 29,608 → 34,038 | +15.0% | real | 271 → 133 MB | -50.9% | 5.62 → 4.81 | -14.5% | 27,013 → 30,273 | +12.1% |
| user | C→D build: JIT → AOT | 34,038 → 32,390 | -4.8% | small | 133 → 119 MB | -10.2% | 4.81 → 5.01 | +4.2% | 30,273 → 28,313 | -6.5% |
| user | A→D total: A → D | 16,634 → 32,390 | +94.7% | real | 282 → 119 MB | -57.7% | 7.08 → 5.01 | -29.3% | 15,495 → 28,313 | +82.7% |
| list | A→B runtime: Node → Bun (+ native SQL driver) | 12,243 → 21,641 | +76.8% | real | 233 → 279 MB | +19.8% | 12.07 → 8.75 | -27.5% | 11,535 → 18,817 | +63.1% |
| list | B→C framework: Nest+Fastify → Elysia 2 | 21,641 → 24,795 | +14.6% | real | 279 → 163 MB | -41.6% | 8.75 → 6.75 | -22.8% | 18,817 → 20,720 | +10.1% |
| list | C→D build: JIT → AOT | 24,795 → 24,094 | -2.8% | small | 163 → 125 MB | -23.4% | 6.75 → 7.10 | +5.1% | 20,720 → 19,668 | -5.1% |
| list | A→D total: A → D | 12,243 → 24,094 | +96.8% | real | 233 → 125 MB | -46.3% | 12.07 → 7.10 | -41.2% | 11,535 → 19,668 | +70.5% |
| order (fresh table) | A→B runtime: Node → Bun (+ native SQL driver) | 12,287 → 24,251 | +97.4% | real | 285 → 212 MB | -25.4% | 14.00 → 10.40 | -25.7% | 12,315 → 23,240 | +88.7% |
| order (fresh table) | B→C framework: Nest+Fastify → Elysia 2 | 24,251 → 27,327 | +12.7% | real | 212 → 120 MB | -43.7% | 10.40 → 10.08 | -3.1% | 23,240 → 25,398 | +9.3% |
| order (fresh table) | C→D build: JIT → AOT | 27,327 → 29,094 | +6.5% | small | 120 → 103 MB | -14.0% | 10.08 → 7.28 | -27.7% | 25,398 → 26,149 | +3.0% |
| order (fresh table) | A→D total: A → D | 12,287 → 29,094 | +136.8% | real | 285 → 103 MB | -63.9% | 14.00 → 7.28 | -48.0% | 12,315 → 26,149 | +112.3% |
| cpu | A→B runtime: Node → Bun (+ native SQL driver) | 31,180 → 178 | -99.4% | invalid (errors) | 263 → 303 MB | +15.4% | 7.47 → 667.21 | +8830.7% | 34,796 → 161 | -99.5% |
| cpu | B→C framework: Nest+Fastify → Elysia 2 | 178 → 178 | -0.4% | noise | 303 → 164 MB | -45.9% | 667.21 → 653.34 | -2.1% | 161 → 153 | -4.8% |
| cpu | C→D build: JIT → AOT | 178 → 195 | +10.0% | real | 164 → 142 MB | -13.3% | 653.34 → 655.91 | +0.4% | 153 → 164 | +7.1% |
| cpu | A→D total: A → D | 31,180 → 195 | -99.4% | invalid (errors) | 263 → 142 MB | -45.9% | 7.47 → 655.91 | +8679.4% | 34,796 → 164 | -99.5% |

## Layer attribution at c=500

Each step changes one layer. `noise` = inside ±2.6%.

| Route | Step | rps | Δ rps | verdict | mean RSS | Δ RSS | p99 | Δ p99 | rps/core | Δ rps/core |
|---|---|---|---|---|---|---|---|---|---|---|
| health | A→B runtime: Node → Bun (+ native SQL driver) | 85,120 → 85,527 | +0.5% | noise | 199 → 187 MB | -6.3% | 7.11 → 8.46 | +19.1% | 85,525 → 83,588 | -2.3% |
| health | B→C framework: Nest+Fastify → Elysia 2 | 85,527 → 132,110 | +54.5% | real | 187 → 65 MB | -65.4% | 8.46 → 4.84 | -42.8% | 83,588 → 129,917 | +55.4% |
| health | C→D build: JIT → AOT | 132,110 → 133,325 | +0.9% | noise | 65 → 59 MB | -8.3% | 4.84 → 4.90 | +1.2% | 129,917 → 130,946 | +0.8% |
| health | A→D total: A → D | 85,120 → 133,325 | +56.6% | real | 199 → 59 MB | -70.3% | 7.11 → 4.90 | -31.1% | 85,525 → 130,946 | +53.1% |
| echo | A→B runtime: Node → Bun (+ native SQL driver) | 59,321 → 64,354 | +8.5% | invalid (errors) | 204 → 203 MB | -0.6% | 9.95 → 9.72 | -2.3% | 59,579 → 62,496 | +4.9% |
| echo | B→C framework: Nest+Fastify → Elysia 2 | 64,354 → 115,852 | +80.0% | real | 203 → 78 MB | -61.7% | 9.72 → 5.34 | -45.0% | 62,496 → 113,769 | +82.0% |
| echo | C→D build: JIT → AOT | 115,852 → 106,242 | -8.3% | small | 78 → 66 MB | -14.5% | 5.34 → 5.90 | +10.5% | 113,769 → 104,195 | -8.4% |
| echo | A→D total: A → D | 59,321 → 106,242 | +79.1% | invalid (errors) | 204 → 66 MB | -67.5% | 9.95 → 5.90 | -40.7% | 59,579 → 104,195 | +74.9% |
| me | A→B runtime: Node → Bun (+ native SQL driver) | 14,046 → 21,878 | +55.8% | real | 311 → 268 MB | -13.8% | 40.62 → 31.35 | -22.8% | 11,449 → 15,868 | +38.6% |
| me | B→C framework: Nest+Fastify → Elysia 2 | 21,878 → 25,599 | +17.0% | real | 268 → 128 MB | -52.1% | 31.35 → 24.22 | -22.7% | 15,868 → 17,631 | +11.1% |
| me | C→D build: JIT → AOT | 25,599 → 23,770 | -7.1% | small | 128 → 116 MB | -9.5% | 24.22 → 26.02 | +7.4% | 17,631 → 16,108 | -8.6% |
| me | A→D total: A → D | 14,046 → 23,770 | +69.2% | real | 311 → 116 MB | -62.7% | 40.62 → 26.02 | -35.9% | 11,449 → 16,108 | +40.7% |
| user | A→B runtime: Node → Bun (+ native SQL driver) | 16,767 → 27,757 | +65.5% | real | 313 → 272 MB | -12.8% | 34.68 → 23.79 | -31.4% | 14,617 → 24,378 | +66.8% |
| user | B→C framework: Nest+Fastify → Elysia 2 | 27,757 → 33,117 | +19.3% | real | 272 → 144 MB | -47.3% | 23.79 → 20.78 | -12.6% | 24,378 → 28,094 | +15.2% |
| user | C→D build: JIT → AOT | 33,117 → 30,839 | -6.9% | small | 144 → 121 MB | -16.1% | 20.78 → 22.44 | +8.0% | 28,094 → 25,452 | -9.4% |
| user | A→D total: A → D | 16,767 → 30,839 | +83.9% | real | 313 → 121 MB | -61.4% | 34.68 → 22.44 | -35.3% | 14,617 → 25,452 | +74.1% |
| list | A→B runtime: Node → Bun (+ native SQL driver) | 11,600 → 20,929 | +80.4% | real | 313 → 282 MB | -10.2% | 50.75 → 33.58 | -33.8% | 9,095 → 17,702 | +94.6% |
| list | B→C framework: Nest+Fastify → Elysia 2 | 20,929 → 23,974 | +14.5% | real | 282 → 165 MB | -41.5% | 33.58 → 29.55 | -12.0% | 17,702 → 18,579 | +5.0% |
| list | C→D build: JIT → AOT | 23,974 → 23,249 | -3.0% | small | 165 → 127 MB | -22.8% | 29.55 → 30.03 | +1.6% | 18,579 → 17,712 | -4.7% |
| list | A→D total: A → D | 11,600 → 23,249 | +100.4% | real | 313 → 127 MB | -59.4% | 50.75 → 30.03 | -40.8% | 9,095 → 17,712 | +94.7% |
| order | A→B runtime: Node → Bun (+ native SQL driver) | 12,662 → 13,257 | +4.7% | small | 312 → 290 MB | -6.9% | 56.39 → 70.25 | +24.6% | 11,742 → 16,588 | +41.3% |
| order | B→C framework: Nest+Fastify → Elysia 2 | 13,257 → 17,811 | +34.3% | real | 290 → 157 MB | -45.7% | 70.25 → 129.53 | +84.4% | 16,588 → 20,402 | +23.0% |
| order | C→D build: JIT → AOT | 17,811 → 17,108 | -3.9% | small | 157 → 136 MB | -13.5% | 129.53 → 143.35 | +10.7% | 20,402 → 21,664 | +6.2% |
| order | A→D total: A → D | 12,662 → 17,108 | +35.1% | real | 312 → 136 MB | -56.3% | 56.39 → 143.35 | +154.2% | 11,742 → 21,664 | +84.5% |
| cpu | A→B runtime: Node → Bun (+ native SQL driver) | 39,150 → 33,600 | -14.2% | invalid (errors) | 305 → 260 MB | -14.7% | 114.88 → 60.43 | -47.4% | 48,023 → 36,049 | -24.9% |
| cpu | B→C framework: Nest+Fastify → Elysia 2 | 33,600 → 33,257 | -1.0% | invalid (errors) | 260 → 145 MB | -44.1% | 60.43 → 95.98 | +58.8% | 36,049 → 35,997 | -0.1% |
| cpu | C→D build: JIT → AOT | 33,257 → 37,891 | +13.9% | invalid (errors) | 145 → 142 MB | -2.2% | 95.98 → 51.72 | -46.1% | 35,997 → 40,470 | +12.4% |
| cpu | A→D total: A → D | 39,150 → 37,891 | -3.2% | invalid (errors) | 305 → 142 MB | -53.4% | 114.88 → 51.72 | -55.0% | 48,023 → 40,470 | -15.7% |

## POST /orders with a freshly vacuumed table, c=100

Each config got `VACUUM (FULL, ANALYZE) orders` and a 200,000-row table before its 3 × 30 s. This replaces the main-run `/orders` numbers, which depended on which config ran first.

| Config | rps | p99 ms | mean RSS MB | mean CPU % | rps/core | dead tuples before → after | non-2xx |
|---|---|---|---|---|---|---|---|
| A | 12,287 | 14.00 | 285 | 100 | 12,315 | 0 → 0 | 0 |
| B | 24,251 | 10.40 | 212 | 104 | 23,240 | 1,191,286 → 0 | 0 |
| C | 27,327 | 10.08 | 120 | 108 | 25,398 | 0 → 0 | 0 |
| D | 29,094 | 7.28 | 103 | 111 | 26,149 | 0 → 0 | 0 |

## Machine drift check

Config A (Node, untouched by the Bun upgrade) re-measured after the afternoon pass, c=100, 3 × 30 s, against its morning medians.

| Route | morning rps | afternoon rps | Δ | verdict | foreign CPU during afternoon run |
|---|---|---|---|---|---|
| health | 100,021 | 97,251 | -2.8% | small | 220% |
| user | 16,634 | 17,716 | +6.5% | small | 386% |
| order | 13,395 | 13,173 | -1.7% | noise | 423% |

## Idle memory and startup

| Config | idle RSS MB (bench run) | boot→healthy ms (bench run, 1 sample) | boot→healthy ms (median of 10) | first request ms (median) |
|---|---|---|---|---|
| A | 196.4 | 972 | 405 | 17.53 |
| B | 90.0 | 278 | 186 | 13.60 |
| C | 38.8 | 206 | 94 | 17.78 |
| D | 33.4 | 46 | 44 | 15.62 |

## Developer-experience measurements

| Metric | Elysia 2 (Bun) | NestJS 12 (npm/Node) |
|---|---|---|
| fresh install (lockfile) | 0.1 s | 2.3 s |
| node_modules size | 55 MB | 208 MB |
| packages in node_modules | 16 | 365 |
| direct deps (runtime / dev) | 4 / 2 | 10 / 14 |
| production build (median of 3) | 17 ms (bundle); AOT 122 ms | 434 ms (SWC, unbundled) |
| dist size | 772 KB; AOT 1,332 KB | 40 KB |
| tsc --noEmit (median of 3) | 0.7 s | 0.7 s |
| watch-mode reload (median of 5) | 64 ms | 738 ms |
| app source LOC / files | 100 / 6 | 205 / 10 |
| config files at app root | package.json tsconfig.json | .prettierrc .swcrc nest-cli.json oxlint.json package.json tsconfig.json vitest.config.e2e.ts vitest.config.ts |

## Sensitivity runs (c=100)

| Route | Pair | rps | Δ rps | verdict | mean RSS | Δ RSS |
|---|---|---|---|---|---|---|
| echo | B→B-pgjs Bun runtime: bun-sql → postgres.js | 66,725 → 75,650 | +13.4% | real | 199 → 175 MB | -12.4% |
| me | B→B-pgjs Bun runtime: bun-sql → postgres.js | 23,106 → 16,073 | -30.4% | real | 250 → 244 MB | -2.3% |
| user | B→B-pgjs Bun runtime: bun-sql → postgres.js | 29,608 → 21,192 | -28.4% | real | 271 → 244 MB | -9.7% |
| list | B→B-pgjs Bun runtime: bun-sql → postgres.js | 21,641 → 15,135 | -30.1% | real | 279 → 245 MB | -12.4% |
| order | B→B-pgjs Bun runtime: bun-sql → postgres.js | 22,336 → 13,547 | -39.3% | real | 288 → 248 MB | -14.0% |
| echo | A→A-typebox Node: Zod → TypeBox validator | 63,637 → 67,659 | +6.3% | small | 202 → 198 MB | -2.0% |
| me | A→A-typebox Node: Zod → TypeBox validator | 14,906 → 13,387 | -10.2% | real | 256 → 238 MB | -7.1% |
| user | A→A-typebox Node: Zod → TypeBox validator | 16,634 → 16,166 | -2.8% | small | 282 → 267 MB | -5.3% |
| list | A→A-typebox Node: Zod → TypeBox validator | 12,243 → 11,610 | -5.2% | small | 233 → 231 MB | -0.7% |
| order | A→A-typebox Node: Zod → TypeBox validator | 13,395 → 12,020 | -10.3% | real | 292 → 282 MB | -3.4% |

## Bun 1.4.1-canary.1+7b0b70ece → 1.4.2+744846f84, same configs

B/C/D were measured twice: first on the canary, then on the 1.4.2 release. Same harness, same order, same day. Deltas at c=100.

| Route | Config | rps canary → 1.4.2 | Δ rps | verdict | mean RSS canary → 1.4.2 | Δ RSS |
|---|---|---|---|---|---|---|
| health | B | 101,592 → 89,886 | -11.5% | real | 167 → 177 MB | +5.7% |
| health | C | 133,374 → 137,311 | +3.0% | small | 65 → 64 MB | -0.2% |
| health | D | 134,928 → 138,283 | +2.5% | noise | 56 → 59 MB | +5.5% |
| echo | B | 72,795 → 66,725 | -8.3% | small | 200 → 199 MB | -0.4% |
| echo | C | 116,528 → 116,720 | +0.2% | noise | 77 → 78 MB | +1.0% |
| echo | D | 104,555 → 113,639 | +8.7% | small | 65 → 66 MB | +2.7% |
| me | B | 23,125 → 23,106 | -0.1% | noise | 224 → 250 MB | +11.5% |
| me | C | 25,673 → 26,702 | +4.0% | small | 128 → 114 MB | -10.5% |
| me | D | 23,105 → 25,121 | +8.7% | small | 94 → 112 MB | +19.2% |
| user | B | 28,994 → 29,608 | +2.1% | noise | 254 → 271 MB | +6.3% |
| user | C | 30,321 → 34,038 | +12.3% | real | 102 → 133 MB | +29.8% |
| user | D | 29,840 → 32,390 | +8.5% | small | 118 → 119 MB | +1.6% |
| list | B | 21,511 → 21,641 | +0.6% | noise | 273 → 279 MB | +2.4% |
| list | C | 22,221 → 24,795 | +11.6% | real | 141 → 163 MB | +15.6% |
| list | D | 23,118 → 24,094 | +4.2% | small | 121 → 125 MB | +3.8% |
| order | B | 13,110 → 22,336 | +70.4% | real | 228 → 288 MB | +26.4% |
| order | C | 15,469 → 15,473 | +0.0% | noise | 151 → 153 MB | +1.9% |
| order | D | 14,626 → 15,427 | +5.5% | small | 135 → 134 MB | -0.8% |
| cpu | B | 180 → 178 | -1.1% | noise | 255 → 303 MB | +19.0% |
| cpu | C | 177 → 178 | +0.5% | noise | 157 → 164 MB | +4.5% |
| cpu | D | 170 → 195 | +14.8% | real | 134 → 142 MB | +5.9% |

## Cost model

Derived from `results.json` (cases me, user, list, order, c=100, medians of 3 × 30 s) and `pricing-snapshot.json` (fetched 2026-09-05, prices in USD).

Formula: cores = load ÷ (rps per core × 0.5); RAM = ceil(cores) × peak RSS × 1.5. For each provider the cheapest plan count that covers both cores and RAM. Single-process figures; no cluster mode, no DB cost, no bandwidth. rps per core = rps ÷ (mean CPU % ÷ 100) measured on the same laptop, so treat the absolute dollar figures as relative, not as a quote.

## 5,000 rps sustained

| Config | rps/core | peak RSS MB | cores needed | Hetzner (EU, shared vCPU) | Fly.io (Machines) | AWS EC2 on-demand us-east-1 (Graviton) |
|---|---|---|---|---|---|---|
| A | 13086 | 303 | 0.76 | CX23 × 1 = $6/mo | shared-cpu-1x 512MB × 1 = $3/mo | t4g.small × 1 = $12/mo |
| B | 21628 | 288 | 0.46 | CX23 × 1 = $6/mo | shared-cpu-1x 512MB × 1 = $3/mo | t4g.small × 1 = $12/mo |
| C | 23868 | 165 | 0.42 | CX23 × 1 = $6/mo | shared-cpu-1x 256MB × 1 = $2/mo | t4g.small × 1 = $12/mo |
| D | 22983 | 134 | 0.44 | CX23 × 1 = $6/mo | shared-cpu-1x 256MB × 1 = $2/mo | t4g.small × 1 = $12/mo |

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
| A | 13086 | 303 | 3.06 | CX33 × 1 = $10/mo | shared-cpu-4x 2GB × 1 = $13/mo | t4g.small × 2 = $25/mo |
| B | 21628 | 288 | 1.85 | CX23 × 1 = $6/mo | shared-cpu-1x 512MB × 2 = $7/mo | t4g.small × 1 = $12/mo |
| C | 23868 | 165 | 1.68 | CX23 × 1 = $6/mo | shared-cpu-1x 256MB × 2 = $4/mo | t4g.small × 1 = $12/mo |
| D | 22983 | 134 | 1.74 | CX23 × 1 = $6/mo | shared-cpu-1x 256MB × 2 = $4/mo | t4g.small × 1 = $12/mo |

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
| A | 13086 | 303 | 7.64 | CX43 × 1 = $18/mo | shared-cpu-4x 2GB × 2 = $27/mo | t4g.small × 4 = $50/mo |
| B | 21628 | 288 | 4.62 | CX43 × 1 = $18/mo | shared-cpu-1x 512MB × 5 = $17/mo | t4g.small × 3 = $37/mo |
| C | 23868 | 165 | 4.19 | CX43 × 1 = $18/mo | shared-cpu-1x 256MB × 5 = $10/mo | t4g.small × 3 = $37/mo |
| D | 22983 | 134 | 4.35 | CX43 × 1 = $18/mo | shared-cpu-1x 256MB × 5 = $10/mo | t4g.small × 3 = $37/mo |

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
| A | 13086 | 303 | 15.28 | CX53 × 1 = $35/mo | shared-cpu-4x 2GB × 4 = $53/mo | t4g.small × 8 = $99/mo |
| B | 21628 | 288 | 9.25 | CX33 × 3 = $30/mo | shared-cpu-1x 512MB × 10 = $33/mo | t4g.small × 5 = $62/mo |
| C | 23868 | 165 | 8.38 | CX33 × 3 = $30/mo | shared-cpu-1x 256MB × 9 = $18/mo | t4g.small × 5 = $62/mo |
| D | 22983 | 134 | 8.70 | CX33 × 3 = $30/mo | shared-cpu-1x 256MB × 9 = $18/mo | t4g.small × 5 = $62/mo |

Same load on one fixed box class per provider (2 vCPU / 4 GB: CAX11, shared-cpu-2x 4GB, t4g.medium):

| Config | CAX11 × n = $/mo | shared-cpu-2x 4GB × n = $/mo | t4g.medium × n = $/mo |
|---|---|---|---|
| A | × 8 = $56 | × 8 = $178 | × 8 = $199 |
| B | × 5 = $35 | × 5 = $111 | × 5 = $124 |
| C | × 5 = $35 | × 5 = $111 | × 5 = $124 |
| D | × 5 = $35 | × 5 = $111 | × 5 = $124 |

