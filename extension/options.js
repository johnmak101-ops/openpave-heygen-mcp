/* PAVE Connect — options page. Saves origin/token and requests host
   permission for the configured PAVE origin so the relay fetch is allowed. */

const $ = (id) => document.getElementById(id);

chrome.storage.local.get(['origin', 'token'], (r) => {
  $('origin').value = r.origin || '';
  $('token').value = r.token || '';
});

$('save').addEventListener('click', async () => {
  const origin = $('origin').value.trim().replace(/\/+$/, '');
  const token = $('token').value.trim();
  const status = $('status');

  if (!origin || !/^https?:\/\//.test(origin)) {
    status.textContent = 'Enter a valid origin starting with http:// or https://';
    return;
  }

  await chrome.storage.local.set({ origin, token });

  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [origin + '/*'] });
  } catch (e) {
    granted = false;
  }
  if (!granted) {
    const loopback = /^(http:\/\/127\.0\.0\.1|http:\/\/localhost)/.test(origin);
    status.textContent = loopback
      ? 'Saved. Origin permission declined, but loopback dev targets are usually CORS-open — relay will try anyway.'
      : 'Saved, but origin permission was declined — the relay will only work if ' + origin + ' allows cross-origin fetches (Access-Control-Allow-Origin).';
  } else {
    status.textContent = 'Saved. Relay target: ' + origin + '/api/mcp/oauth-relay';
  }
});
