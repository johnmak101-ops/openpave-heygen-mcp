// M4 runner: node .tmp-run.cjs <tool> '<json-args>' <outfile>
// Calls the probe, unwraps stringified text content, writes result JSON to outfile.
const { execFileSync } = require('child_process');
const [tool, argsRaw, outfile] = process.argv.slice(2);
const out = execFileSync('node', ['probe/heygen-probe.mjs', 'call', tool, argsRaw || '{}'], {
  encoding: 'utf8',
  env: { ...process.env, HEYGEN_TOKEN_FILE: 'D:/hygen_playbook/.tmp/mcp-token.json' },
  maxBuffer: 16 * 1024 * 1024,
  timeout: 300000,
});
const j = JSON.parse(out);
const text = j.result && j.result.content ? j.result.content.map(c => c.text).join('') : out;
let parsed;
try { parsed = JSON.parse(text); } catch (e) { parsed = { unparsed: text.slice(0, 500) }; }
if (outfile) require('fs').writeFileSync(outfile, JSON.stringify(parsed, null, 2));
const d = parsed.data || parsed;
console.log(tool, '→', d.error ? 'ERROR: ' + JSON.stringify(d).slice(0, 300) : JSON.stringify(d).slice(0, 300));
