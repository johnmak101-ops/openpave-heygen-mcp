#!/usr/bin/env node
// Assembles per-browser extension packages in dist/.
//   node tools/build-extensions.mjs
// Output: dist/chrome/, dist/firefox/, dist/safari/ — each a loadable
// extension folder (Chrome/Edge: chrome://extensions → Load unpacked;
// Firefox: about:debugging → This Firefox → Load Temporary Add-on;
// Safari: run `xcrun safari-web-extension-converter dist/safari` on macOS).
import fs from 'node:fs';
import path from 'node:path';

const SRC = new URL('../extension/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const VARIANTS = {
  chrome: 'manifest.json',
  firefox: 'manifest.firefox.json',
  safari: 'manifest.safari.json',
};

const SKIP = new Set(Object.values(VARIANTS).filter((n) => n !== 'manifest.json'));

fs.rmSync(DIST, { recursive: true, force: true });
for (const [browser, manifest] of Object.entries(VARIANTS)) {
  const out = path.join(DIST, browser);
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(SRC)) {
    if (SKIP.has(f)) continue;
    fs.copyFileSync(path.join(SRC, f), path.join(out, f));
  }
  fs.copyFileSync(path.join(SRC, manifest), path.join(out, 'manifest.json'));
  console.log('built dist/' + browser + ' (' + manifest + ')');
}
console.log('\nChrome/Edge: chrome://extensions → Developer mode → Load unpacked → dist/chrome');
console.log('Firefox: about:debugging → Load Temporary Add-on → dist/firefox/manifest.json');
console.log('Safari (macOS): xcrun safari-web-extension-converter dist/safari');
