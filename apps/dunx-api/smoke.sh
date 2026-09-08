#!/usr/bin/env bash
# Hits all routes against :3000. Run from apps/<app>: bash smoke.sh
set -e
B=http://127.0.0.1:3000
T=$(cd ../.. && bun -e 'import {TOKEN} from "./bench/lib.ts"; console.log(await TOKEN)')
curl -sf $B/health; echo
curl -sf -X POST $B/echo -H 'content-type: application/json' -d '{"name":"Jane","email":"jane@example.com","age":30,"tags":["a"]}'; echo
curl -sf "$B/cpu?n=100"; echo
curl -sf $B/users/4242; echo
curl -sf "$B/users?page=7&limit=20" | head -c 200; echo
curl -sf -X POST $B/orders -H 'content-type: application/json' -d '{"userId":4242,"amount":19.99,"currency":"USD"}'; echo
curl -sf $B/me -H "authorization: Bearer $T"; echo
curl -s -o /dev/null -w '%{http_code}\n' $B/me
