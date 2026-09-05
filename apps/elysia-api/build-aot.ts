// Elysia 2 AOT: route construction + TypeBox compilation happen at build time.
import { aot } from "elysia/plugin/aot/bun";

const r = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist-aot",
  target: "bun",
  minify: false,
  sourcemap: "none",
  plugins: [aot("src/app.ts", { target: "bun" })],
});
if (!r.success) { console.error(r.logs); process.exit(1); }
// Importing the app during the build opens the DB pool; exit explicitly or the build hangs.
process.exit(0);
