const r = await Bun.build({ entrypoints: ["src/index.ts"], outdir: "dist", target: "bun", minify: false, sourcemap: "none" });
if (!r.success) { console.error(r.logs); process.exit(1); }
process.exit(0);
