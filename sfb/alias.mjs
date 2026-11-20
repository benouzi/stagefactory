import { build } from 'esbuild';
await build({ entryPoints: ['props.ts'], bundle: true, format: 'esm', target: 'es2020', outfile: '/home/claude/app/sceno-props.js', external: ['three', 'three/addons/*'],
  plugins: [{ name: 'jsm', setup(b){ b.onResolve({ filter: /^three\/examples\/jsm\// }, a => ({ path: a.path.replace('three/examples/jsm/', 'three/addons/'), external: true })); } }] });
