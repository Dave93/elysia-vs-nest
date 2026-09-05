// bench/dx.ts — install/build/typecheck/reload timings + code size. Run: bun bench/dx.ts (~5 min)
import { sh, median } from "./lib";
import { rmSync } from "node:fs";

async function timed(cmd: string[], cwd: string, env: Record<string, string> = {}): Promise<number> {
  const t = performance.now();
  const p = Bun.spawn(cmd, { cwd, stdout: "ignore", stderr: "ignore", env: { ...process.env, ...env } });
  await p.exited;
  return performance.now() - t;
}
async function dirKB(p: string) { return Number((await sh(["du", "-sk", p])).split(/\s+/)[0]); }
async function loc(dir: string) {
  const files = (await sh(["find", dir, "-name", "*.ts", "-not", "-name", "*.spec.ts"])).split("\n").filter(Boolean);
  let lines = 0;
  for (const f of files) lines += (await Bun.file(f).text()).split("\n").filter((l) => l.trim()).length;
  return { loc: lines, files: files.length };
}
async function depCount(app: string) {
  return Number(await sh(["sh", "-c", `find ${app}/node_modules -maxdepth 3 -name package.json -not -path '*/node_modules/*/node_modules/*' | wc -l`]));
}
async function directDeps(app: string) {
  const p = JSON.parse(await Bun.file(`${app}/package.json`).text());
  return { runtime: Object.keys(p.dependencies ?? {}).length, dev: Object.keys(p.devDependencies ?? {}).length };
}

// Watch-mode reload: the app prints "boot <ms-since-epoch>" on stderr in development; we time save → new boot line.
async function reload(app: string, watchCmd: string[], touch: string): Promise<number[]> {
  const times: number[] = [];
  const p = Bun.spawn(watchCmd, { cwd: app, env: { ...process.env, PORT: "3000", NODE_ENV: "development", BOOT_MARK: "1" }, stdout: "pipe", stderr: "pipe" });
  let pending: ((t: number) => void) | null = null;
  const scan = async (stream: ReadableStream<Uint8Array>) => {
    const reader = stream.getReader(); const dec = new TextDecoder(); let buf = "";
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value);
      let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); const m = line.match(/^boot (\d+)/); if (m && pending) { pending(Number(m[1])); pending = null; } }
    }
  };
  scan(p.stdout as any); scan(p.stderr as any);
  await new Promise<number>((r) => (pending = r)); // first boot
  const src = await Bun.file(touch).text();
  for (let i = 0; i < 5; i++) {
    await Bun.sleep(800);
    const wait = new Promise<number>((r) => (pending = r));
    const t0 = Date.now();
    await Bun.write(touch, src + `\n// reload ${i} ${t0}\n`);
    const bootAt = await Promise.race([wait, Bun.sleep(15_000).then(() => -1)]);
    times.push(bootAt < 0 ? -1 : bootAt - t0);
  }
  await Bun.write(touch, src);
  p.kill("SIGTERM"); await p.exited; await Bun.sleep(700);
  return times;
}

const out: any = {};
for (const app of ["elysia-api", "nest-api"] as const) {
  const dir = `apps/${app}`;
  const isNest = app === "nest-api";
  rmSync(`${dir}/node_modules`, { recursive: true, force: true });
  const installMs = await timed(isNest ? ["npm", "ci"] : ["bun", "install", "--frozen-lockfile"], dir);
  const buildCmd = isNest ? ["npx", "nest", "build"] : ["bun", "build.ts"];
  const builds: number[] = []; for (let i = 0; i < 3; i++) builds.push(await timed(buildCmd, dir));
  const tcCmd = isNest ? ["npx", "tsc", "--noEmit", "-p", "tsconfig.build.json"] : ["bunx", "tsc", "--noEmit"];
  const typechecks: number[] = []; for (let i = 0; i < 3; i++) typechecks.push(await timed(tcCmd, dir));
  const row: any = {
    installMs, nodeModulesMB: (await dirKB(`${dir}/node_modules`)) / 1024, depCount: await depCount(dir), directDeps: await directDeps(dir),
    buildMs: median(builds), distKB: await dirKB(`${dir}/dist`), typecheckMs: median(typechecks), ...(await loc(`${dir}/src`)),
    configFiles: (await sh(["sh", "-c", `ls -a ${dir} | grep -E '\\.(json|rc|ts)$|^\\.' | grep -v -E '^\\.$|^\\.\\.$|lock|node_modules|README|smoke|build' | tr '\\n' ' '`])).trim(),
  };
  if (!isNest) { row.aotBuildMs = await timed(["bun", "build-aot.ts"], dir); row.aotDistKB = await dirKB(`${dir}/dist-aot`); }
  row.reloadMs = await reload(dir, isNest ? ["npx", "nest", "start", "--watch"] : ["bun", "--watch", "src/index.ts"], `${dir}/src/${isNest ? "system/system.controller.ts" : "app.ts"}`);
  row.reloadMedianMs = median(row.reloadMs.filter((t: number) => t >= 0));
  out[isNest ? "nest" : "elysia"] = row;
  console.log(app, JSON.stringify(row));
}
await Bun.write("results/dx.json", JSON.stringify(out, null, 2));
