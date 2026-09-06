# Elysia 2 vs NestJS 12 — results summary

Generated 2026-09-06T08:03:32.793Z from `results/*.json`. Every number here is a median of 3 × 30s bombardier runs after a 5s warm-up unless stated otherwise. RSS/CPU sampled with `ps` every 500 ms; 100 % CPU = one core.

## Environment

| | |
|---|---|
| Date | 2026-09-06T05:06:27.713Z |
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
| health | 137,941, 139,556, 138,919, 139,289, 139,109 | 1.2% | 0.4% |
| user | 34,161, 34,194, 33,905, 34,218, 34,103 | 0.9% | 0.3% |

**Significance floor used below: ±1.2%.** A combination with more than 1% non-2xx is marked invalid: its rps counts connection resets, not served requests. Deltas inside the floor are labelled `noise`; between the floor and 10% `small`; 10% and above `real`.

## Throughput, latency, resources — per route

### GET /health — framework overhead

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 101,971 | 0.08 | 0.15 | 0.20 | 0 (0.00%) | 189 | 189 | 100 | 102,429 | 540 |
| B | 10 | 99,958 | 0.09 | 0.15 | 0.21 | 0 (0.00%) | 155 | 155 | 106 | 94,719 | 647 |
| C | 10 | 128,230 | 0.07 | 0.12 | 0.15 | 0 (0.00%) | 62 | 62 | 110 | 116,275 | 2,068 |
| D | 10 | 127,719 | 0.07 | 0.12 | 0.15 | 0 (0.00%) | 55 | 55 | 110 | 115,653 | 2,338 |
| A | 100 | 103,273 | 0.92 | 1.14 | 1.33 | 0 (0.00%) | 182 | 182 | 100 | 103,737 | 566 |
| B | 100 | 103,238 | 0.90 | 1.10 | 1.68 | 0 (0.00%) | 168 | 168 | 104 | 99,688 | 615 |
| C | 100 | 142,261 | 0.72 | 0.79 | 1.28 | 0 (0.00%) | 62 | 62 | 103 | 138,541 | 2,293 |
| D | 100 | 141,430 | 0.72 | 0.79 | 1.28 | 0 (0.00%) | 55 | 55 | 103 | 137,295 | 2,577 |
| A | 500 | 94,272 | 5.14 | 6.00 | 6.52 | 12,370 (0.44%) | 198 | 198 | 99 | 94,750 | 476 |
| B | 500 | 101,014 | 4.91 | 5.62 | 6.22 | 0 (0.00%) | 176 | 176 | 103 | 97,710 | 575 |
| C | 500 | 141,309 | 3.54 | 3.89 | 4.47 | 0 (0.00%) | 62 | 62 | 102 | 138,387 | 2,275 |
| D | 500 | 140,549 | 3.56 | 3.90 | 4.44 | 0 (0.00%) | 55 | 55 | 103 | 137,040 | 2,554 |

### POST /echo — body validation

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 65,506 | 0.14 | 0.25 | 0.29 | 0 (0.00%) | 201 | 201 | 100 | 65,644 | 326 |
| B | 10 | 74,545 | 0.12 | 0.21 | 0.27 | 0 (0.00%) | 195 | 195 | 105 | 71,094 | 382 |
| C | 10 | 115,263 | 0.08 | 0.14 | 0.18 | 0 (0.00%) | 76 | 76 | 108 | 107,044 | 1,510 |
| D | 10 | 115,562 | 0.08 | 0.14 | 0.18 | 0 (0.00%) | 65 | 65 | 108 | 106,528 | 1,774 |
| A | 100 | 66,660 | 1.48 | 1.61 | 1.90 | 0 (0.00%) | 202 | 202 | 100 | 66,734 | 330 |
| B | 100 | 75,332 | 1.27 | 1.46 | 2.16 | 0 (0.00%) | 196 | 196 | 104 | 72,730 | 384 |
| C | 100 | 121,033 | 0.85 | 0.93 | 1.41 | 0 (0.00%) | 77 | 77 | 102 | 118,148 | 1,577 |
| D | 100 | 121,644 | 0.84 | 0.92 | 1.41 | 0 (0.00%) | 65 | 65 | 103 | 117,830 | 1,860 |
| A | 500 | 60,882 | 8.23 | 8.73 | 9.18 | 14,245 (0.78%) | 213 | 213 | 100 | 60,798 | 286 |
| B | 500 | 72,839 | 6.83 | 7.56 | 8.10 | 0 (0.00%) | 201 | 201 | 104 | 70,221 | 362 |
| C | 500 | 119,573 | 4.24 | 4.62 | 5.12 | 0 (0.00%) | 77 | 77 | 102 | 117,258 | 1,556 |
| D | 500 | 120,192 | 4.22 | 4.59 | 5.12 | 0 (0.00%) | 66 | 66 | 103 | 116,840 | 1,834 |

