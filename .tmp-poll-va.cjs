// Polls a Video Agent session until terminal state, then writes result.
const { execFileSync } = require('child_process');
const sessionId = process.argv[2];
const out = process.argv[3];
for (let i = 0; i < 60; i++) {
  const raw = execFileSync('node', ['.tmp-run.cjs', 'get_video_agent_session', JSON.stringify({ session_id: sessionId }), out], { encoding: 'utf8', timeout: 120000 });
  const j = JSON.parse(require('fs').readFileSync(out, 'utf8'));
  const d = j.data || j;
  console.log(`[${new Date().toISOString().slice(11, 19)}] status=${d.status} progress=${d.progress}`);
  if (['completed', 'failed', 'cancelled'].includes(d.status)) {
    console.log('TERMINAL:', JSON.stringify({ status: d.status, video_id: d.video_id, video_url: d.video_url }).slice(0, 400));
    process.exit(0);
  }
  require('child_process').execSync('sleep 60');
}
console.log('TIMEOUT after 60 polls');
