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

  try {
    await chrome.permissions.request({ origins: [origin + '/*'] });
  } catch (e) {
    status.textContent = 'Host permission for ' + origin + ' was not granted — relay fetches will fail.';
  }

  await chrome.storage.local.set({ origin, token });
  status.textContent = 'Saved. Relay target: ' + origin + '/api/mcp/oauth-relay';
});