### GET /me — JWT guard + DB read

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 15,155 | 0.64 | 0.73 | 1.10 | 0 (0.00%) | 273 | 292 | 114 | 13,304 | 55 |
| B | 10 | 24,321 | 0.37 | 0.52 | 1.19 | 0 (0.00%) | 223 | 223 | 129 | 18,838 | 109 |
| C | 10 | 26,427 | 0.36 | 0.46 | 0.93 | 0 (0.00%) | 115 | 115 | 132 | 19,958 | 230 |
| D | 10 | 25,848 | 0.36 | 0.47 | 0.97 | 0 (0.00%) | 105 | 106 | 133 | 19,398 | 245 |
| A | 100 | 14,923 | 6.60 | 7.25 | 7.93 | 0 (0.00%) | 271 | 293 | 115 | 13,027 | 55 |
| B | 100 | 24,564 | 3.92 | 4.99 | 6.82 | 0 (0.00%) | 240 | 241 | 134 | 18,343 | 102 |
| C | 100 | 27,168 | 3.55 | 4.36 | 5.80 | 0 (0.00%) | 129 | 129 | 140 | 19,412 | 211 |
| D | 100 | 26,748 | 3.63 | 4.35 | 5.80 | 0 (0.00%) | 111 | 111 | 141 | 18,914 | 241 |
| A | 500 | 14,056 | 35.39 | 37.24 | 40.00 | 1,163 (0.28%) | 318 | 326 | 122 | 11,501 | 44 |
| B | 500 | 23,575 | 21.17 | 23.75 | 26.41 | 53 (0.01%) | 266 | 267 | 138 | 17,055 | 88 |
| C | 500 | 26,119 | 19.07 | 21.03 | 23.50 | 23 (0.00%) | 145 | 145 | 146 | 17,909 | 180 |
| D | 500 | 26,178 | 19.09 | 20.86 | 22.56 | 26 (0.00%) | 120 | 120 | 148 | 17,706 | 219 |

### GET /users/:id — single-row read

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 18,164 | 0.54 | 0.61 | 0.90 | 0 (0.00%) | 282 | 285 | 106 | 17,076 | 64 |
| B | 10 | 29,836 | 0.32 | 0.39 | 1.02 | 0 (0.00%) | 270 | 270 | 106 | 28,073 | 111 |
| C | 10 | 33,830 | 0.28 | 0.34 | 0.80 | 0 (0.00%) | 150 | 150 | 109 | 30,990 | 226 |
| D | 10 | 33,460 | 0.29 | 0.34 | 0.77 | 0 (0.00%) | 127 | 128 | 109 | 30,602 | 264 |
| A | 100 | 18,173 | 5.39 | 5.95 | 6.50 | 0 (0.00%) | 289 | 309 | 108 | 16,893 | 63 |
| B | 100 | 30,871 | 3.10 | 4.08 | 5.34 | 0 (0.00%) | 272 | 272 | 110 | 28,102 | 114 |
| C | 100 | 34,807 | 2.75 | 3.44 | 4.43 | 0 (0.00%) | 153 | 153 | 113 | 30,822 | 228 |
| D | 100 | 34,538 | 2.79 | 3.41 | 4.35 | 0 (0.00%) | 129 | 129 | 114 | 30,275 | 268 |
| A | 500 | 16,965 | 29.27 | 30.82 | 33.44 | 445 (0.09%) | 316 | 329 | 116 | 14,661 | 54 |
| B | 500 | 29,348 | 17.02 | 18.96 | 21.32 | 0 (0.00%) | 284 | 284 | 114 | 25,757 | 103 |
| C | 500 | 33,500 | 14.91 | 16.31 | 17.68 | 0 (0.00%) | 155 | 155 | 118 | 28,383 | 217 |
| D | 500 | 33,661 | 14.84 | 16.36 | 19.31 | 8 (0.00%) | 135 | 136 | 122 | 27,663 | 249 |

