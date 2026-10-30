import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

export const sharedFiles = ['command-template.mjs', 'location.mjs'].map(file => ({
  source: new URL(`../shared/${file}`, import.meta.url),
  target: new URL(`../public/preload/${file.replace(/\.mjs$/, '.cjs')}`, import.meta.url),
}));

export function syncPreloadFile({ source, target }) {
  const { code } = transformSync(readFileSync(source, 'utf8'), {
    format: 'cjs',
    target: 'node16',
    sourcefile: fileURLToPath(source),
  });
  writeFileSync(target, `// Generated from shared modules by scripts/sync-preload.mjs.\n${code}`);
}

export function syncPreload() {
  sharedFiles.forEach(syncPreloadFile);
  for (const file of ['command-template.mjs', 'location.mjs']) {
    rmSync(new URL(`../public/preload/${file}`, import.meta.url), { force: true });
  }
}

syncPreload();
