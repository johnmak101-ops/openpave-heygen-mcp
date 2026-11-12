#!/usr/bin/env node
// launch-with-extension.cjs — the closest legitimate "auto install" for an
// unpacked extension: starts Chrome/Edge with --load-extension so PAVE Connect
// runs without any chrome://extensions interaction.
//
// Honest limits (browser security models enforce these; there is no bypass):
//   - Chrome must not already be running, or the flag is ignored (it joins the
//     existing process). --restart closes existing browser windows first.
//   - The flag is per-launch. "Uninstall" = simply not launching this way
//     again; nothing persists on the machine.
//   - The sanctioned silent-install mechanism is enterprise policy
//     (ExtensionInstallForcelist) and requires a Chrome Web Store listing —
//     that path belongs to the PAVE team, not this repo.
//
// Usage:
//   node tools/launch-with-extension.cjs --origin http://127.0.0.1:49200
//   node tools/launch-with-extension.cjs --origin https://pave.example.com --restart
//   node tools/launch-with-extension.cjs --uninstall   (just reports; nothing persisted)
import fs from 'node:fs';
import { execFile, execSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const originIdx = args.indexOf('--origin');
const origin = originIdx >= 0 ? args[originIdx + 1] : '';
const restart = args.includes('--restart');

if (args.includes('--uninstall')) {
  console.log('Nothing to remove: --load-extension leaves no persistent state.');
  console.log('Just stop launching via this script (or remove it from any shortcut that calls it).');
  process.exit(0);
}

const EXT = new URL('../dist/chrome', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
if (!fs.existsSync(path.join(EXT, 'manifest.json'))) {
  console.error('dist/chrome not built — run: node tools/build-extensions.mjs');
  process.exit(1);
}

if (origin) {
  fs.writeFileSync(path.join(EXT, 'config.json'), JSON.stringify({ defaultOrigin: origin }, null, 2));
  console.log('setup: config.json defaultOrigin = ' + origin);
} else {
  console.log('setup: no --origin; extension falls back to its copy-page mode');
}

const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) { console.error('no Chrome/Edge found'); process.exit(1); }

const running = () => {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH', { encoding: 'utf8' });
    return out.toLowerCase().includes('chrome.exe');
  } catch { return false; }
};

if (running()) {
  if (!restart) {
    console.error('Chrome is already running — the --load-extension flag would be ignored.');
    console.error('Re-run with --restart (closes current browser windows; tabs restore on next start),');
    console.error('or close Chrome yourself first.');
    process.exit(2);
  }
  console.log('restart: closing existing Chrome windows (tabs will restore on next normal launch)...');
  try { execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' }); } catch {}
  const t0 = Date.now();
  while (running() && Date.now() - t0 < 10000) execSync('ping -n 1 -w 300 127.0.0.1', { stdio: 'ignore' });
}

console.log('launching ' + path.basename(chrome) + ' with PAVE Connect...');
const child = execFile(chrome, [
  '--load-extension=' + EXT,
  '--no-first-run',
  'https://app.heygen.com/',
], () => {});
child.unref();
console.log('done. Approve HeyGen there; the extension relays automatically.');
console.log('to remove: re-run with --uninstall (nothing persisted) or just stop using this launcher.');