### GET /users?page=7&limit=20 — 20-row list

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 12,973 | 0.75 | 0.88 | 1.13 | 0 (0.00%) | 236 | 244 | 106 | 12,223 | 55 |
| B | 10 | 22,353 | 0.43 | 0.50 | 1.19 | 0 (0.00%) | 293 | 293 | 105 | 21,220 | 76 |
| C | 10 | 24,456 | 0.38 | 0.45 | 0.97 | 0 (0.00%) | 171 | 171 | 108 | 22,668 | 143 |
| D | 10 | 24,501 | 0.38 | 0.45 | 0.95 | 0 (0.00%) | 144 | 144 | 108 | 22,683 | 170 |
| A | 100 | 12,882 | 7.70 | 8.23 | 8.86 | 0 (0.00%) | 255 | 306 | 107 | 11,985 | 51 |
| B | 100 | 22,983 | 4.16 | 5.53 | 7.31 | 0 (0.00%) | 311 | 311 | 116 | 19,859 | 74 |
| C | 100 | 25,212 | 3.88 | 4.88 | 6.49 | 0 (0.00%) | 174 | 174 | 121 | 20,838 | 145 |
| D | 100 | 25,690 | 3.82 | 4.71 | 6.18 | 0 (0.00%) | 145 | 146 | 122 | 21,062 | 177 |
| A | 500 | 11,735 | 42.24 | 44.59 | 47.90 | 546 (0.15%) | 322 | 332 | 128 | 9,133 | 36 |
| B | 500 | 21,959 | 22.70 | 28.28 | 32.55 | 0 (0.00%) | 314 | 314 | 120 | 18,270 | 70 |
| C | 500 | 24,548 | 20.31 | 23.80 | 28.78 | 58 (0.01%) | 175 | 175 | 130 | 18,843 | 140 |
| D | 500 | 25,065 | 19.88 | 23.07 | 27.89 | 0 (0.00%) | 147 | 147 | 132 | 19,030 | 170 |

### POST /orders — validated insert — orders table VACUUM FULL + reset before each config

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 13,832 | 0.70 | 0.90 | 1.43 | 0 (0.00%) | 286 | 291 | 98 | 14,089 | 48 |
| B | 10 | 23,620 | 0.39 | 0.51 | 1.18 | 0 (0.00%) | 327 | 327 | 103 | 22,939 | 72 |
| C | 10 | 24,579 | 0.35 | 0.55 | 1.15 | 0 (0.00%) | 178 | 178 | 101 | 24,450 | 138 |
| D | 10 | 24,876 | 0.35 | 0.54 | 1.07 | 0 (0.00%) | 155 | 155 | 102 | 24,386 | 160 |
| A | 100 | 14,419 | 6.79 | 7.79 | 9.42 | 0 (0.00%) | 300 | 311 | 103 | 14,006 | 48 |
| B | 100 | 26,174 | 3.60 | 4.86 | 7.21 | 0 (0.00%) | 327 | 327 | 108 | 24,219 | 80 |
| C | 100 | 28,125 | 3.31 | 4.59 | 8.45 | 0 (0.00%) | 178 | 179 | 108 | 25,969 | 158 |
| D | 100 | 28,017 | 3.35 | 4.59 | 8.17 | 0 (0.00%) | 155 | 155 | 109 | 25,615 | 181 |
| A | 500 | 14,210 | 34.74 | 37.76 | 41.97 | 1,125 (0.26%) | 323 | 335 | 115 | 12,355 | 44 |
| B | 500 | 25,645 | 19.16 | 22.61 | 29.42 | 43 (0.01%) | 328 | 328 | 113 | 22,604 | 78 |
| C | 500 | 29,701 | 16.52 | 20.64 | 26.62 | 36 (0.00%) | 180 | 180 | 120 | 24,793 | 165 |
| D | 500 | 28,756 | 16.90 | 21.73 | 29.91 | 0 (0.00%) | 156 | 156 | 120 | 23,904 | 184 |

