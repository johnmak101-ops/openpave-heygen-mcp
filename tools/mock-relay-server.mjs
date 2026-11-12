#!/usr/bin/env node
// mock-relay-server.mjs — stand-in for PAVE's POST /api/mcp/oauth-relay
// (docs/pave-oauth-relay-endpoint.md). Test harness for the PAVE Connect
// extension: run it, point the extension options at http://127.0.0.1:49200,
// approve any HeyGen authorize URL, and watch the relay arrive here.
import http from 'node:http';

const PORT = Number(process.env.PORT || 49200);

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,authorization,x-pave-relay');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || req.url !== '/api/mcp/oauth-relay') {
    res.writeHead(404); res.end('{"error":"not found"}'); return;
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    console.log('RELAY RECEIVED:', new Date().toISOString());
    console.log('  headers:', JSON.stringify({ origin: req.headers.origin, auth: req.headers.authorization ? 'present' : 'none' }));
    console.log('  body:', body);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ installed: true, provider: 'heygen', entry_id: 'heygen' }));
    console.log('  → 200 {installed:true} (mock)');
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('mock relay on http://127.0.0.1:' + PORT + '/api/mcp/oauth-relay');
  console.log('set the PAVE Connect extension origin to http://127.0.0.1:' + PORT);
});
