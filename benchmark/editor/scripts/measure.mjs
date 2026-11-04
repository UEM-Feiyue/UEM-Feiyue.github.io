import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
const configs = ['tiptap', 'milkdown'];
for (const name of configs) {
  const dest = 'dist-' + name;
  rmSync(dest, { recursive: true, force: true });
  execFileSync('npx', ['vite', 'build', '--config', 'vite.' + name + '.mjs'], { stdio: 'inherit' });
  const walk = dir => readdirSync(dir).flatMap(file => {
    const path = join(dir, file);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
  const assets = walk(dest).filter(file => /\.(js|css)$/.test(file));
  const raw = assets.reduce((n, file) => n + statSync(file).size, 0);
  const gzip = assets.reduce((n, file) => n + gzipSync(readFileSync(file)).length, 0);
  console.log(JSON.stringify({ editor: name, jsCssFiles: assets.length, rawBytes: raw, gzipBytes: gzip }));
}