### GET /cpu?n=15000 — SHA-256 loop, runtime only

| Config | c | rps | p50 ms | p90 ms | p99 ms | non-2xx (rate) | mean RSS MB | peak RSS MB | mean CPU % | rps/core | rps/MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 10 | 208 | 43.24 | 84.21 | 88.41 | 0 (0.00%) | 394 | 395 | 100 | 209 | 1 |
| B | 10 | 183 | 49.90 | 95.73 | 102.02 | 0 (0.00%) | 355 | 355 | 111 | 164 | 1 |
| C | 10 | 202 | 44.95 | 84.77 | 93.54 | 0 (0.00%) | 181 | 181 | 117 | 173 | 1 |
| D | 10 | 211 | 43.09 | 81.68 | 89.39 | 0 (0.00%) | 159 | 159 | 120 | 176 | 1 |
| A | 100 | ~~49,393~~ invalid | 0.67 | 2.08 | 7.09 | 1,419,202 (99.68%) | 250 | 278 | 82 | 60,273 | 198 |
| B | 100 | 188 | 532.16 | 556.20 | 564.02 | 0 (0.00%) | 355 | 356 | 112 | 168 | 1 |
| C | 100 | 202 | 499.65 | 516.48 | 528.96 | 0 (0.00%) | 181 | 181 | 117 | 173 | 1 |
| D | 100 | 215 | 467.50 | 483.19 | 495.37 | 0 (0.00%) | 159 | 159 | 120 | 179 | 1 |
| A | 500 | ~~50,591~~ invalid | 4.68 | 17.65 | 83.22 | 1,464,233 (99.72%) | 279 | 280 | 77 | 65,955 | 181 |
| B | 500 | ~~49,493~~ invalid | 2.95 | 10.54 | 48.38 | 1,408,208 (99.96%) | 363 | 364 | 86 | 57,448 | 136 |
| C | 500 | ~~49,047~~ invalid | 2.96 | 12.07 | 53.26 | 1,390,551 (99.96%) | 182 | 182 | 85 | 57,660 | 270 |
| D | 500 | ~~45,532~~ invalid | 2.90 | 10.32 | 50.63 | 1,311,888 (99.93%) | 159 | 159 | 88 | 51,899 | 286 |

## Layer attribution at c=100

Each step changes one layer. `noise` = inside ±1.2%.

