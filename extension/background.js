// PAVE Connect — background service worker (MV3).
//
// Geometry: HeyGen-class MCP providers only accept loopback redirect URIs,
// so the authorization code always lands on the USER'S machine, where the
// browser tab dies with ERR_CONNECTION_REFUSED. This worker watches for that
// exact death, extracts code+state, and relays them to the configured PAVE
// server, which performs the PKCE exchange it already holds the verifier for.
//
// Falls back to a copy-friendly page when no PAVE origin is configured or
// the relay is unreachable — preserving the manual paste lane.

const LOOPBACK_FILTER = {
  url: [
    { schemes: ['http'], hostEquals: '127.0.0.1', queryContains: 'code=' },
    { schemes: ['http'], hostEquals: 'localhost', queryContains: 'code=' },
  ],
};

// ---------------------------------------------------------------------------
// ZERO-CONFIG END STATE (for the PAVE team): when PAVE ships the relay
// endpoint and a store listing, set DEFAULT_ORIGIN to the production PAVE
// origin and DELETE options.html/options.js entirely. The user then installs
// from the store, signs in to the PAVE WebUI once (session cookie), and never
// sees a settings screen. Until then, the origin is user-configured because
// no public PAVE endpoint exists yet.
// ---------------------------------------------------------------------------
const DEFAULT_ORIGIN = ''; // e.g. 'https://pave.example.com'

let cachedPkgOrigin = null;
async function pkgOrigin() {
  if (cachedPkgOrigin !== null) return cachedPkgOrigin;
  try {
    const r = await fetch(chrome.runtime.getURL('config.json'));
    cachedPkgOrigin = ((await r.json()).defaultOrigin || '').replace(/\/+$/, '');
  } catch (e) {
    cachedPkgOrigin = '';
  }
  return cachedPkgOrigin;
}

async function getConfig() {
  const { origin, token } = await chrome.storage.local.get(['origin', 'token']);
  const o = (origin ?? (await pkgOrigin()) ?? DEFAULT_ORIGIN).replace(/\/+$/, '');
  return { origin: o, token: token || '' };
}

function resultPage(params) {
  const q = new URLSearchParams(params).toString();
  return chrome.runtime.getURL('relay-result.html') + '?' + q;
}

async function relay(details) {
  const url = new URL(details.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  if (!code) return;

  const { origin, token } = await getConfig();
  if (!origin) {
    await chrome.tabs.update(details.tabId, {
      url: resultPage({ mode: 'fallback', url: details.url, reason: 'no-origin' }),
    });
    return;
  }

  try {
    const res = await fetch(origin + '/api/mcp/oauth-relay', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify({ code, state, callback_url: details.url }),
    });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      await chrome.tabs.update(details.tabId, {
        url: resultPage({ mode: 'success', provider: body.provider || 'mcp', origin }),
      });
    } else {
      await chrome.tabs.update(details.tabId, {
        url: resultPage({ mode: 'fallback', url: details.url, reason: 'relay-' + res.status }),
      });
    }
  } catch (e) {
    await chrome.tabs.update(details.tabId, {
      url: resultPage({ mode: 'fallback', url: details.url, reason: 'relay-unreachable' }),
    });
  }
}

// The loopback tab dies both ways: nothing listening (onErrorOccurred) or
// something answered (onCompleted, e.g. an unrelated local server). Catch both.
chrome.webNavigation.onErrorOccurred.addListener(relay, LOOPBACK_FILTER);
chrome.webNavigation.onCompleted.addListener(relay, LOOPBACK_FILTER);

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['origin'], (r) => {
    if (r.origin === undefined) chrome.storage.local.set({ origin: '', token: '' });
  });
});
