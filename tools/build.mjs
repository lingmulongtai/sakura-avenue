import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { build } from 'esbuild';

const root = resolve('.');
const output = resolve(root, 'dist');
if (output !== join(root, 'dist')) throw new Error('Invalid output directory');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const names = await readdir(root);
for (const name of names.filter(name => name.endsWith('.html') || name === 'site.webmanifest')) {
  await cp(join(root, name), join(output, name));
}
for (const name of ['assets', 'docs']) {
  await cp(join(root, name), join(output, name), { recursive: true });
}
if (names.includes('models.html')) {
  await build({
    entryPoints: ['assets/js/pages/models.js'],
    outfile: 'dist/assets/js/pages/models.js',
    bundle: true,
    format: 'esm',
    minify: true,
    target: ['es2020'],
  });
}
console.log('Built static site in dist/');