| Route | Step | rps | Δ rps | verdict | mean RSS | Δ RSS | p99 | Δ p99 | rps/core | Δ rps/core |
|---|---|---|---|---|---|---|---|---|---|---|
| health | A→B runtime: Node → Bun (+ native SQL driver) | 103,273 → 103,238 | -0.0% | noise | 182 → 168 MB | -8.0% | 1.33 → 1.68 | +26.7% | 103,737 → 99,688 | -3.9% |
| health | B→C framework: Nest+Fastify → Elysia 2 | 103,238 → 142,261 | +37.8% | real | 168 → 62 MB | -63.0% | 1.68 → 1.28 | -24.1% | 99,688 → 138,541 | +39.0% |
| health | C→D build: JIT → AOT | 142,261 → 141,430 | -0.6% | noise | 62 → 55 MB | -11.5% | 1.28 → 1.28 | +0.5% | 138,541 → 137,295 | -0.9% |
| health | A→D total: A → D | 103,273 → 141,430 | +36.9% | real | 182 → 55 MB | -69.9% | 1.33 → 1.28 | -3.3% | 103,737 → 137,295 | +32.3% |
| echo | A→B runtime: Node → Bun (+ native SQL driver) | 66,660 → 75,332 | +13.0% | real | 202 → 196 MB | -2.7% | 1.90 → 2.16 | +13.4% | 66,734 → 72,730 | +9.0% |
| echo | B→C framework: Nest+Fastify → Elysia 2 | 75,332 → 121,033 | +60.7% | real | 196 → 77 MB | -60.9% | 2.16 → 1.41 | -34.7% | 72,730 → 118,148 | +62.4% |
| echo | C→D build: JIT → AOT | 121,033 → 121,644 | +0.5% | noise | 77 → 65 MB | -14.8% | 1.41 → 1.41 | +0.4% | 118,148 → 117,830 | -0.3% |
| echo | A→D total: A → D | 66,660 → 121,644 | +82.5% | real | 202 → 65 MB | -67.6% | 1.90 → 1.41 | -25.7% | 66,734 → 117,830 | +76.6% |
| me | A→B runtime: Node → Bun (+ native SQL driver) | 14,923 → 24,564 | +64.6% | real | 271 → 240 MB | -11.6% | 7.93 → 6.82 | -14.0% | 13,027 → 18,343 | +40.8% |
| me | B→C framework: Nest+Fastify → Elysia 2 | 24,564 → 27,168 | +10.6% | real | 240 → 129 MB | -46.4% | 6.82 → 5.80 | -14.9% | 18,343 → 19,412 | +5.8% |
| me | C→D build: JIT → AOT | 27,168 → 26,748 | -1.5% | small | 129 → 111 MB | -13.8% | 5.80 → 5.80 | -0.1% | 19,412 → 18,914 | -2.6% |
| me | A→D total: A → D | 14,923 → 26,748 | +79.2% | real | 271 → 111 MB | -59.1% | 7.93 → 5.80 | -26.8% | 13,027 → 18,914 | +45.2% |
| user | A→B runtime: Node → Bun (+ native SQL driver) | 18,173 → 30,871 | +69.9% | real | 289 → 272 MB | -6.1% | 6.50 → 5.34 | -17.8% | 16,893 → 28,102 | +66.4% |
| user | B→C framework: Nest+Fastify → Elysia 2 | 30,871 → 34,807 | +12.7% | real | 272 → 153 MB | -43.8% | 5.34 → 4.43 | -17.2% | 28,102 → 30,822 | +9.7% |
| user | C→D build: JIT → AOT | 34,807 → 34,538 | -0.8% | noise | 153 → 129 MB | -15.8% | 4.43 → 4.35 | -1.7% | 30,822 → 30,275 | -1.8% |
| user | A→D total: A → D | 18,173 → 34,538 | +90.0% | real | 289 → 129 MB | -55.5% | 6.50 → 4.35 | -33.0% | 16,893 → 30,275 | +79.2% |
| list | A→B runtime: Node → Bun (+ native SQL driver) | 12,882 → 22,983 | +78.4% | real | 255 → 311 MB | +22.0% | 8.86 → 7.31 | -17.5% | 11,985 → 19,859 | +65.7% |
| list | B→C framework: Nest+Fastify → Elysia 2 | 22,983 → 25,212 | +9.7% | small | 311 → 174 MB | -44.0% | 7.31 → 6.49 | -11.2% | 19,859 → 20,838 | +4.9% |
| list | C→D build: JIT → AOT | 25,212 → 25,690 | +1.9% | small | 174 → 145 MB | -16.6% | 6.49 → 6.18 | -4.8% | 20,838 → 21,062 | +1.1% |
| list | A→D total: A → D | 12,882 → 25,690 | +99.4% | real | 255 → 145 MB | -43.0% | 8.86 → 6.18 | -30.3% | 11,985 → 21,062 | +75.7% |
| order | A→B runtime: Node → Bun (+ native SQL driver) | 14,419 → 26,174 | +81.5% | real | 300 → 327 MB | +9.2% | 9.42 → 7.21 | -23.5% | 14,006 → 24,219 | +72.9% |
| order | B→C framework: Nest+Fastify → Elysia 2 | 26,174 → 28,125 | +7.5% | small | 327 → 178 MB | -45.5% | 7.21 → 8.45 | +17.2% | 24,219 → 25,969 | +7.2% |
| order | C→D build: JIT → AOT | 28,125 → 28,017 | -0.4% | noise | 178 → 155 MB | -13.0% | 8.45 → 8.17 | -3.3% | 25,969 → 25,615 | -1.4% |
| order | A→D total: A → D | 14,419 → 28,017 | +94.3% | real | 300 → 155 MB | -48.2% | 9.42 → 8.17 | -13.3% | 14,006 → 25,615 | +82.9% |
| cpu | A→B runtime: Node → Bun (+ native SQL driver) | 49,393 → 188 | -99.6% | invalid (errors) | 250 → 355 MB | +42.1% | 7.09 → 564.02 | +7849.6% | 60,273 → 168 | -99.7% |
| cpu | B→C framework: Nest+Fastify → Elysia 2 | 188 → 202 | +7.8% | small | 355 → 181 MB | -49.0% | 564.02 → 528.96 | -6.2% | 168 → 173 | +3.4% |
| cpu | C→D build: JIT → AOT | 202 → 215 | +6.2% | small | 181 → 159 MB | -12.3% | 528.96 → 495.37 | -6.4% | 173 → 179 | +3.4% |
| cpu | A→D total: A → D | 49,393 → 215 | -99.6% | invalid (errors) | 250 → 159 MB | -36.5% | 7.09 → 495.37 | +6881.9% | 60,273 → 179 | -99.7% |

