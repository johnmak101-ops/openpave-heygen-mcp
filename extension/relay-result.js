/* Renders the relay outcome. mode=success → done. mode=fallback → show the
   callback URL in a copy box so the user can paste it into PAVE chat
   (the manual lane, preserved as the floor). */

const q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

if (q.get('mode') === 'success') {
  $('title').textContent = 'Connected ✓';
  $('message').innerHTML =
    '<span class="ok">PAVE accepted the OAuth relay.</span> Return to your PAVE session — ' +
    'the <b>' + (q.get('provider') || 'MCP server') + '</b> connection should show as installed. You can close this tab.';
} else {
  $('title').textContent = 'Automatic relay unavailable';
  const reason = q.get('reason');
  const why = {
    'no-origin': 'No PAVE origin configured yet — open the extension options ( Extensions → PAVE Connect → Details → Extension options ) and set your PAVE origin.',
    'relay-404': 'Your PAVE server does not expose /api/mcp/oauth-relay yet (see docs/pave-oauth-relay-endpoint.md).',
    'relay-401': 'PAVE rejected the relay (unauthenticated). Sign in to the PAVE WebUI, or set a bearer token in options.',
    'relay-409': 'PAVE has no pending OAuth state matching this code — start the connection from PAVE first, then approve again.',
    'relay-unreachable': 'Could not reach your PAVE server (network or CORS).',
  }[reason] || ('Relay failed: ' + reason);
  $('message').innerHTML =
    '<span class="warn">' + why + '</span><br><br>' +
    'Fallback — copy the callback URL below and paste it into your PAVE chat:';
  const url = q.get('url') || '';
  $('payload').hidden = false;
  $('payload').textContent = url;
  const btn = $('copy');
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(url);
    btn.textContent = 'copied ✓';
  });
}
