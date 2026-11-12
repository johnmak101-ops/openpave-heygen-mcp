# PAVE Connect — browser extension (reference implementation)

## What this is — and is not

This is the **reference implementation for the PAVE team**, not an end-user
artifact today. It demonstrates the zero-copy OAuth lane for loopback-only
MCP providers (HeyGen):

```
user clicks "Connect HeyGen" in PAVE WebUI → approves in browser
→ loopback tab dies (connection refused)
→ this extension catches the dying tab's URL
→ POSTs code+state to PAVE → PAVE completes the exchange
→ tab shows "Connected ✓"
```

## Why it exists

HeyGen's Remote MCP accepts **loopback redirect URIs only** (verified
2026-11-12 — see `../SKILL.md` §2). The authorization code therefore always
lands on the user's own machine, and a browser tab is the only thing that
sees it. Catching the tab requires in-browser code — this extension. The
manual alternative (user copies the address-bar URL into a PAVE paste card)
is documented in `../SKILL.md` §9.4 and is the flow to ship first; this
extension is the upgrade path that removes even that.

## Current state vs zero-config end state

| Piece | Today | Zero-config end state (PAVE team) |
|---|---|---|
| Install | `chrome://extensions` → Developer mode → Load unpacked | Chrome Web Store listing, one click |
| PAVE origin | User sets in options page | Hardcode `DEFAULT_ORIGIN` in `background.js`, delete options page |
| Auth to PAVE | Session cookie or bearer token in options | Session cookie only (user is signed in to WebUI) |
| Relay endpoint | Does not exist — extension falls back to copy-page | `POST /api/mcp/oauth-relay` per `../docs/pave-oauth-relay-endpoint.md` |

## Browser support

| Browser | Manifest | Build | Status |
|---|---|---|---|
| Chrome / Edge / Opera | `manifest.json` (MV3 service worker) | `node tools/build-extensions.mjs` → `dist/chrome` | Implemented; tested path |
| Firefox | `manifest.firefox.json` (MV3 background scripts + gecko id) | same → `dist/firefox` | Implemented; **not yet tested** (no Firefox on the build machine) |
| Safari | `manifest.safari.json` (same as Chrome; `safari-web-extension-converter` on macOS generates the app wrapper) | same → `dist/safari` | **Cannot build/sign on Windows** — requires macOS + Xcode; code is Safari-compatible as-is |

Cross-browser compatibility notes: all APIs used (`webNavigation`,
`storage`, `tabs`, `permissions.request`, `runtime.getURL`) are available in
the `chrome.*` namespace on all three engines. The only per-browser delta is
the background declaration (service worker vs scripts) and the gecko id.

## Files

- `manifest.json` — MV3; host permissions limited to `http://127.0.0.1/*` and
  `http://localhost/*` (the only places the redirect can land); the PAVE
  origin permission is requested at runtime via `chrome.permissions` when the
  user saves options.
- `background.js` — service worker. Listens on `webNavigation.onErrorOccurred`
  **and** `onCompleted` (the tab can die or hit an unrelated local listener),
  filtered to `http://127.0.0.1/*` / `http://localhost/*` navigations whose
  query contains `code=`. Relays `{code, state, callback_url}` to
  `<origin>/api/mcp/oauth-relay`.
- `options.html/.js` — origin + optional bearer token. Deleted in the
  zero-config end state.
- `relay-result.html/.js` — success page, or the fallback copy-page when the
  relay endpoint is absent/unreachable (preserves the manual lane).

## Testing with the mock relay

```bash
node ../tools/mock-relay-server.mjs        # listens on 127.0.0.1:49200
```

Set the extension origin to `http://127.0.0.1:49200` in options, approve any
HeyGen authorize URL, and watch the mock receive the relay POST.

## Security notes for review

- The extension forwards only `code` + `state` + the callback URL — never
  tokens, never cookies.
- Relay auth rides the PAVE WebUI session cookie (`credentials: 'include'`),
  so the endpoint must enforce CSRF (custom header check + SameSite) — see the
  endpoint spec.
- `state` is validated server-side against PAVE's pending OAuth states before
  any exchange; a relayed code with no matching pending state is rejected.
- Host permissions are the MV3 minimum (loopback observe + one user-granted
  origin); no `<all_urls>`.
