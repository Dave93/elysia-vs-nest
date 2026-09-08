// The transform that records constructor parameter types runs at build time here,
// so `bun dist/index.js` needs no preload and no runtime parser.
import { depsPlugin } from '@dunx/transform';

const r = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'bun',
  minify: false,
  sourcemap: 'none',
  plugins: [depsPlugin],
});
if (!r.success) { console.error(r.logs); process.exit(1); }
process.exit(0);
