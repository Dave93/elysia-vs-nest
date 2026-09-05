#!/usr/bin/env bash
# One clean pass on an idle machine. Run: nohup bash bench/run-clean.sh > results/clean.log 2>&1 &
set -x
echo "START $(date)"
export CONTENTION=${CONTENTION:-350} MAX_RETRY=200
bun bench/noise.ts && echo "NOISE DONE"
OUT=results/results-clean.json bun bench/bench.ts && echo "MAIN DONE"
bun bench/order-fair.ts && echo "ORDER-FAIR DONE"
SEQ=C,D,C,D CASES=me,health,user CONC=100 bun bench/interleave.ts && echo "INTERLEAVE DONE"
CONFIGS=B-pgjs,A-typebox CASES=me,user,list,order,echo CONC=100 bun bench/bench.ts && echo "SENS DONE"
bun bench/boot.ts && echo "BOOT DONE"
echo "END $(date) exit=$?"
