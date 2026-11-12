#!/usr/bin/env node
// heygen-probe.mjs — token-safe JSON-RPC diagnostic probe for the HeyGen
// remote MCP server (https://mcp.heygen.com/mcp/v1).
//
// Modeled on probe/dropbox-probe.mjs from openpave-dropbox-mcp. COMMITTED TO
// THE REPO so it survives ~/.pave/cache wipes.
//
// Security rules (openpave R6 doctrine):
//   - The token is read from ~/.pave/tokens.yaml (key MCP__heygen__ACCESS).
//     It is NEVER accepted on the command line and NEVER echoed.
//   - Dev override: HEYGEN_TOKEN_FILE points at a JSON file
//     {"access_token": "..."} — for standalone verification on machines where
//     the PAVE bridge is not installed. Same never-echo rules apply.
//
// Usage:
//   node probe/heygen-probe.mjs tools/list
//   node probe/heygen-probe.mjs schema <tool>
//   node probe/heygen-probe.mjs call <tool> '<json-args>'
//   node probe/heygen-probe.mjs call <tool> @args.json
//
// Env:
//   MCP_URL  server URL        (default https://mcp.heygen.com/mcp/v1)
//   MCP_ID   PAVE MCP entry id (default heygen — token key MCP__heygen__ACCESS)
//   HEYGEN_TOKEN_FILE  dev-only JSON token file (see above)
//   NODE_USE_ENV_PROXY=1  required behind HTTPS_PROXY: Node's fetch ignores
//                         HTTPS_PROXY without it.

'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MCP_URL = process.env.MCP_URL || 'https://mcp.heygen.com/mcp/v1';
const MCP_ID = process.env.MCP_ID || 'heygen';

function die(msg) {
  console.error('heygen-probe: ' + msg);
  process.exit(1);
}

function readToken() {
  if (process.env.HEYGEN_TOKEN_FILE) {
    try {
      const j = JSON.parse(fs.readFileSync(process.env.HEYGEN_TOKEN_FILE, 'utf8'));
      if (j.access_token) return j.access_token;
      die('HEYGEN_TOKEN_FILE has no access_token field');
    } catch (e) {
      die('cannot read ' + process.env.HEYGEN_TOKEN_FILE + ' — ' + e.message);
    }
  }
  const file = path.join(os.homedir(), '.pave', 'tokens.yaml');
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    die('cannot read ' + file + ' — ' + e.message
      + ' (on machines without the PAVE bridge, set HEYGEN_TOKEN_FILE to a JSON {"access_token": ...} file)');
  }
  const key = 'MCP__' + MCP_ID + '__ACCESS';
  const m = text.match(new RegExp('^' + key + ':\\s*(\\S+)\\s*$', 'm'));
  if (!m) die('no "' + key + '" entry in ' + file + ' — complete the OAuth flow first (see SKILL.md §2)');
  return m[1];
}

const TOKEN = readToken();
let sessionId = null;
let nextId = 1;

async function rpc(method, params, notification) {
  const body = { jsonrpc: '2.0', method: method };
  if (!notification) body.id = nextId++;
  if (params !== undefined) body.params = params;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: 'Bearer ' + TOKEN,
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;
  const ct = res.headers.get('content-type') || '';
  const raw = await res.text();
  if (res.status === 202 && !raw) return { ok: true }; // valid notification ack
  if (res.status !== 200) {
    die('HTTP ' + res.status + ' from ' + MCP_URL + ' (content-type: ' + ct + ')'
      + (res.status === 429 ? ' — rate-limited; retry later'
        : res.status === 401 ? ' — token missing/expired; re-auth (see SKILL.md §2)' : '')
      + (raw && raw.length < 400 ? '\n' + raw : ''));
  }
  if (ct.includes('text/event-stream')) {
    const lines = raw.split('\n').filter((l) => l.startsWith('data:'));
    if (!lines.length) die('SSE response with no data: lines');
    return JSON.parse(lines[lines.length - 1].slice(5).trim());
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    die('non-JSON response (content-type: ' + ct + ', ' + raw.length + ' bytes) — ' + e.message);
  }
}

async function main() {
  const init = await rpc('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'heygen-probe', version: '0.1.0' },
  });
  if (init.error) die('initialize failed: ' + JSON.stringify(init.error));
  await rpc('notifications/initialized', undefined, true);

  const cmd = process.argv[2];
  const arg = process.argv[3];
  if (cmd === 'tools/list') {
    const out = await rpc('tools/list', {});
    if (out.error) die('tools/list failed: ' + JSON.stringify(out.error));
    for (const t of out.result.tools || []) {
      console.log('- ' + t.name + ': ' + String(t.description || '').replace(/\s+/g, ' ').slice(0, 140));
    }
    console.log('(' + (out.result.tools || []).length + ' tools)');
  } else if (cmd === 'schema') {
    if (!arg) die('usage: schema <tool>');
    const out = await rpc('tools/list', {});
    const t = (out.result.tools || []).find((x) => x.name === arg);
    if (!t) die('no such tool: ' + arg);
    console.log(JSON.stringify(t, null, 2));
  } else if (cmd === 'call') {
    const tool = arg;
    let argsRaw = process.argv[4];
    if (!tool || argsRaw === undefined) die('usage: call <tool> <json-args|@file>');
    if (argsRaw.startsWith('@')) {
      argsRaw = fs.readFileSync(argsRaw.slice(1), 'utf8');
    }
    let args;
    try {
      args = argsRaw.trim() === '' ? {} : JSON.parse(argsRaw);
    } catch (e) {
      die('args are not valid JSON — ' + e.message);
    }
    const out = await rpc('tools/call', { name: tool, arguments: args });
    console.log(JSON.stringify(out, null, 2));
    if (out.error || (out.result && out.result.isError)) process.exit(2);
  } else {
    die('unknown command: ' + cmd + ' (tools/list | schema <tool> | call <tool> <args>)');
  }
}

main().catch((e) => die(e.message));