## Layer attribution at c=500

Each step changes one layer. `noise` = inside ±1.2%.

| Route | Step | rps | Δ rps | verdict | mean RSS | Δ RSS | p99 | Δ p99 | rps/core | Δ rps/core |
|---|---|---|---|---|---|---|---|---|---|---|
| health | A→B runtime: Node → Bun (+ native SQL driver) | 94,272 → 101,014 | +7.2% | small | 198 → 176 MB | -11.4% | 6.52 → 6.22 | -4.6% | 94,750 → 97,710 | +3.1% |
| health | B→C framework: Nest+Fastify → Elysia 2 | 101,014 → 141,309 | +39.9% | real | 176 → 62 MB | -64.6% | 6.22 → 4.47 | -28.1% | 97,710 → 138,387 | +41.6% |
| health | C→D build: JIT → AOT | 141,309 → 140,549 | -0.5% | noise | 62 → 55 MB | -11.4% | 4.47 → 4.44 | -0.8% | 138,387 → 137,040 | -1.0% |
| health | A→D total: A → D | 94,272 → 140,549 | +49.1% | real | 198 → 55 MB | -72.2% | 6.52 → 4.44 | -31.9% | 94,750 → 137,040 | +44.6% |
| echo | A→B runtime: Node → Bun (+ native SQL driver) | 60,882 → 72,839 | +19.6% | real | 213 → 201 MB | -5.6% | 9.18 → 8.10 | -11.8% | 60,798 → 70,221 | +15.5% |
| echo | B→C framework: Nest+Fastify → Elysia 2 | 72,839 → 119,573 | +64.2% | real | 201 → 77 MB | -61.8% | 8.10 → 5.12 | -36.8% | 70,221 → 117,258 | +67.0% |
| echo | C→D build: JIT → AOT | 119,573 → 120,192 | +0.5% | noise | 77 → 66 MB | -14.7% | 5.12 → 5.12 | -0.0% | 117,258 → 116,840 | -0.4% |
| echo | A→D total: A → D | 60,882 → 120,192 | +97.4% | real | 213 → 66 MB | -69.2% | 9.18 → 5.12 | -44.2% | 60,798 → 116,840 | +92.2% |
| me | A→B runtime: Node → Bun (+ native SQL driver) | 14,056 → 23,575 | +67.7% | real | 318 → 266 MB | -16.1% | 40.00 → 26.41 | -34.0% | 11,501 → 17,055 | +48.3% |
| me | B→C framework: Nest+Fastify → Elysia 2 | 23,575 → 26,119 | +10.8% | real | 266 → 145 MB | -45.6% | 26.41 → 23.50 | -11.0% | 17,055 → 17,909 | +5.0% |
| me | C→D build: JIT → AOT | 26,119 → 26,178 | +0.2% | noise | 145 → 120 MB | -17.4% | 23.50 → 22.56 | -4.0% | 17,909 → 17,706 | -1.1% |
| me | A→D total: A → D | 14,056 → 26,178 | +86.2% | real | 318 → 120 MB | -62.3% | 40.00 → 22.56 | -43.6% | 11,501 → 17,706 | +53.9% |
| user | A→B runtime: Node → Bun (+ native SQL driver) | 16,965 → 29,348 | +73.0% | real | 316 → 284 MB | -10.2% | 33.44 → 21.32 | -36.2% | 14,661 → 25,757 | +75.7% |
| user | B→C framework: Nest+Fastify → Elysia 2 | 29,348 → 33,500 | +14.1% | real | 284 → 155 MB | -45.5% | 21.32 → 17.68 | -17.1% | 25,757 → 28,383 | +10.2% |
| user | C→D build: JIT → AOT | 33,500 → 33,661 | +0.5% | noise | 155 → 135 MB | -12.4% | 17.68 → 19.31 | +9.3% | 28,383 → 27,663 | -2.5% |
| user | A→D total: A → D | 16,965 → 33,661 | +98.4% | real | 316 → 135 MB | -57.2% | 33.44 → 19.31 | -42.2% | 14,661 → 27,663 | +88.7% |
| list | A→B runtime: Node → Bun (+ native SQL driver) | 11,735 → 21,959 | +87.1% | real | 322 → 314 MB | -2.5% | 47.90 → 32.55 | -32.1% | 9,133 → 18,270 | +100.0% |
| list | B→C framework: Nest+Fastify → Elysia 2 | 21,959 → 24,548 | +11.8% | real | 314 → 175 MB | -44.2% | 32.55 → 28.78 | -11.6% | 18,270 → 18,843 | +3.1% |
| list | C→D build: JIT → AOT | 24,548 → 25,065 | +2.1% | small | 175 → 147 MB | -15.9% | 28.78 → 27.89 | -3.1% | 18,843 → 19,030 | +1.0% |
| list | A→D total: A → D | 11,735 → 25,065 | +113.6% | real | 322 → 147 MB | -54.3% | 47.90 → 27.89 | -41.8% | 9,133 → 19,030 | +108.4% |
| order | A→B runtime: Node → Bun (+ native SQL driver) | 14,210 → 25,645 | +80.5% | real | 323 → 328 MB | +1.4% | 41.97 → 29.42 | -29.9% | 12,355 → 22,604 | +83.0% |
| order | B→C framework: Nest+Fastify → Elysia 2 | 25,645 → 29,701 | +15.8% | real | 328 → 180 MB | -45.1% | 29.42 → 26.62 | -9.5% | 22,604 → 24,793 | +9.7% |
| order | C→D build: JIT → AOT | 29,701 → 28,756 | -3.2% | small | 180 → 156 MB | -13.3% | 26.62 → 29.91 | +12.4% | 24,793 → 23,904 | -3.6% |
| order | A→D total: A → D | 14,210 → 28,756 | +102.4% | real | 323 → 156 MB | -51.7% | 41.97 → 29.91 | -28.7% | 12,355 → 23,904 | +93.5% |
| cpu | A→B runtime: Node → Bun (+ native SQL driver) | 50,591 → 49,493 | -2.2% | invalid (errors) | 279 → 363 MB | +30.3% | 83.22 → 48.38 | -41.9% | 65,955 → 57,448 | -12.9% |
| cpu | B→C framework: Nest+Fastify → Elysia 2 | 49,493 → 49,047 | -0.9% | invalid (errors) | 363 → 182 MB | -50.0% | 48.38 → 53.26 | +10.1% | 57,448 → 57,660 | +0.4% |
| cpu | C→D build: JIT → AOT | 49,047 → 45,532 | -7.2% | invalid (errors) | 182 → 159 MB | -12.4% | 53.26 → 50.63 | -4.9% | 57,660 → 51,899 | -10.0% |
| cpu | A→D total: A → D | 50,591 → 45,532 | -10.0% | invalid (errors) | 279 → 159 MB | -42.9% | 83.22 → 50.63 | -39.2% | 65,955 → 51,899 | -21.3% |

