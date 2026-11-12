#!/usr/bin/env node
// heygen-oauth-bridge.mjs — local OAuth bridge for the HeyGen Remote MCP
// server, for the case where the MCP client (e.g. PAVE) runs where the user's
// browser cannot reach its loopback redirect (containers, remote hosts).
//
// What it does:
//   1. Generates its own PKCE verifier/state (the bridge holds the verifier —
//      it performs the exchange itself).
//   2. Prints an authorize URL (shared loopback-only client — HeyGen DCR is a
//      no-op, verified 2026-11-12; any 127.0.0.1:<port>/<path> validates).
//   3. Captures the browser redirect on this machine, exchanges the code.
//   4. Renders a minimal page with the finished token JSON (the "blank page
//      with JSON" pattern) + writes it to a 0600 file.
//
// Then ONE paste: copy the JSON into the chat of the MCP-hosting session,
// which stores it via the sanctioned route:
//   PUT /capabilities/mcp/heygen/tokens  {"access","refresh"}
//   capabilities_refresh heygen
//
// Usage:
//   node bridge/heygen-oauth-bridge.mjs            # port 49153
//   PORT=49999 node bridge/heygen-oauth-bridge.mjs
//
// Env:
//   HEYGEN_CLIENT_ID  (default the shared "HeyGen MCP Default" client)
//   RESOURCE          (default https://mcp.heygen.com/mcp/v1)
//   OUT               (token output file; default ./heygen-tokens.json)

'use strict';

import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const PORT = Number(process.env.PORT || 49153);
const CLIENT_ID = process.env.HEYGEN_CLIENT_ID || 'an1xhCM552m7m1AuY7hLlwzM';
const RESOURCE = process.env.RESOURCE || 'https://mcp.heygen.com/mcp/v1';
const OUT = process.env.OUT || 'heygen-tokens.json';

const AS = 'https://api2.heygen.com';
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;

function b64url(buf) { return Buffer.from(buf).toString('base64url'); }
const verifier = b64url(crypto.randomBytes(48));
const challenge = crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
const state = b64url(crypto.randomBytes(16));

const authorizeUrl = AS + '/v1/oauth/authorize?' + new URLSearchParams({
  response_type: 'code',
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT,
  scope: 'openid profile email',
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
  resource: RESOURCE,
}).toString();

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui;margin:3rem auto;max-width:44rem;padding:0 1rem}
pre{background:#f4f4f4;padding:1rem;overflow:auto;white-space:pre-wrap;word-break:break-all}
button{font-size:1rem;padding:.5rem 1rem}</style></head><body>${body}</body></html>`;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (u.pathname !== '/callback') { res.writeHead(404); res.end('not found'); return; }

  const code = u.searchParams.get('code');
  const got = u.searchParams.get('state');
  if (!code) { res.end(page('error', '<h2>No code in callback.</h2>')); return; }
  if (got !== state) { res.end(page('error', '<h2>State mismatch — reject this callback.</h2>')); return; }

  let tok;
  try {
    const r = await fetch(AS + '/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT,
        client_id: CLIENT_ID,
        code_verifier: verifier,
        resource: RESOURCE,
      }),
    });
    const body = await r.json();
    if (!r.ok || !body.access_token) throw new Error(JSON.stringify(body).slice(0, 300));
    tok = body;
  } catch (e) {
    res.end(page('exchange failed', `<h2>Token exchange failed</h2><pre>${String(e.message || e)}</pre>`));
    return;
  }

  const blob = JSON.stringify({ access: tok.access_token, refresh: tok.refresh_token || null }, null, 2);
  fs.writeFileSync(OUT, blob + '\n', { mode: 0o600 });
  console.log('\nTOKENS (also in ' + OUT + '):\n' + blob);
  res.end(page('HeyGen tokens ready', `<h2>HeyGen tokens ready</h2>
<p>Access token expires in ${tok.expires_in}s. Paste the JSON below into your PAVE session chat (or store it yourself).</p>
<pre id="blob">${blob.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
<button onclick="navigator.clipboard.writeText(document.getElementById('blob').textContent);this.textContent='copied'">Copy JSON</button>
<p>You can close this tab.</p>`));
  server.close();
  process.exit(0);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('HeyGen OAuth bridge on http://127.0.0.1:' + PORT);
  console.log('Authorize URL (15 min listener):\n\n' + authorizeUrl + '\n');
  if (!process.env.HEADLESS) {
    try { execSync(`start "" "${authorizeUrl}"`); console.log('(opened in your default browser)'); } catch (e) { /* headless */ }
  }
});
setTimeout(() => { console.error('listener timed out after 15 min'); process.exit(1); }, 15 * 60 * 1000);