## POST /orders cross-check: separate pass, fresh table per config, c=100

Same reset as the main run (`VACUUM (FULL, ANALYZE)` + 200,000 rows), run after the main pass as an independent repeat. Differences from the main-run `/orders` row measure Postgres state drift, not the frameworks.

| Config | rps | p99 ms | mean RSS MB | mean CPU % | rps/core | dead tuples before → after | non-2xx |
|---|---|---|---|---|---|---|---|
| A | 15,044 | 8.40 | 287 | 107 | 14,074 | 0 → 0 | 0 |
| B | 26,622 | 6.48 | 232 | 108 | 24,556 | 1,416,411 → 0 | 0 |
| C | 20,471 | 26.52 | 121 | 78 | 26,331 | 0 → 0 | 100 |
| D | 22,623 | 24.01 | 106 | 84 | 26,879 | 0 → 0 | 202 |

## Machine drift check

Config A (Node, untouched by the Bun upgrade) re-measured after the afternoon pass, c=100, 3 × 30 s, against its morning medians.

| Route | morning rps | afternoon rps | Δ | verdict | foreign CPU during afternoon run |
|---|---|---|---|---|---|
| health | 100,021 | 97,251 | -2.8% | small | 220% |
| user | 16,634 | 17,716 | +6.5% | small | 386% |
| order | 13,395 | 13,173 | -1.7% | small | 423% |

## AOT check: C → D → C → D back to back, c=100

Same process order alternated to remove any time-of-day effect. 3 × 30 s per cell.

| Round | Config | health rps | me rps | user rps | foreign CPU |
|---|---|---|---|---|---|
| 1 | C | 142,087 | 27,048 | 34,619 | 190% |
| 2 | D | 141,856 | 26,870 | 34,636 | 187% |
| 3 | C | 141,796 | 27,457 | 35,270 | 187% |
| 4 | D | 142,234 | 26,945 | 34,609 | 186% |

health: C mean 141,942, D mean 142,045, Δ +0.1% → noise

me: C mean 27,253, D mean 26,907, Δ -1.3% → small

user: C mean 34,944, D mean 34,623, Δ -0.9% → noise

## Idle memory and startup

| Config | idle RSS MB (bench run) | boot→healthy ms (bench run, 1 sample) | boot→healthy ms (median of 10) | first request ms (median) |
|---|---|---|---|---|
| A | 196.7 | 745 | 400 | 16.98 |
| B | 89.7 | 225 | 181 | 13.06 |
| C | 39.0 | 205 | 96 | 17.72 |
| D | 33.3 | 44 | 47 | 15.32 |

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
| echo | B→B-pgjs Bun runtime: bun-sql → postgres.js | 75,332 → 76,881 | +2.1% | small | 196 → 169 MB | -13.9% |
| me | B→B-pgjs Bun runtime: bun-sql → postgres.js | 24,564 → 19,466 | -20.8% | real | 240 → 232 MB | -3.4% |
| user | B→B-pgjs Bun runtime: bun-sql → postgres.js | 30,871 → 22,590 | -26.8% | real | 272 → 246 MB | -9.5% |
| list | B→B-pgjs Bun runtime: bun-sql → postgres.js | 22,983 → 16,334 | -28.9% | real | 311 → 250 MB | -19.7% |
| order | B→B-pgjs Bun runtime: bun-sql → postgres.js | 26,174 → 17,805 | -32.0% | real | 327 → 262 MB | -19.9% |
| echo | A→A-typebox Node: Zod → TypeBox validator | 66,660 → 68,705 | +3.1% | small | 202 → 200 MB | -0.7% |
| me | A→A-typebox Node: Zod → TypeBox validator | 14,923 → 15,347 | +2.8% | small | 271 → 270 MB | -0.5% |
| user | A→A-typebox Node: Zod → TypeBox validator | 18,173 → 18,428 | +1.4% | small | 289 → 295 MB | +2.0% |
| list | A→A-typebox Node: Zod → TypeBox validator | 12,882 → 13,040 | +1.2% | small | 255 → 265 MB | +4.0% |
| order | A→A-typebox Node: Zod → TypeBox validator | 14,419 → 15,454 | +7.2% | small | 300 → 310 MB | +3.6% |

## Cost model

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

